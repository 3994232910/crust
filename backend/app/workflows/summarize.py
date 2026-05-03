"""知识梳理 LangGraph 工作流（多节点 → 总结 + 创建文件）."""
from typing import TypedDict
import uuid

from langgraph.graph import StateGraph, END

from app.core.ai_client import ChatMessage, ChatRequest, ai_client
from app.models.forge import ForgeCreate
from sqlmodel import Session


class SummarizeState(TypedDict):
    forge_contents: list[dict]   # [{"title": str, "content": str}, ...]
    focus: str                   # 用户指定的梳理方向，可为空
    summary: str
    new_forge_id: str | None
    session: Session | None
    owner_id: uuid.UUID | None


async def summarize_node(state: SummarizeState) -> dict:
    items = state.get("forge_contents", [])
    focus = state.get("focus", "")
    session = state.get("session")
    owner_id = state.get("owner_id")

    nodes_text = "\n\n---\n\n".join(
        f"### {item.get('title', '无标题')}\n{(item.get('content') or '')[:1500]}"
        for item in items
    )

    focus_hint = f"\n\n请重点关注：{focus}" if focus else ""

    wiki_links = "\n".join(
        f"- [[{item.get('title', '无标题')}]]"
        for item in items
    )

    prompt = (
        "请对以下多篇笔记进行知识梳理，提炼核心观点、关联关系和可行结论，"
        "输出结构化的 Markdown 总结报告。\n"
        "要求在报告末尾添加'## 相关笔记'章节，列出所有参考笔记的双向链接。\n"
        f"{focus_hint}\n\n"
        f"===== 笔记内容 =====\n\n{nodes_text}\n\n"
        f"===== 需要添加的相关笔记链接 =====\n{wiki_links}"
    )

    summary = await ai_client.chat(
        ChatRequest(
            messages=[
                ChatMessage(
                    role="system",
                    content="你是专业的知识梳理助手，擅长跨文档提炼核心内容和关联关系。输出结构化 Markdown 报告，并在末尾添加相关笔记的双向链接。",
                ),
                ChatMessage(role="user", content=prompt),
            ],
            max_tokens=3000,
        )
    )

    new_forge_id = None
    if session and owner_id:
        from datetime import datetime

        titles_list = ", ".join(item.get('title', '无标题') for item in items[:3])
        if len(items) > 3:
            titles_list += f" 等{len(items)}篇笔记"

        summary_title = f"知识梳理 - {titles_list}"

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        full_content = f"# {summary_title}\n\n> 自动生成于 {timestamp}\n\n{summary}"

        forge_in = ForgeCreate(
            title=summary_title,
            content=full_content,
            is_folder=False,
        )

        from app.crud import create_forge
        new_forge = create_forge(session=session, forge_in=forge_in, owner_id=owner_id)
        new_forge_id = str(new_forge.id)

    return {"summary": summary, "new_forge_id": new_forge_id}


def _build_graph() -> object:
    graph: StateGraph = StateGraph(SummarizeState)
    graph.add_node("summarize", summarize_node)
    graph.set_entry_point("summarize")
    graph.add_edge("summarize", END)
    return graph.compile()


summarize_graph = _build_graph()
