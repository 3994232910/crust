import uuid
from typing import TYPE_CHECKING
from sqlalchemy import Column
from sqlmodel import SQLModel, Field, Relationship
from pgvector.sqlalchemy import Vector

from app.core.config import settings

if TYPE_CHECKING:
    from app.models.user import User

# 从配置读取 embedding 维度，支持不同模型
EMBEDDING_DIM = settings.AI_EMBEDDING_DIM

class ForgeBase(SQLModel):
    title: str | None = None
    content: str | None = None
    is_folder: bool = False
    parent_id: uuid.UUID | None = None


class ForgeCreate(ForgeBase):
    pass


class ForgeUpdate(SQLModel):
    title: str | None = None
    content: str | None = None
    is_folder: bool | None = None
    parent_id: uuid.UUID | None = None


class ForgePublic(ForgeBase):
    id: uuid.UUID
    owner_id: uuid.UUID


class ForgesPublic(SQLModel):
    data: list[ForgePublic]
    count: int


class Forge(ForgeBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    owner: "User" = Relationship(back_populates="forges")
    embedding: list[float] | None = Field(
        default=None,
        sa_column=Column(Vector(EMBEDDING_DIM), nullable=True),
    )


# ---------------------------------------------------------------------------
# AI / request-only schemas (no DB table)
# ---------------------------------------------------------------------------

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
    screenshot: str


class ImageTo3DRequest(SQLModel):
    image_base64: str | None = None
    image_url: str | None = None
    texture: bool = True
    octree_resolution: int = 256
    num_inference_steps: int = 5
    guidance_scale: float = 5.0