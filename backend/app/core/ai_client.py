"""AI 客户端 — Mock 模式。

所有方法返回本地假数据，不发任何网络请求。
对接同事 LiteLLM 实现时，替换各方法体即可，调用方无需改动。
"""
import asyncio
import random
from typing import AsyncIterator, Optional

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: Optional[str] = "qwen-vl-max"
    temperature: float = 0.3
    max_tokens: Optional[int] = 2000


_MOCK_CHAT_RESPONSES = [
    "这是一段模拟的 AI 回复内容，用于本地开发测试。实际对接 LiteLLM 后将返回真实结果。",
    "Mock 响应：AI 已处理您的请求，返回示例文本供前端联调使用。",
    "（Mock）根据您提供的内容，以下是生成的回复：\n\n- 要点一：示例内容\n- 要点二：模拟数据\n- 要点三：本地测试",
]

_MOCK_OUTLINE = """\
# 笔记大纲（Mock）

## 一、核心概念
- 概念 A
- 概念 B

## 二、主要内容
### 2.1 背景
### 2.2 实现方案

## 三、总结
- 结论 A
- 结论 B
"""

_MOCK_LIGHT_CONFIG = {
    "ambient": 0.7,
    "hemisphere": {"skyColor": "#ffffff", "groundColor": "#555555", "intensity": 0.6},
    "directional": [
        {"position": [5, 10, 5], "intensity": 1.2, "color": "#ffffff"},
        {"position": [-5, 5, -5], "intensity": 0.6, "color": "#ffeedd"},
    ],
    "environment": "studio",
}

_MOCK_ANNOTATION = {
    "tags": ["3D模型", "Mock", "示例"],
    "description": "这是一个模拟标注结果，实际接入视觉模型后将返回真实分析。",
    "category": "未知",
    "style": "写实",
}


class AIClient:
    """统一 AI 客户端接口（当前为 Mock 实现）。"""

    async def chat(self, req: ChatRequest) -> str:
        """非流式对话 Mock：随机返回预设文本。"""
        await asyncio.sleep(0.05)  # 模拟轻微延迟，避免前端感觉异常
        return random.choice(_MOCK_CHAT_RESPONSES)

    async def chat_stream(self, req: ChatRequest) -> AsyncIterator[str]:
        """流式对话 Mock：逐词 yield 假 token。"""
        mock_text = "这是流式 Mock 输出。AI 正在逐字生成内容，对接真实模型后将替换为实时 token 流。"
        for char in mock_text:
            await asyncio.sleep(0.02)
            yield char

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Embedding Mock：返回随机 1024 维向量。"""
        await asyncio.sleep(0.02)
        return [[random.uniform(-0.1, 0.1) for _ in range(1024)] for _ in texts]

    async def analyze_image(self, image_url: str, prompt: str) -> str:
        """图像分析 Mock：根据 prompt 关键词返回对应假数据。"""
        await asyncio.sleep(0.05)
        if "光照" in prompt or "light" in prompt.lower():
            import json
            return json.dumps(_MOCK_LIGHT_CONFIG, ensure_ascii=False)
        if "标注" in prompt or "tag" in prompt.lower() or "annotate" in prompt.lower():
            import json
            return json.dumps(_MOCK_ANNOTATION, ensure_ascii=False)
        return random.choice(_MOCK_CHAT_RESPONSES)


ai_client = AIClient()
