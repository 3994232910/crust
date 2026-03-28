import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.deps import CurrentUser, SessionDep
from app.models.forge import Forge, ForgeCreate, ForgePublic, ForgesPublic, ForgeUpdate
from app.models import Message

router = APIRouter(prefix="/forge", tags=["forge"])


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


@router.get("/{id}", response_model=ForgePublic)
def read_forge(
    session: SessionDep,
    id: uuid.UUID,
    current_user: CurrentUser,
) -> Any:
    """
    Get forge by ID.
    """
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
