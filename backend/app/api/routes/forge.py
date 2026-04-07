import uuid
import json
import base64
from typing import Any
from pathlib import Path
import shutil

import requests
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from sqlmodel import Session, select, SQLModel

from app.api.deps import CurrentUser, SessionDep
from app.models.forge import Forge, ForgeCreate, ForgePublic, ForgesPublic, ForgeUpdate
from app.models import Message

router = APIRouter(prefix="/forge", tags=["forge"])

DASHSCOPE_API_KEY = "YOUR_DASHSCOPE_API_KEY_HERE"
DASHSCOPE_API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"


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
def create_forge(
    *,
    session: SessionDep,
    forge_in: ForgeCreate,
    current_user: CurrentUser,
) -> Any:
    """
    Create new forge.
    """
    # If no title provided and it's a folder, use default folder name
    if forge_in.is_folder and not forge_in.title:
        forge_in.title = "nebula"

    # If no title provided and it's a file, use default file name
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
    return forge

# 2. 模型路由（必须放在 /{id} 之前！）
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
def update_forge(
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
    forge.sqlmodel_update(update_data)
    session.add(forge)
    session.commit()
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

def call_dashscope(messages: list[dict]) -> str:
    """调用通义千问 API."""
    response = requests.post(
        DASHSCOPE_API_URL,
        headers={
            "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "qwen-vl-max",
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 2000
        },
        timeout=30
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"AI API 调用失败: {response.text}"
        )

    result = response.json()
    return result['choices'][0]['message']['content']

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


@router.post('/ai-auto-optimize-light', response_model=dict)
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

    messages = [
        {
            'role': 'system',
            'content': '''你是一个专业的 3D 渲染光照优化专家。你的任务是分析 3D 模型的渲染画面，自动调整光照参数以达到最佳视觉效果。

请分析画面中的以下问题并优化：
1. 整体亮度是否合适（太暗或太亮）
2. 是否有死黑区域（完全没有光照）
3. 是否有过曝区域（亮度过高失去细节）
4. 阴影是否自然
5. 模型细节是否清晰可见
6. 材质表现是否良好

返回 JSON 格式的优化配置：
{
  "ambient": 环境光强度 (0.1-2.0),
  "hemisphere": {
    "skyColor": "天空颜色 hex",
    "groundColor": "地面颜色 hex", 
    "intensity": 半球光强度 (0.1-1.5)
  },
  "directional": [
    {
      "position": [x, y, z],
      "intensity": 强度 (0.1-3.0),
      "color": "颜色 hex"
    }
  ],
  "environment": "环境贴图预设 (studio/city/park/dawn/dusk/night)"
}'''
        },
        {
            'role': 'user',
            'content': [
                {
                    'type': 'image_url',
                    'image_url': {
                        'url': request.screenshot
                    }
                },
                {
                    'type': 'text',
                    'text': f'这是第 {iteration} 次光照优化迭代。\n\n当前光照配置：\n{json.dumps(current, ensure_ascii=False)}\n\n请分析画面效果，给出优化后的光照配置。'
                }
            ]
        }
    ]

    ai_response = call_dashscope(messages)

    new_config = parse_light_config(ai_response)

    if not new_config:
        raise HTTPException(status_code=500, detail='AI 返回的配置格式错误')

    should_continue = iteration < 3

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

    messages = [
        {
            'role': 'system',
            'content': '''你是一个专业的 3D 渲染光照优化专家。根据用户的自然语言反馈，调整 3D 场景的光照配置。

返回 JSON 格式的光照配置：
{
  "ambient": 环境光强度 (0.1-2.0),
  "hemisphere": {
    "skyColor": "天空颜色 hex",
    "groundColor": "地面颜色 hex",
    "intensity": 半球光强度 (0.1-1.5)
  },
  "directional": [
    {
      "position": [x, y, z],
      "intensity": 强度 (0.1-3.0),
      "color": "颜色 hex"
    }
  ],
  "environment": "环境贴图预设 (studio/city/park/dawn/dusk/night)"
}'''
        }
    ]

    user_content = [
        {
            'type': 'text',
            'text': f'用户反馈：{feedback}\n\n当前配置：\n{json.dumps(current, ensure_ascii=False)}'
        }
    ]

    if request.screenshot:
        user_content.insert(0, {
            'type': 'image_url',
            'image_url': {'url': request.screenshot}
        })

    messages.append({'role': 'user', 'content': user_content})

    ai_response = call_dashscope(messages)

    new_config = parse_light_config(ai_response)

    if not new_config:
        raise HTTPException(status_code=500, detail='AI 返回的配置格式错误')

    return {'config': new_config, 'message': 'AI 已根据反馈调整光照'}