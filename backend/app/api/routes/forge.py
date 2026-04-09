import uuid
import json
import base64
from typing import Any
from pathlib import Path
import shutil
import asyncio

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, SQLModel

from app.api.deps import CurrentUser, SessionDep
from app.models.forge import Forge, ForgeCreate, ForgePublic, ForgesPublic, ForgeUpdate
from app.models import Message
from app.core.ai_client import ChatMessage, ChatRequest, ai_client
from app.workflows.outline import outline_graph
from app.workflows.summarize import summarize_graph


def _build_embed_text(forge: Forge) -> str:
    """拼接用于向量化的文本：标题 + 正文。"""
    parts = []
    if forge.title:
        parts.append(forge.title)
    if forge.content:
        parts.append(forge.content)
    return "\n".join(parts)


async def _refresh_embedding(forge: Forge, session: SessionDep) -> None:
    """生成并写入 embedding，失败时静默跳过，不影响主流程。"""
    text = _build_embed_text(forge)
    if not text.strip():
        return
    try:
        vectors = await ai_client.embed([text])
        forge.embedding = vectors[0]
        session.add(forge)
        session.commit()
    except Exception:
        pass  # embedding 失败不阻断 CRUD

router = APIRouter(prefix="/forge", tags=["forge"])


class ModelInfo(SQLModel):
    url: str
    filename: str
    size: int


class LightConfig(SQLModel):
    ambient: float = 0.5
    hemisphere: dict = {"skyColor": "#ffffff", "groundColor": "#444444", "intensity": 0.4}
    directional: list = [{"position": [5, 10, 5], "intensity": 1.0, "color": "#ffffff"}]
    environment: str = "studio"

class LightAdjustRequest(SQLModel):
    feedback: str
    currentConfig: dict | None = None
    modelInfo: dict | None = None

class LightOptimizeRequest(SQLModel):
    modelPath: str

class LightAutoOptimizeRequest(SQLModel):
    screenshot: str
    currentConfig: dict | None = None
    iteration: int = 1

class LightAdjustWithScreenshotRequest(SQLModel):
    feedback: str
    currentConfig: dict | None = None
    screenshot: str | None = None


class SummarizeRequest(SQLModel):
    forge_ids: list[uuid.UUID]
    focus: str | None = None

class CompleteRequest(SQLModel):
    text: str
    instruction: str | None = None

class AnnotateRequest(SQLModel):
    screenshot: str  # base64 data URL 或 http URL


class ImageTo3DRequest(SQLModel):
    image_base64: str | None = None
    image_url: str | None = None
    texture: bool = True
    octree_resolution: int = 256
    num_inference_steps: int = 5
    guidance_scale: float = 5.0


@router.post("/image-to-3d", response_model=dict)
async def image_to_3d(
    *,
    current_user: CurrentUser,
    request: ImageTo3DRequest,
) -> Any:
    """图片转 3D 模型（Mock：直接返回假数据，不调用 Hunyuan3D API）。"""
    if not request.image_base64 and not request.image_url:
        raise HTTPException(status_code=400, detail="Either image_base64 or image_url is required")

    mock_filename = f"{uuid.uuid4()}_mock_model.glb"
    mock_url = f"/models/{current_user.id}/{mock_filename}"
    return {
        "model_url": mock_url,
        "filename": mock_filename,
        "message": "Mock: 3D model generated successfully (no real API call)",
    }


# 1. 基础路由
@router.get("/", response_model=ForgesPublic)
def read_forges(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve forges.
    """
    statement = select(Forge).where(Forge.owner_id == current_user.id)
    results = session.exec(statement.offset(skip).limit(limit))
    forges = results.all()
    return ForgesPublic(data=forges, count=len(forges))


@router.post("/", response_model=ForgePublic)
async def create_forge(
    *,
    session: SessionDep,
    forge_in: ForgeCreate,
    current_user: CurrentUser,
) -> Any:
    """
    Create new forge.
    """
    if forge_in.is_folder and not forge_in.title:
        forge_in.title = "nebula"
    if not forge_in.is_folder and not forge_in.title:
        forge_in.title = "nova"

    forge = Forge(
        title=forge_in.title,
        content=forge_in.content,
        is_folder=forge_in.is_folder,
        parent_id=forge_in.parent_id,
        owner_id=current_user.id,
    )

    session.add(forge)
    session.commit()
    session.refresh(forge)

    if not forge_in.is_folder:
        await _refresh_embedding(forge, session)
        session.refresh(forge)

    return forge

# 2. AI 工作流路由（静态路径，必须在 /{id} 之前）

@router.post("/summarize", response_model=dict)
async def summarize_forges(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    request: SummarizeRequest,
) -> Any:
    """对多篇笔记进行知识梳理，返回结构化总结报告（LangGraph 工作流）。"""
    forges = session.exec(
        select(Forge).where(
            Forge.id.in_(request.forge_ids),  # type: ignore[attr-defined]
            Forge.owner_id == current_user.id,
        )
    ).all()

    if not forges:
        raise HTTPException(status_code=404, detail="未找到指定笔记")

    forge_contents = [
        {"title": f.title or "", "content": f.content or ""}
        for f in forges
    ]

    result = await summarize_graph.ainvoke({
        "forge_contents": forge_contents,
        "focus": request.focus or "",
        "summary": "",
    })

    return {"summary": result["summary"], "count": len(forges)}


# 3. 模型路由（必须放在 /{id} 之前！）
@router.post("/upload-model", response_model=dict)
async def upload_model(
    *,
    current_user: CurrentUser,
    files: list[UploadFile] = File(...),
) -> Any:
    """Upload 3D model files (supports folder upload with .gltf + .bin + textures)."""

    models_dir = Path("models") / str(current_user.id)
    models_dir.mkdir(parents=True, exist_ok=True)

    main_model_url = None

    for file in files:
        if not file.filename:
            continue

        filename = file.filename
        file_extension = filename.split(".")[-1].lower()

        if file_extension not in ["glb", "gltf", "bin", "png", "jpg", "jpeg", "webp", "txt"]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {filename}"
            )

        contents = await file.read()
        if len(contents) > 100 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"File too large: {filename}"
            )

        file_path = models_dir / filename
        file_path.parent.mkdir(parents=True, exist_ok=True)

        with open(file_path, "wb") as f:
            f.write(contents)

        if file_extension in ["glb", "gltf"] and main_model_url is None:
            main_model_url = f"/models/{current_user.id}/{filename}"

    if not main_model_url:
        raise HTTPException(status_code=400, detail="No valid model file found")

    return {
        "url": main_model_url,
        "filename": main_model_url.split("/")[-1],
        "size": len(files)
    }

@router.get("/models", response_model=list[ModelInfo])
def list_models(
    *,
    current_user: CurrentUser,
) -> Any:
    """List all uploaded 3D models."""
    models_dir = Path("models") / str(current_user.id)

    if not models_dir.exists():
        return []

    models = []
    for file_path in models_dir.glob("*"):
        if file_path.is_file():
            models.append({
                "url": f"/models/{current_user.id}/{file_path.name}",
                "filename": file_path.name,
                "size": file_path.stat().st_size,
            })

    return models

@router.delete("/models/{filename}")
def delete_model(
    *,
    current_user: CurrentUser,
    filename: str,
) -> Message:
    """Delete a 3D model file."""
    file_path = Path("models") / str(current_user.id) / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Model not found")

    file_path.unlink()
    return Message(message="Model deleted successfully")

# 3. 动态 ID 路由（放在最后）
@router.get("/{id}", response_model=ForgePublic)
def read_forge(
    session: SessionDep,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> Any:
    """Get forge by ID."""
    forge = session.get(Forge, id)
    if not forge:
        raise HTTPException(status_code=404, detail="Forge not found")
    if forge.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return forge


@router.put("/{id}", response_model=ForgePublic)
async def update_forge(
    *,
    session: SessionDep,
    id: uuid.UUID,
    forge_in: ForgeUpdate,
    current_user: CurrentUser,
) -> Any:
    """
    Update forge.
    """
    forge = session.get(Forge, id)
    if not forge:
        raise HTTPException(status_code=404, detail="Forge not found")
    if forge.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = forge_in.model_dump(exclude_unset=True)
    content_changed = "title" in update_data or "content" in update_data
    forge.sqlmodel_update(update_data)
    session.add(forge)
    session.commit()
    session.refresh(forge)

    if content_changed and not forge.is_folder:
        await _refresh_embedding(forge, session)
        session.refresh(forge)

    return forge


@router.delete("/{id}")
def delete_forge(
    session: SessionDep,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> Message:
    """
    Delete forge.
    """
    forge = session.get(Forge, id)
    if not forge:
        raise HTTPException(status_code=404, detail="Forge not found")
    if forge.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(forge)
    session.commit()
    return Message(message="Forge deleted successfully")


@router.get("/{id}/recommend", response_model=list[ForgePublic])
async def recommend_forges(
    *,
    session: SessionDep,
    id: uuid.UUID,
    current_user: CurrentUser,
    limit: int = 5,
) -> Any:
    """基于向量相似度推荐关联笔记。"""
    forge = session.get(Forge, id)
    if not forge:
        raise HTTPException(status_code=404, detail="Forge not found")
    if forge.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # 没有 embedding 则先生成
    if forge.embedding is None:
        await _refresh_embedding(forge, session)
        session.refresh(forge)

    if forge.embedding is None:
        return []

    results = session.exec(
        select(Forge)
        .where(Forge.owner_id == current_user.id)
        .where(Forge.id != id)
        .where(Forge.embedding.is_not(None))  # type: ignore[union-attr]
        .where(Forge.is_folder == False)  # noqa: E712
        .order_by(Forge.embedding.op("<=>")(forge.embedding))  # type: ignore[union-attr]
        .limit(limit)
    ).all()

    return results


@router.post("/{id}/embed", response_model=dict)
async def reembed_forge(
    *,
    session: SessionDep,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> Any:
    """手动触发单个笔记的 embedding 生成（用于存量数据补全）。"""
    forge = session.get(Forge, id)
    if not forge:
        raise HTTPException(status_code=404, detail="Forge not found")
    if forge.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    await _refresh_embedding(forge, session)
    return {"message": "Embedding 已更新"}


@router.post("/{id}/outline", response_model=dict)
async def generate_outline(
    *,
    session: SessionDep,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> Any:
    """为笔记生成结构化大纲（LangGraph 工作流）。"""
    forge = session.get(Forge, id)
    if not forge:
        raise HTTPException(status_code=404, detail="Forge not found")
    if forge.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if forge.is_folder:
        raise HTTPException(status_code=400, detail="文件夹无法生成大纲")

    result = await outline_graph.ainvoke({
        "title": forge.title or "",
        "content": forge.content or "",
        "outline": "",
    })

    return {"outline": result["outline"]}


@router.post("/{id}/annotate-3d", response_model=dict)
async def annotate_3d_asset(
    *,
    session: SessionDep,
    id: uuid.UUID,
    current_user: CurrentUser,
    request: AnnotateRequest,
) -> Any:
    """对 3D 资产截图进行自动标注，返回标签和描述。"""
    forge = session.get(Forge, id)
    if not forge:
        raise HTTPException(status_code=404, detail="Forge not found")
    if forge.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    prompt = (
        "请分析这个 3D 模型的截图，输出 JSON 格式，包含：\n"
        '{"tags": ["标签1", "标签2", ...], "description": "简短描述", "category": "模型类别", "style": "风格特征"}\n'
        "只返回 JSON，不加其他文字。"
    )

    try:
        ai_response = await ai_client.analyze_image(request.screenshot, prompt)
    except HTTPException:
        raise HTTPException(status_code=502, detail="AI 标注失败")

    # 尝试解析 JSON，失败则返回原始文本
    try:
        annotation = json.loads(ai_response.strip().strip("```json").strip("```").strip())
    except json.JSONDecodeError:
        annotation = {"raw": ai_response}

    return {"annotation": annotation, "forge_id": str(id)}


@router.post("/{id}/complete")
async def complete_text(
    *,
    session: SessionDep,
    id: uuid.UUID,
    current_user: CurrentUser,
    request: CompleteRequest,
) -> StreamingResponse:
    """流式文案补全 / 代码优化，返回 SSE 事件流。"""
    forge = session.get(Forge, id)
    if not forge:
        raise HTTPException(status_code=404, detail="Forge not found")
    if forge.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    instruction = request.instruction or "请续写或优化以下内容，保持原有风格和语气。"
    context = f"笔记标题：{forge.title or '无标题'}\n\n{instruction}\n\n---\n\n{request.text}"

    messages = [
        ChatMessage(
            role="system",
            content="你是专业的写作助手，擅长续写、优化和扩展文本内容。直接输出结果，不加解释。",
        ),
        ChatMessage(role="user", content=context),
    ]

    async def event_stream():
        try:
            async for token in ai_client.chat_stream(ChatRequest(messages=messages)):
                yield f"data: {json.dumps({'token': token}, ensure_ascii=False)}\n\n"
        except Exception:
            yield f"data: {json.dumps({'error': 'AI 生成失败'})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/ai-optimize-light", response_model=dict)
async def ai_optimize_light(
    *,
    current_user: CurrentUser,
    request: LightOptimizeRequest,
) -> Any:
    """AI automatically optimizes lighting for a 3D model."""

    config = {
        "ambient": 0.7,
        "hemisphere": {"skyColor": "#ffffff", "groundColor": "#555555", "intensity": 0.6},
        "directional": [
            {"position": [5, 10, 5], "intensity": 1.2, "color": "#ffffff"},
            {"position": [-5, 5, -5], "intensity": 0.7, "color": "#ffeedd"},
            {"position": [0, 8, -8], "intensity": 0.5, "color": "#ffffff"}
        ],
        "environment": "studio"
    }

    model_name = request.modelPath.lower()

    if any(keyword in model_name for keyword in ["car", "vehicle", "汽车"]):
        config["ambient"] = 0.8
        config["directional"] = [
            {"position": [8, 12, 6], "intensity": 1.5, "color": "#ffffff"},
            {"position": [-6, 6, -4], "intensity": 0.8, "color": "#e8f0ff"},
            {"position": [0, 10, -10], "intensity": 0.6, "color": "#ffffff"}
        ]
    elif any(keyword in model_name for keyword in ["character", "人物", "角色"]):
        config["ambient"] = 0.9
        config["hemisphere"]["intensity"] = 0.8
        config["directional"] = [
            {"position": [3, 8, 4], "intensity": 1.3, "color": "#fff5e6"},
            {"position": [-4, 6, 3], "intensity": 0.9, "color": "#e6f0ff"}
        ]
    elif any(keyword in model_name for keyword in ["building", "建筑", "house"]):
        config["ambient"] = 0.6
        config["directional"] = [
            {"position": [10, 15, 8], "intensity": 1.4, "color": "#fff8e7"},
            {"position": [-8, 8, -6], "intensity": 0.6, "color": "#d4e5ff"}
        ]

    return {"config": config, "message": "AI 已自动优化光照配置"}

@router.post("/ai-adjust-light", response_model=dict)
async def ai_adjust_light(
    *,
    current_user: CurrentUser,
    request: LightAdjustRequest,
) -> Any:
    """AI adjusts lighting based on user feedback."""

    current = request.currentConfig or {
        "ambient": 0.5,
        "hemisphere": {"skyColor": "#ffffff", "groundColor": "#444444", "intensity": 0.4},
        "directional": [{"position": [5, 10, 5], "intensity": 1.0, "color": "#ffffff"}],
        "environment": "studio"
    }

    feedback = request.feedback.lower()
    config = {
        "ambient": current.get("ambient", 0.5),
        "hemisphere": current.get("hemisphere", {}),
        "directional": current.get("directional", []),
        "environment": current.get("environment", "studio")
    }

    if "更亮" in feedback or "brighter" in feedback or "太暗" in feedback:
        config["ambient"] = min(current.get("ambient", 0.5) + 0.3, 1.5)
        for light in config["directional"]:
            light["intensity"] = min(light.get("intensity", 1.0) + 0.4, 2.0)

    elif "更暗" in feedback or "darker" in feedback or "太亮" in feedback:
        config["ambient"] = max(current.get("ambient", 0.5) - 0.2, 0.1)
        for light in config["directional"]:
            light["intensity"] = max(light.get("intensity", 1.0) - 0.3, 0.2)

    elif "左侧" in feedback or "left" in feedback:
        config["directional"].append({
            "position": [-8, 6, 4],
            "intensity": 1.0,
            "color": "#ffffff"
        })

    elif "右侧" in feedback or "right" in feedback:
        config["directional"].append({
            "position": [8, 6, 4],
            "intensity": 1.0,
            "color": "#ffffff"
        })

    elif "柔和" in feedback or "soft" in feedback or "生硬" in feedback:
        config["ambient"] = min(current.get("ambient", 0.5) + 0.2, 1.0)
        config["hemisphere"]["intensity"] = min(current.get("hemisphere", {}).get("intensity", 0.4) + 0.3, 1.0)
        config["environment"] = "city"

    elif "重置" in feedback or "reset" in feedback:
        config = {
            "ambient": 0.5,
            "hemisphere": {"skyColor": "#ffffff", "groundColor": "#444444", "intensity": 0.4},
            "directional": [{"position": [5, 10, 5], "intensity": 1.0, "color": "#ffffff"}],
            "environment": "studio"
        }

    return {"config": config, "message": "AI 已根据您的反馈调整光照"}

def parse_light_config(ai_response: str) -> dict:
    """解析 AI 返回的光照配置."""
    try:
        ai_response = ai_response.strip()

        # 尝试提取 JSON（兼容 ```json ... ``` 或纯 JSON）
        json_str = ai_response

        if "```" in ai_response:
            parts = ai_response.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("{") and part.endswith("}"):
                    json_str = part
                    break

        # 解析 JSON
        config = json.loads(json_str)

        # 校验 + 限制范围
        valid_config = {
            'ambient': max(0.1, min(config.get('ambient', 0.5), 2.0)),
            'hemisphere': {
                'skyColor': config.get('hemisphere', {}).get('skyColor', '#ffffff'),
                'groundColor': config.get('hemisphere', {}).get('groundColor', '#444444'),
                'intensity': max(
                    0.1,
                    min(config.get('hemisphere', {}).get('intensity', 0.4), 1.5)
                )
            },
            'directional': [],
            'environment': config.get('environment', 'studio')
        }

        for light in config.get('directional', []):
            pos = light.get('position', [0, 0, 0])
            valid_config['directional'].append({
                'position': [
                    max(-20, min(pos[0], 20)),
                    max(-20, min(pos[1], 20)),
                    max(-20, min(pos[2], 20))
                ],
                'intensity': max(0.1, min(light.get('intensity', 1.0), 3.0)),
                'color': light.get('color', '#ffffff')
            })

        return valid_config

    except (json.JSONDecodeError, KeyError, IndexError) as e:
        print(f'Failed to parse AI response: {e}')
        return {}


@router.post("/ai-auto-optimize-light", response_model=dict)
async def ai_auto_optimize_light(
    *,
    current_user: CurrentUser,
    request: LightAutoOptimizeRequest,
) -> Any:
    """AI 自主观测画面效果，迭代优化光照参数."""

    current = request.currentConfig or {
        'ambient': 0.5,
        'hemisphere': {'skyColor': '#ffffff', 'groundColor': '#444444', 'intensity': 0.4},
        'directional': [{'position': [5, 10, 5], 'intensity': 1.0, 'color': '#ffffff'}],
        'environment': 'studio'
    }

    iteration = request.iteration

    prompt = f"""你是一个专业的 3D 渲染光照优化专家。你的任务是分析 3D 模型的渲染画面，自动调整光照参数以达到最佳视觉效果。

请分析画面中的以下问题并优化：
1. 整体亮度是否合适（太暗或太亮）
2. 是否有死黑区域（完全没有光照）
3. 是否有过曝区域（亮度过高失去细节）
4. 阴影是否自然
5. 模型细节是否清晰可见
6. 材质表现是否良好

这是第 {iteration} 次光照优化迭代。

当前光照配置：
{json.dumps(current, ensure_ascii=False)}

只返回 JSON 格式的优化配置，不要其他文字：
{{
  "ambient": 环境光强度 (0.1-2.0),
  "hemisphere": {{
    "skyColor": "天空颜色 hex",
    "groundColor": "地面颜色 hex",
    "intensity": 半球光强度 (0.1-1.5)
  }},
  "directional": [
    {{
      "position": [x, y, z],
      "intensity": 强度 (0.1-3.0),
      "color": "颜色 hex"
    }}
  ],
  "environment": "环境贴图预设 (studio/city/park/dawn/dusk/night)"
}}"""

    try:
        ai_response = await ai_client.analyze_image(request.screenshot, prompt)
    except HTTPException:
        return {
            'config': current,
            'iteration': iteration,
            'shouldContinue': False,
            'message': 'AI 调用失败，保持当前配置'
        }

    new_config = parse_light_config(ai_response)

    if not new_config:
        return {
            'config': current,
            'iteration': iteration,
            'shouldContinue': False,
            'message': 'AI 解析失败，保持当前配置'
        }

    should_continue = iteration < 1

    return {
        'config': new_config,
        'iteration': iteration,
        'shouldContinue': should_continue,
        'message': f'AI 第 {iteration} 次优化完成'
    }


@router.post('/ai-adjust-light-with-screenshot', response_model=dict)
async def ai_adjust_light_with_screenshot(
    *,
    current_user: CurrentUser,
    request: LightAdjustWithScreenshotRequest,
) -> Any:
    """AI 根据用户反馈和画面效果调整光照."""

    current = request.currentConfig or {
        'ambient': 0.5,
        'hemisphere': {'skyColor': '#ffffff', 'groundColor': '#444444', 'intensity': 0.4},
        'directional': [{'position': [5, 10, 5], 'intensity': 1.0, 'color': '#ffffff'}],
        'environment': 'studio'
    }

    feedback = request.feedback

    prompt = f"""你是一个专业的 3D 渲染光照优化专家。根据用户的自然语言反馈，调整 3D 场景的光照配置。

用户反馈：{feedback}

当前配置：
{json.dumps(current, ensure_ascii=False)}

只返回 JSON 格式的光照配置，不要其他文字：
{{
  "ambient": 环境光强度 (0.1-2.0),
  "hemisphere": {{
    "skyColor": "天空颜色 hex",
    "groundColor": "地面颜色 hex",
    "intensity": 半球光强度 (0.1-1.5)
  }},
  "directional": [
    {{
      "position": [x, y, z],
      "intensity": 强度 (0.1-3.0),
      "color": "颜色 hex"
    }}
  ],
  "environment": "环境贴图预设 (studio/city/park/dawn/dusk/night)"
}}"""

    try:
        if request.screenshot:
            ai_response = await ai_client.analyze_image(request.screenshot, prompt)
        else:
            ai_response = await ai_client.chat(
                ChatRequest(messages=[ChatMessage(role="user", content=prompt)])
            )
    except HTTPException:
        return {'config': current, 'message': 'AI 调用失败，保持当前配置'}

    new_config = parse_light_config(ai_response)

    if not new_config:
        return {'config': current, 'message': 'AI 解析失败，保持当前配置'}

    return {'config': new_config, 'message': 'AI 已根据反馈调整光照'}