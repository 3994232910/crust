"""大纲生成 LangGraph 工作流."""
from typing import TypedDict

from langgraph.graph import StateGraph, END

from app.core.ai_client import ChatMessage, ChatRequest, ai_client


class OutlineState(TypedDict):
    title: str
    content: str
    outline: str


async def generate_outline_node(state: OutlineState) -> dict:
    title = state.get("title", "")
    content = state.get("content", "") or ""

    prompt = (
        f"请为以下笔记生成结构化大纲（Markdown 格式，使用 #/##/### 层级，只返回大纲本身）：\n\n"
        f"标题：{title}\n\n"
        f"正文：\n{content[:4000]}"
    )

    outline = await ai_client.chat(
        ChatRequest(
            messages=[
                ChatMessage(
                    role="system",
                    content="你是专业的知识整理助手，擅长为文章生成清晰的结构化大纲。只输出大纲，不加解释。",
                ),
                ChatMessage(role="user", content=prompt),
            ],
            max_tokens=1500,
        )
    )
    return {"outline": outline}


def _build_graph() -> object:
    graph: StateGraph = StateGraph(OutlineState)
    graph.add_node("generate", generate_outline_node)
    graph.set_entry_point("generate")
    graph.add_edge("generate", END)
    return graph.compile()


outline_graph = _build_graph()
