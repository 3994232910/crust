"""AI 客户端 — 基于 LiteLLM 实现。

支持任意 LiteLLM 兼容的模型，通过环境变量配置。
自动处理模型路由、流式输出和向量化。

配置方式（API Key 必须在对应职能显式配置）：
    AI_MODEL_TEXT=openai/gpt-4o-mini
    AI_MODEL_TEXT_API_KEY=sk-xxx  # 必须：为该职能单独配置的 API Key
    AI_MODEL_TEXT_API_BASE=https://api.openai.com/v1  # 可选，自定义 API 基础 URL

    AI_MODEL_VISION=openai/gpt-4o
    AI_MODEL_VISION_API_KEY=sk-xxx  # 必须：为该职能单独配置的 API Key

    AI_MODEL_EMBEDDING=openai/text-embedding-3-small
    AI_MODEL_EMBEDDING_API_KEY=sk-xxx  # 必须：为该职能单独配置的 API Key

功能开关（.env 配置或运行时禁用）：
    AI_ENABLE_CHAT=true|false      # 控制对话、总结、大纲、补全功能
    AI_ENABLE_VISION=true|false    # 控制图像分析、3D 标注功能
    AI_ENABLE_EMBEDDING=true|false # 控制向量化、相似度推荐功能

注意：
    当功能被显式禁用（AI_ENABLE_XXX=false）或 API Key 未配置时，
    调用对应方法将抛出 AIFeatureDisabledError。
"""
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


class AIFeatureDisabledError(Exception):
    """AI 功能被禁用时的异常。

    可能原因：
    1. 管理员显式禁用了该功能（AI_ENABLE_XXX=false）
    2. 未配置该职能的 API Key（AI_MODEL_XXX_API_KEY）

    Attributes:
        feature: 被禁用的功能名称
        message: 错误消息
    """

    def __init__(self, feature: str, message: str | None = None):
        self.feature = feature
        self.message = message or f"AI {feature} 功能当前未开放"
        super().__init__(self.message)

    def to_dict(self) -> dict:
        return {
            "error": "feature_disabled",
            "feature": self.feature,
            "message": self.message,
        }


class AIClient:
    """基于 LiteLLM 的统一 AI 客户端。

    支持职能分离的模型配置：
    - 文本模型：对话、总结、大纲生成
    - 视觉模型：图像分析、3D 标注
    - Embedding 模型：文本向量化

    功能禁用规则：
    1. 若 AI_ENABLE_XXX=false，抛出 AIFeatureDisabledError
    2. 若对应职能未配置 API Key，抛出 AIFeatureDisabledError
    """

    def __init__(self):
        self._text_config = settings.get_text_model_config()
        self._vision_config = settings.get_vision_model_config()
        self._embedding_config = settings.get_embedding_model_config()

    def _check_feature_enabled(self, feature: str) -> None:
        """检查功能是否已启用，否则抛出 AIFeatureDisabledError。"""
        feature_map = {
            "chat": settings.AI_ENABLE_CHAT,
            "vision": settings.AI_ENABLE_VISION,
            "embedding": settings.AI_ENABLE_EMBEDDING,
        }
        if not feature_map.get(feature, True):
            raise AIFeatureDisabledError(
                feature,
                f"AI {feature} 功能已被管理员禁用"
            )

    def _check_api_key_configured(self, config: AIModelConfig, feature: str) -> None:
        """检查 API Key 是否已配置，否则抛出 AIFeatureDisabledError。"""
        if not config.get_api_key():
            raise AIFeatureDisabledError(
                feature,
                f"AI {feature} 功能未配置 API Key，请联系管理员配置 AI_MODEL_{feature.upper()}_API_KEY"
            )

    def _resolve_model(
        self,
        req: ChatRequest,
        default_config: AIModelConfig,
    ) -> tuple[str, str, str | None]:
        """解析模型名称、API Key 和 API Base。

        Args:
            req: 对话请求
            default_config: 默认模型配置

        Returns:
            (模型名称, API Key, API Base)
        """
        # 优先使用请求中指定的模型
        model = req.model or default_config.model
        # API Key 和 API Base 使用配置的 key
        api_key = default_config.get_api_key()
        api_base = default_config.api_base
        # API Key 必须存在（由调用方保证）
        assert api_key is not None, "API Key must be checked before calling _resolve_model"
        return model, api_key, api_base

    async def chat(self, req: ChatRequest) -> str:
        """非流式对话（使用文本模型）。

        Args:
            req: 对话请求，包含消息列表、模型、温度等参数

        Returns:
            AI 生成的回复文本

        Raises:
            AIFeatureDisabledError: 如果功能被禁用或 API Key 未配置
        """
        self._check_feature_enabled("chat")
        self._check_api_key_configured(self._text_config, "chat")

        model, api_key, api_base = self._resolve_model(req, self._text_config)
        temperature = req.temperature if req.temperature is not None else settings.AI_DEFAULT_TEMPERATURE
        max_tokens = req.max_tokens if req.max_tokens is not None else settings.AI_DEFAULT_MAX_TOKENS

        kwargs = {
            "model": model,
            "messages": [m.model_dump() for m in req.messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "api_key": api_key,
        }
        if api_base:
            kwargs["api_base"] = api_base

        response = await acompletion(**kwargs)

        return response.choices[0].message.content or ""

    async def chat_stream(self, req: ChatRequest) -> AsyncIterator[str]:
        """流式对话，逐 token 返回（使用文本模型）。

        Args:
            req: 对话请求

        Yields:
            每个 token 字符串

        Raises:
            AIFeatureDisabledError: 如果功能被禁用或 API Key 未配置
        """
        self._check_feature_enabled("chat")
        self._check_api_key_configured(self._text_config, "chat")

        model, api_key, api_base = self._resolve_model(req, self._text_config)
        temperature = req.temperature if req.temperature is not None else settings.AI_DEFAULT_TEMPERATURE
        max_tokens = req.max_tokens if req.max_tokens is not None else settings.AI_DEFAULT_MAX_TOKENS

        kwargs = {
            "model": model,
            "messages": [m.model_dump() for m in req.messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "api_key": api_key,
            "stream": True,
        }
        if api_base:
            kwargs["api_base"] = api_base

        response = await acompletion(**kwargs)

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

        Raises:
            AIFeatureDisabledError: 如果功能被禁用或 API Key 未配置
        """
        self._check_feature_enabled("embedding")
        self._check_api_key_configured(self._embedding_config, "embedding")

        resolved_model = model or self._embedding_config.model
        api_key = self._embedding_config.get_api_key()
        api_base = self._embedding_config.api_base

        kwargs = {
            "model": resolved_model,
            "input": texts,
            "api_key": api_key,
            "encoding_format": "float",  # 显式指定，避免 LiteLLM 传非法值
        }
        if api_base:
            kwargs["api_base"] = api_base

        response = await aembedding(**kwargs)

        return [item["embedding"] for item in response.data]

    async def analyze_image(self, image_url: str, prompt: str) -> str:
        """图像分析（使用视觉模型）。

        Args:
            image_url: 图片 URL 或 base64 data URL
            prompt: 分析提示词

        Returns:
            AI 分析结果

        Raises:
            AIFeatureDisabledError: 如果功能被禁用或 API Key 未配置
        """
        self._check_feature_enabled("vision")
        self._check_api_key_configured(self._vision_config, "vision")

        model = self._vision_config.model
        api_key = self._vision_config.get_api_key()
        api_base = self._vision_config.api_base

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ]

        kwargs = {
            "model": model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 2000,
            "api_key": api_key,
        }
        if api_base:
            kwargs["api_base"] = api_base

        response = await acompletion(**kwargs)

        return response.choices[0].message.content or ""


# 全局客户端实例
ai_client = AIClient()
