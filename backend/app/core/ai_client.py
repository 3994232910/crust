"""AI 客户端 — 基于 LiteLLM 实现。

支持任意 LiteLLM 兼容的模型，通过环境变量配置。
自动处理模型路由、流式输出和向量化。
当未配置 API Key 时，自动回退到 Mock 模式。

配置方式：
    AI_MODEL_TEXT=openai/gpt-4o-mini
    AI_MODEL_VISION=openai/gpt-4o
    AI_MODEL_EMBEDDING=openai/text-embedding-3-small
    AI_MODEL_TEXT_API_KEY=sk-xxx  # 可选，默认从 PROVIDER_API_KEY 读取
"""
import asyncio
import random
from typing import AsyncIterator

from litellm import acompletion, aembedding
from pydantic import BaseModel

from app.core.config import settings, AIModelConfig


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: str | None = None  # 可选，覆盖默认模型
    temperature: float | None = None
    max_tokens: int | None = None


# Mock 响应（当未配置 API Key 时使用）
_MOCK_CHAT_RESPONSES = [
    "这是一段模拟的 AI 回复内容。请在 .env 文件中配置 AI_MODEL_TEXT_API_KEY 或相应的 PROVIDER_API_KEY 以使用真实 AI 功能。",
    "Mock 响应：AI 功能尚未配置。请设置环境变量，如 OPENAI_API_KEY=sk-xxx 或 DEEPSEEK_API_KEY=sk-xxx",
    "（Mock 模式）根据您提供的内容，以下是生成的回复示例：\n\n- 要点一：示例内容\n- 要点二：Mock 数据\n- 要点三：请先配置 API Key",
]


class AIClient:
    """基于 LiteLLM 的统一 AI 客户端。

    支持职能分离的模型配置：
    - 文本模型：对话、总结、大纲生成
    - 视觉模型：图像分析、3D 标注
    - Embedding 模型：文本向量化

    当未配置 API Key 时，自动回退到 Mock 模式。
    """

    def __init__(self):
        self._text_config = settings.get_text_model_config()
        self._vision_config = settings.get_vision_model_config()
        self._embedding_config = settings.get_embedding_model_config()

    def _has_api_key(self, config: AIModelConfig) -> bool:
        """检查指定配置是否有可用的 API Key。"""
        return bool(config.get_api_key())

    def _resolve_model(
        self,
        req: ChatRequest,
        default_config: AIModelConfig,
    ) -> tuple[str, str | None]:
        """解析模型名称和 API Key。

        Args:
            req: 对话请求
            default_config: 默认模型配置

        Returns:
            (模型名称, API Key)
        """
        # 优先使用请求中指定的模型
        model = req.model or default_config.model
        # API Key 使用配置的 key
        api_key = default_config.get_api_key()
        return model, api_key

    async def chat(self, req: ChatRequest) -> str:
        """非流式对话（使用文本模型）。

        Args:
            req: 对话请求，包含消息列表、模型、温度等参数

        Returns:
            AI 生成的回复文本
        """
        if not self._has_api_key(self._text_config):
            await asyncio.sleep(0.05)
            return random.choice(_MOCK_CHAT_RESPONSES)

        model, api_key = self._resolve_model(req, self._text_config)
        temperature = req.temperature if req.temperature is not None else settings.AI_DEFAULT_TEMPERATURE
        max_tokens = req.max_tokens if req.max_tokens is not None else settings.AI_DEFAULT_MAX_TOKENS

        response = await acompletion(
            model=model,
            messages=[m.model_dump() for m in req.messages],
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=api_key,
        )

        return response.choices[0].message.content or ""

    async def chat_stream(self, req: ChatRequest) -> AsyncIterator[str]:
        """流式对话，逐 token 返回（使用文本模型）。

        Args:
            req: 对话请求

        Yields:
            每个 token 字符串
        """
        if not self._has_api_key(self._text_config):
            mock_text = "这是流式 Mock 输出。请在 .env 文件中配置 API Key 以使用真实 AI 功能。"
            for char in mock_text:
                await asyncio.sleep(0.02)
                yield char
            return

        model, api_key = self._resolve_model(req, self._text_config)
        temperature = req.temperature if req.temperature is not None else settings.AI_DEFAULT_TEMPERATURE
        max_tokens = req.max_tokens if req.max_tokens is not None else settings.AI_DEFAULT_MAX_TOKENS

        response = await acompletion(
            model=model,
            messages=[m.model_dump() for m in req.messages],
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=api_key,
            stream=True,
        )

        async for chunk in response:
            content = chunk.choices[0].delta.content
            if content:
                yield content

    async def embed(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        """文本向量化（使用 Embedding 模型）。

        Args:
            texts: 需要向量化的文本列表
            model: 指定的 embedding 模型，可选

        Returns:
            向量列表，每个向量对应一个输入文本
        """
        if not self._has_api_key(self._embedding_config):
            await asyncio.sleep(0.02)
            dim = settings.AI_EMBEDDING_DIM
            # 返回 Mock 向量（基于文本内容生成伪随机但稳定的向量）
            import hashlib
            vectors = []
            for text in texts:
                hash_obj = hashlib.md5(text.encode())
                seed = int(hash_obj.hexdigest(), 16)
                random.seed(seed)
                vector = [random.uniform(-0.5, 0.5) for _ in range(dim)]
                vectors.append(vector)
            random.seed()  # 重置随机种子
            return vectors

        resolved_model = model or self._embedding_config.model
        api_key = self._embedding_config.get_api_key()

        response = await aembedding(
            model=resolved_model,
            input=texts,
            api_key=api_key,
        )

        return [item["embedding"] for item in response.data]

    async def analyze_image(self, image_url: str, prompt: str) -> str:
        """图像分析（使用视觉模型）。

        Args:
            image_url: 图片 URL 或 base64 data URL
            prompt: 分析提示词

        Returns:
            AI 分析结果
        """
        import json

        if not self._has_api_key(self._vision_config):
            await asyncio.sleep(0.05)
            if "光照" in prompt or "light" in prompt.lower():
                return json.dumps({
                    "ambient": 0.7,
                    "hemisphere": {"skyColor": "#ffffff", "groundColor": "#555555", "intensity": 0.6},
                    "directional": [
                        {"position": [5, 10, 5], "intensity": 1.2, "color": "#ffffff"},
                        {"position": [-5, 5, -5], "intensity": 0.6, "color": "#ffeedd"},
                    ],
                    "environment": "studio",
                }, ensure_ascii=False)
            if "标注" in prompt or "tag" in prompt.lower() or "annotate" in prompt.lower():
                return json.dumps({
                    "tags": ["3D模型", "Mock", "示例"],
                    "description": "这是一个模拟标注结果，请配置 API Key 以使用真实视觉模型分析。",
                    "category": "未知",
                    "style": "写实",
                }, ensure_ascii=False)
            return random.choice(_MOCK_CHAT_RESPONSES)

        model = self._vision_config.model
        api_key = self._vision_config.get_api_key()

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ]

        response = await acompletion(
            model=model,
            messages=messages,
            temperature=0.3,
            max_tokens=2000,
            api_key=api_key,
        )

        return response.choices[0].message.content or ""


# 全局客户端实例
ai_client = AIClient()
