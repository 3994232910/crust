import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from sqlmodel import SQLModel, col, func, select

from app.api.deps import CurrentUser, OptionalCurrentUser, SessionDep
from app import crud
from app.models.community import CommunityPost, CommunityPostCreate, CommunityPostUpdate

router = APIRouter(prefix="/community", tags=["community"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CommunityPostWithAuthor(SQLModel):
    id: uuid.UUID
    title: str | None = None
    content: str | None = None
    source_forge_id: uuid.UUID | None = None
    is_published: bool = True
    thumbnail: str | None = None
    owner_id: uuid.UUID
    owner_full_name: str | None = None
    created_at: datetime
    updated_at: datetime
    favorite_count: int = 0
    is_favorited: bool = False
    is_following: bool = False


class CommunityPostsWithAuthor(SQLModel):
    data: list[CommunityPostWithAuthor]
    count: int


class PublishPostRequest(SQLModel):
    title: str | None = None
    content: str | None = None
    source_forge_id: uuid.UUID | None = None
    thumbnail: str | None = None


class FollowingUser(SQLModel):
    user_id: uuid.UUID
    full_name: str | None = None
    email: str
    post_count: int
    followed_at: datetime


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _enrich_post(
    post: CommunityPost,
    owner_full_name: str | None,
    favorite_count: int,
    is_favorited: bool,
    is_following: bool = False,
) -> CommunityPostWithAuthor:
    return CommunityPostWithAuthor(
        id=post.id,
        title=post.title,
        content=post.content,
        source_forge_id=post.source_forge_id,
        is_published=post.is_published,
        thumbnail=post.thumbnail,
        owner_id=post.owner_id,
        owner_full_name=owner_full_name,
        created_at=post.created_at,
        updated_at=post.updated_at,
        favorite_count=favorite_count,
        is_favorited=is_favorited,
        is_following=is_following,
    )


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/", response_model=CommunityPostsWithAuthor)
def list_community_posts(
    *,
    session: SessionDep,
    current_user: OptionalCurrentUser,
    skip: int = 0,
    limit: int = 20,
) -> CommunityPostsWithAuthor:
    """获取社区帖子列表（公开）"""
    from app.models.user import User

    statement = (
        select(CommunityPost, User)
        .join(User, CommunityPost.owner_id == User.id)
        .where(CommunityPost.is_published == True)
        .order_by(col(CommunityPost.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    results = session.exec(statement).all()

    count_stmt = (
        select(func.count())
        .select_from(CommunityPost)
        .where(CommunityPost.is_published == True)
    )
    count = session.exec(count_stmt).one()

    viewer_id = current_user.id if current_user else None
    data = [
        _enrich_post(
            post,
            user.full_name,
            crud.get_post_favorite_count(session=session, post_id=post.id),
            crud.is_post_favorited(session=session, user_id=viewer_id, post_id=post.id) if viewer_id else False,
            crud.is_following_user(session=session, follower_id=viewer_id, following_id=post.owner_id) if viewer_id else False,
        )
        for post, user in results
    ]

    return CommunityPostsWithAuthor(data=data, count=count)


@router.get("/my-posts", response_model=CommunityPostsWithAuthor)
def list_my_posts(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 20,
) -> CommunityPostsWithAuthor:
    """获取当前用户发布的帖子"""
    statement = (
        select(CommunityPost)
        .where(CommunityPost.owner_id == current_user.id)
        .order_by(col(CommunityPost.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    posts = list(session.exec(statement).all())

    count = session.exec(
        select(func.count()).select_from(CommunityPost).where(CommunityPost.owner_id == current_user.id)
    ).one()

    data = [
        _enrich_post(
            p,
            current_user.full_name,
            crud.get_post_favorite_count(session=session, post_id=p.id),
            crud.is_post_favorited(session=session, user_id=current_user.id, post_id=p.id),
            False,
        )
        for p in posts
    ]
    return CommunityPostsWithAuthor(data=data, count=count)


@router.get("/my-favorites", response_model=CommunityPostsWithAuthor)
def list_my_favorites(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> CommunityPostsWithAuthor:
    """获取当前用户收藏的帖子"""
    from app.models.user import User

    posts = crud.get_user_favorites(session=session, user_id=current_user.id)

    data = []
    for p in posts:
        owner = session.get(User, p.owner_id)
        data.append(_enrich_post(
            p,
            owner.full_name if owner else None,
            crud.get_post_favorite_count(session=session, post_id=p.id),
            True,  # already favorited
            crud.is_following_user(session=session, follower_id=current_user.id, following_id=p.owner_id),
        ))

    return CommunityPostsWithAuthor(data=data, count=len(data))


@router.get("/following", response_model=list[FollowingUser])
def list_following(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> list[FollowingUser]:
    """获取当前用户关注的人"""
    items = crud.get_following_users(session=session, user_id=current_user.id)
    return [
        FollowingUser(
            user_id=item["user"].id,
            full_name=item["user"].full_name,
            email=item["user"].email,
            post_count=item["post_count"],
            followed_at=item["followed_at"],
        )
        for item in items
    ]


@router.get("/search", response_model=CommunityPostsWithAuthor)
async def search_community_posts(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    q: str = Query(..., min_length=1),
    limit: int = 20,
) -> CommunityPostsWithAuthor:
    """语义搜索社区帖子（pgvector）"""
    from app.core.ai_client import ai_client, AIFeatureDisabledError
    from app.models.user import User

    try:
        vectors = await ai_client.embed([q])
        query_vector = vectors[0]
    except AIFeatureDisabledError:
        raise HTTPException(status_code=503, detail="向量搜索功能未启用，请配置 AI_MODEL_EMBEDDING_API_KEY")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"向量生成失败: {e}")

    results = crud.search_community_posts(session=session, query_vector=query_vector, limit=limit)

    data = []
    for item in results:
        post = item["post"]
        owner = session.get(User, post.owner_id)
        data.append(_enrich_post(
            post,
            owner.full_name if owner else None,
            crud.get_post_favorite_count(session=session, post_id=post.id),
            crud.is_post_favorited(session=session, user_id=current_user.id, post_id=post.id),
            crud.is_following_user(session=session, follower_id=current_user.id, following_id=post.owner_id),
        ))

    return CommunityPostsWithAuthor(data=data, count=len(data))


@router.get("/{post_id}", response_model=CommunityPostWithAuthor)
def get_community_post(
    *,
    session: SessionDep,
    current_user: OptionalCurrentUser,
    post_id: uuid.UUID,
) -> CommunityPostWithAuthor:
    """获取单个社区帖子"""
    from app.models.user import User

    post = crud.get_community_post(session=session, post_id=post_id)
    if not post or not post.is_published:
        raise HTTPException(status_code=404, detail="Post not found")

    owner = session.get(User, post.owner_id)
    viewer_id = current_user.id if current_user else None

    return _enrich_post(
        post,
        owner.full_name if owner else None,
        crud.get_post_favorite_count(session=session, post_id=post.id),
        crud.is_post_favorited(session=session, user_id=viewer_id, post_id=post.id) if viewer_id else False,
        crud.is_following_user(session=session, follower_id=viewer_id, following_id=post.owner_id) if viewer_id else False,
    )


@router.post("/", response_model=CommunityPostWithAuthor, status_code=201)
async def publish_post(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
    post_in: PublishPostRequest,
) -> CommunityPostWithAuthor:
    """发布帖子（可从 Forge 笔记发布，也可独立创建）"""
    # 若来自 forge，自动填充 title/content
    if post_in.source_forge_id:
        from app.models.forge import Forge
        forge = session.get(Forge, post_in.source_forge_id)
        if not forge or forge.owner_id != current_user.id:
            raise HTTPException(status_code=404, detail="Forge note not found")
        title = post_in.title or forge.title
        content = post_in.content or forge.content
    else:
        title = post_in.title
        content = post_in.content

    create_data = CommunityPostCreate(
        title=title,
        content=content,
        source_forge_id=post_in.source_forge_id,
        thumbnail=post_in.thumbnail,
        is_published=True,
    )
    post = crud.create_community_post(session=session, post_in=create_data, owner_id=current_user.id)

    # 后台生成 embedding
    background_tasks.add_task(_generate_post_embedding_bg, post.id)

    return _enrich_post(post, current_user.full_name, 0, False, False)


@router.patch("/{post_id}", response_model=CommunityPostWithAuthor)
def update_community_post(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    post_id: uuid.UUID,
    post_in: CommunityPostUpdate,
) -> CommunityPostWithAuthor:
    """更新帖子标题/内容/发布状态（仅限作者或超管）"""
    post = crud.get_community_post(session=session, post_id=post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    post = crud.update_community_post(session=session, db_post=post, post_in=post_in)
    return _enrich_post(
        post,
        current_user.full_name,
        crud.get_post_favorite_count(session=session, post_id=post.id),
        crud.is_post_favorited(session=session, user_id=current_user.id, post_id=post.id),
        False if post.owner_id == current_user.id else crud.is_following_user(session=session, follower_id=current_user.id, following_id=post.owner_id),
    )


@router.delete("/{post_id}")
def delete_community_post(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    post_id: uuid.UUID,
) -> dict:
    """删除社区帖子（仅限作者或超管）"""
    post = crud.get_community_post(session=session, post_id=post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    crud.delete_community_post(session=session, db_post=post)
    return {"message": "Post deleted"}


@router.post("/{post_id}/favorite", status_code=201)
def favorite_post(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    post_id: uuid.UUID,
) -> dict:
    """收藏帖子"""
    post = crud.get_community_post(session=session, post_id=post_id)
    if not post or not post.is_published:
        raise HTTPException(status_code=404, detail="Post not found")
    crud.favorite_post(session=session, user_id=current_user.id, post_id=post_id)
    return {"favorited": True, "count": crud.get_post_favorite_count(session=session, post_id=post_id)}


@router.delete("/{post_id}/favorite")
def unfavorite_post(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    post_id: uuid.UUID,
) -> dict:
    """取消收藏"""
    crud.unfavorite_post(session=session, user_id=current_user.id, post_id=post_id)
    return {"favorited": False, "count": crud.get_post_favorite_count(session=session, post_id=post_id)}


@router.post("/follow/{user_id}", status_code=201)
def follow_user(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    user_id: uuid.UUID,
) -> dict:
    """关注用户"""
    from app.models.user import User
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        crud.follow_user(session=session, follower_id=current_user.id, following_id=user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"following": True}


@router.delete("/follow/{user_id}")
def unfollow_user(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    user_id: uuid.UUID,
) -> dict:
    """取消关注"""
    crud.unfollow_user(session=session, follower_id=current_user.id, following_id=user_id)
    return {"following": False}


# ─── Background task ──────────────────────────────────────────────────────────

async def _generate_post_embedding_bg(post_id: uuid.UUID) -> None:
    """后台为社区帖子生成 embedding"""
    from app.core.db import engine
    from app.core.ai_client import ai_client
    from sqlmodel import Session

    try:
        with Session(engine) as session:
            post = session.get(CommunityPost, post_id)
            if not post:
                return
            text = f"{post.title or ''}\n{post.content or ''}"[:2000]
            vectors = await ai_client.embed([text])
            post.embedding = vectors[0]
            session.add(post)
            session.commit()
    except Exception:
        pass
