"""知识梳理 LangGraph 工作流（多节点 → 总结）."""
from typing import TypedDict

from langgraph.graph import StateGraph, END

from app.core.ai_client import ChatMessage, ChatRequest, ai_client


class SummarizeState(TypedDict):
    forge_contents: list[dict]   # [{"title": str, "content": str}, ...]
    focus: str                   # 用户指定的梳理方向，可为空
    summary: str


async def summarize_node(state: SummarizeState) -> dict:
    items = state.get("forge_contents", [])
    focus = state.get("focus", "")

    nodes_text = "\n\n---\n\n".join(
        f"### {item.get('title', '无标题')}\n{(item.get('content') or '')[:1500]}"
        for item in items
    )

    focus_hint = f"\n\n请重点关注：{focus}" if focus else ""

    prompt = (
        "请对以下多篇笔记进行知识梳理，提炼核心观点、关联关系和可行结论，"
        "输出结构化的 Markdown 总结报告。"
        f"{focus_hint}\n\n"
        f"===== 笔记内容 =====\n\n{nodes_text}"
    )

    summary = await ai_client.chat(
        ChatRequest(
            messages=[
                ChatMessage(
                    role="system",
                    content="你是专业的知识梳理助手，擅长跨文档提炼核心内容和关联关系。输出结构化 Markdown 报告。",
                ),
                ChatMessage(role="user", content=prompt),
            ],
            max_tokens=3000,
        )
    )
    return {"summary": summary}


def _build_graph() -> object:
    graph: StateGraph = StateGraph(SummarizeState)
    graph.add_node("summarize", summarize_node)
    graph.set_entry_point("summarize")
    graph.add_edge("summarize", END)
    return graph.compile()


summarize_graph = _build_graph()
