import uuid
from typing import Any
from pathlib import Path
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select, SQLModel

from app.api.deps import CurrentUser, SessionDep
from app.models.forge import Forge, ForgeCreate, ForgePublic, ForgesPublic, ForgeUpdate
from app.models import Message

router = APIRouter(prefix="/forge", tags=["forge"])


class ModelInfo(SQLModel):
    url: str
    filename: str
    size: int


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
