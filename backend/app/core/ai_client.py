"""AI 客户端 — 基于 LiteLLM 实现。

支持 OpenAI 和 DeepSeek 系列模型，通过环境变量配置。
自动处理模型路由、流式输出和向量化。
当未配置 API Key 时，自动回退到 Mock 模式。
"""
import os
import asyncio
import random
from typing import AsyncIterator

from litellm import acompletion, aembedding
from pydantic import BaseModel

from app.core.config import settings


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: str | None = None
    temperature: float = 0.3
    max_tokens: int | None = 2000


# 模型映射配置
MODEL_MAPPINGS = {
    "openai": {
        "chat": "openai/{model}",
        "embedding": "openai/{model}",
    },
    "deepseek": {
        "chat": "deepseek/{model}",
        "embedding": "deepseek/{model}",
    },
}

# 默认模型配置
DEFAULT_MODELS = {
    "openai": {
        "chat": "gpt-4o-mini",
        "embedding": "text-embedding-3-small",
    },
    "deepseek": {
        "chat": "deepseek-chat",
        "embedding": "deepseek-embedding",
    },
}

# Mock 响应（当未配置 API Key 时使用）
_MOCK_CHAT_RESPONSES = [
    "这是一段模拟的 AI 回复内容。请在 .env 文件中配置 OPENAI_API_KEY 或 DEEPSEEK_API_KEY 以使用真实 AI 功能。",
    "Mock 响应：AI 功能尚未配置。请设置环境变量：OPENAI_API_KEY=sk-xxx 或 DEEPSEEK_API_KEY=sk-xxx",
    "（Mock 模式）根据您提供的内容，以下是生成的回复示例：\n\n- 要点一：示例内容\n- 要点二：Mock 数据\n- 要点三：请先配置 API Key",
]


# Embedding 维度配置
EMBEDDING_DIM = 1536  # OpenAI text-embedding-3-small 默认维度


def _get_api_key(provider: str) -> str | None:
    """获取指定提供商的 API Key。"""
    if provider == "openai":
        return settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
    elif provider == "deepseek":
        return settings.DEEPSEEK_API_KEY or os.getenv("DEEPSEEK_API_KEY")
    return None


def _has_api_key() -> bool:
    """检查是否配置了任意一个 API Key。"""
    return bool(settings.OPENAI_API_KEY or settings.DEEPSEEK_API_KEY or
                os.getenv("OPENAI_API_KEY") or os.getenv("DEEPSEEK_API_KEY"))


def _resolve_model(model: str | None, task: str = "chat") -> str:
    """解析并返回完整的模型标识符。

    Args:
        model: 用户指定的模型名称，如 "gpt-4o", "deepseek-chat"
        task: 任务类型，"chat" 或 "embedding"

    Returns:
        LiteLLM 格式的完整模型标识符，如 "openai/gpt-4o"
    """
    provider = settings.AI_PROVIDER

    # 如果未指定模型，使用默认配置
    if not model:
        model = DEFAULT_MODELS[provider][task]

    # 如果模型已经包含提供商前缀，直接返回
    if "/" in model:
        return model

    # 根据模型名称自动判断提供商
    if model.startswith("gpt-") or model.startswith("text-embedding-"):
        provider = "openai"
    elif model.startswith("deepseek-"):
        provider = "deepseek"

    # 构建完整的模型标识符
    mapping = MODEL_MAPPINGS[provider][task]
    return mapping.format(model=model)


class AIClient:
    """基于 LiteLLM 的统一 AI 客户端。

    当未配置 API Key 时，自动回退到 Mock 模式。
    """

    async def chat(self, req: ChatRequest) -> str:
        """非流式对话。

        Args:
            req: 对话请求，包含消息列表、模型、温度等参数

        Returns:
            AI 生成的回复文本
        """
        if not _has_api_key():
            await asyncio.sleep(0.05)
            return random.choice(_MOCK_CHAT_RESPONSES)

        model = _resolve_model(req.model, task="chat")

        response = await acompletion(
            model=model,
            messages=[m.model_dump() for m in req.messages],
            temperature=req.temperature,
            max_tokens=req.max_tokens,
            api_key=_get_api_key(settings.AI_PROVIDER),
        )

        return response.choices[0].message.content or ""

    async def chat_stream(self, req: ChatRequest) -> AsyncIterator[str]:
        """流式对话，逐 token 返回。

        Args:
            req: 对话请求

        Yields:
            每个 token 字符串
        """
        if not _has_api_key():
            mock_text = "这是流式 Mock 输出。请在 .env 文件中配置 API Key 以使用真实 AI 功能。"
            for char in mock_text:
                await asyncio.sleep(0.02)
                yield char
            return

        model = _resolve_model(req.model, task="chat")

        response = await acompletion(
            model=model,
            messages=[m.model_dump() for m in req.messages],
            temperature=req.temperature,
            max_tokens=req.max_tokens,
            api_key=_get_api_key(settings.AI_PROVIDER),
            stream=True,
        )

        async for chunk in response:
            content = chunk.choices[0].delta.content
            if content:
                yield content

    async def embed(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        """文本向量化。

        Args:
            texts: 需要向量化的文本列表
            model: 指定的 embedding 模型

        Returns:
            向量列表，每个向量对应一个输入文本
        """
        if not _has_api_key():
            await asyncio.sleep(0.02)
            # 返回 Mock 向量（使用固定随机种子保证一致性）
            return [[0.01 * ((i + j) % 100 - 50) for j in range(EMBEDDING_DIM)] for i in range(len(texts))]

        resolved_model = _resolve_model(model or settings.AI_EMBEDDING_MODEL, task="embedding")

        response = await aembedding(
            model=resolved_model,
            input=texts,
            api_key=_get_api_key(settings.AI_PROVIDER),
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

        if not _has_api_key():
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

        # 图像分析默认使用支持视觉的模型
        vision_model = "gpt-4o" if settings.AI_PROVIDER == "openai" else "deepseek-chat"
        model = _resolve_model(vision_model, task="chat")

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
            api_key=_get_api_key(settings.AI_PROVIDER),
        )

        return response.choices[0].message.content or ""


# 全局客户端实例
ai_client = AIClient()
