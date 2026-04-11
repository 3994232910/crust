import secrets
import warnings
from typing import Annotated, Any, Literal

from pydantic import (
    AnyUrl,
    BeforeValidator,
    EmailStr,
    HttpUrl,
    PostgresDsn,
    computed_field,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Self
from pathlib import Path


def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",") if i.strip()]
    elif isinstance(v, list | str):
        return v
    raise ValueError(v)


class AIModelConfig:
    """单个模型配置。

    支持任意 LiteLLM 兼容的模型，格式为 "provider/model-name"。
    示例：openai/gpt-4o, deepseek/deepseek-chat, anthropic/claude-3-sonnet

    API Key 必须在对应职能配置中显式指定，不再统一配置厂商 key。
    """

    def __init__(
        self,
        model: str,
        api_key: str | None = None,
        api_base: str | None = None,
    ):
        self.model = model
        self._api_key = api_key
        self.api_base = api_base

    def get_api_key(self) -> str | None:
        """获取 API Key，仅返回显式配置的 key。"""
        return self._api_key


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Use top level .env file (one level above ./backend/)
        env_file="../.env",
        env_ignore_empty=True,
        extra="ignore",
    )

    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    # 60 minutes * 24 hours * 8 days = 8 days
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    FRONTEND_HOST: str = "http://localhost:5173"
    ENVIRONMENT: Literal["local", "staging", "production"] = "local"

    BACKEND_CORS_ORIGINS: Annotated[
        list[AnyUrl] | str, BeforeValidator(parse_cors)
    ] = []

    @computed_field  # type: ignore[prop-decorator]
    @property
    def all_cors_origins(self) -> list[str]:
        return [str(origin).rstrip("/") for origin in self.BACKEND_CORS_ORIGINS] + [
            self.FRONTEND_HOST
        ]

    PROJECT_NAME: str
    SENTRY_DSN: HttpUrl | None = None
    POSTGRES_SERVER: str
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = ""

    @computed_field  # type: ignore[prop-decorator]
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> PostgresDsn:
        return PostgresDsn.build(
            scheme="postgresql+psycopg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
        )

    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    SMTP_PORT: int = 587
    SMTP_HOST: str | None = None
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    EMAILS_FROM_EMAIL: EmailStr | None = None
    EMAILS_FROM_NAME: str | None = None

    @model_validator(mode="after")
    def _set_default_emails_from(self) -> Self:
        if not self.EMAILS_FROM_NAME:
            self.EMAILS_FROM_NAME = self.PROJECT_NAME
        return self

    EMAIL_RESET_TOKEN_EXPIRE_HOURS: int = 48

    @computed_field  # type: ignore[prop-decorator]
    @property
    def emails_enabled(self) -> bool:
        return bool(self.SMTP_HOST and self.EMAILS_FROM_EMAIL)

    EMAIL_TEST_USER: EmailStr = "test@example.com"
    FIRST_SUPERUSER: EmailStr
    FIRST_SUPERUSER_PASSWORD: str

    # AI APIs (Legacy - kept for compatibility)
    HUNYUAN3D_API_KEY: str = ""
    DASHSCOPE_API_KEY: str = ""

    # ====================
    # AI Model Configuration
    # ====================
    # 所有模型配置使用 LiteLLM 格式：provider/model-name
    # 支持的 provider: openai, deepseek, anthropic, azure, bedrock, etc.

    # 通用/纯文本模型：用于对话、总结、大纲生成等文本任务
    # 示例：openai/gpt-4o-mini, deepseek/deepseek-chat, anthropic/claude-3-haiku
    AI_MODEL_TEXT: str = "openai/gpt-4o-mini"
    AI_MODEL_TEXT_API_KEY: str | None = None
    AI_MODEL_TEXT_API_BASE: str | None = None  # 自定义 API 基础 URL

    # 视觉/多模态模型：用于图像分析、3D 标注等需要视觉理解的任务
    # 示例：openai/gpt-4o, anthropic/claude-3-opus, google/gemini-pro-vision
    AI_MODEL_VISION: str = "openai/gpt-4o"
    AI_MODEL_VISION_API_KEY: str | None = None
    AI_MODEL_VISION_API_BASE: str | None = None  # 自定义 API 基础 URL

    # Embedding 模型：用于文本向量化
    # 示例：openai/text-embedding-3-small, openai/text-embedding-3-large
    AI_MODEL_EMBEDDING: str = "openai/text-embedding-3-small"
    AI_MODEL_EMBEDDING_API_KEY: str | None = None
    AI_MODEL_EMBEDDING_API_BASE: str | None = None  # 自定义 API 基础 URL
    AI_EMBEDDING_DIM: int = 1536  # 根据模型调整：text-embedding-3-small=1536, text-embedding-3-large=3072

    # 默认生成参数
    AI_DEFAULT_TEMPERATURE: float = 0.3
    AI_DEFAULT_MAX_TOKENS: int = 2000

    # ====================
    # AI Feature Toggles
    # ====================
    # 功能开关：设置为 false 可关闭对应功能
    AI_ENABLE_CHAT: bool = True  # 对话、总结、大纲、补全
    AI_ENABLE_VISION: bool = True  # 图像分析、3D 标注
    AI_ENABLE_EMBEDDING: bool = True  # 文本向量化、相似度推荐

    def get_text_model_config(self) -> AIModelConfig:
        """获取文本模型配置。"""
        return AIModelConfig(
            model=self.AI_MODEL_TEXT,
            api_key=self.AI_MODEL_TEXT_API_KEY,
            api_base=self.AI_MODEL_TEXT_API_BASE,
        )

    def get_vision_model_config(self) -> AIModelConfig:
        """获取视觉模型配置。"""
        return AIModelConfig(
            model=self.AI_MODEL_VISION,
            api_key=self.AI_MODEL_VISION_API_KEY,
            api_base=self.AI_MODEL_VISION_API_BASE,
        )

    def get_embedding_model_config(self) -> AIModelConfig:
        """获取 Embedding 模型配置。"""
        return AIModelConfig(
            model=self.AI_MODEL_EMBEDDING,
            api_key=self.AI_MODEL_EMBEDDING_API_KEY,
            api_base=self.AI_MODEL_EMBEDDING_API_BASE,
        )

    def _check_default_secret(self, var_name: str, value: str | None) -> None:
        if value == "changethis":
            message = (
                f'The value of {var_name} is "changethis", '
                "for security, please change it, at least for deployments."
            )
            if self.ENVIRONMENT == "local":
                warnings.warn(message, stacklevel=1)
            else:
                raise ValueError(message)

    @model_validator(mode="after")
    def _enforce_non_default_secrets(self) -> Self:
        self._check_default_secret("SECRET_KEY", self.SECRET_KEY)
        self._check_default_secret("POSTGRES_PASSWORD", self.POSTGRES_PASSWORD)
        self._check_default_secret(
            "FIRST_SUPERUSER_PASSWORD", self.FIRST_SUPERUSER_PASSWORD
        )

        return self


settings = Settings()  # type: ignore
