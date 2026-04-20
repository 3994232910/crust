import re
import uuid
from typing import Any

from sqlmodel import Session, select, func, col

from app.core.security import get_password_hash, verify_password
from app.models import Item, ItemCreate, User, UserCreate, UserUpdate
from app.models.forge import Forge, ForgeCreate, ForgeLink, ForgeUpdate
from app.models.community import CommunityPost, CommunityPostCreate, CommunityPostUpdate, UserFollow, PostFavorite


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


# Dummy hash to use for timing attack prevention when user is not found
# This is an Argon2 hash of a random password, used to ensure constant-time comparison
DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        # Prevent timing attacks by running password verification even when user doesn't exist
        # This ensures the response time is similar whether or not the email exists
        verify_password(password, DUMMY_HASH)
        return None
    verified, updated_password_hash = verify_password(password, db_user.hashed_password)
    if not verified:
        return None
    if updated_password_hash:
        db_user.hashed_password = updated_password_hash
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    return db_user


def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


# ---------- Forge CRUD ----------

def get_forge(*, session: Session, forge_id: uuid.UUID) -> Forge | None:
    return session.get(Forge, forge_id)


def get_forges(
    *, session: Session, owner_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> list[Forge]:
    statement = (
        select(Forge)
        .where(Forge.owner_id == owner_id)
        .offset(skip)
        .limit(limit)
    )
    return list(session.exec(statement).all())


def get_forges_by_ids(
    *, session: Session, forge_ids: list[uuid.UUID], owner_id: uuid.UUID
) -> list[Forge]:
    statement = select(Forge).where(
        Forge.id.in_(forge_ids),  # type: ignore[attr-defined]
        Forge.owner_id == owner_id,
    )
    return list(session.exec(statement).all())


def create_forge(
    *, session: Session, forge_in: ForgeCreate, owner_id: uuid.UUID
) -> Forge:
    forge = Forge.model_validate(forge_in, update={"owner_id": owner_id})
    session.add(forge)
    session.commit()
    session.refresh(forge)
    return forge


def update_forge(
    *, session: Session, db_forge: Forge, forge_in: ForgeUpdate
) -> Forge:
    update_data = forge_in.model_dump(exclude_unset=True)
    db_forge.sqlmodel_update(update_data)
    session.add(db_forge)
    session.commit()
    session.refresh(db_forge)
    return db_forge


def delete_forge(*, session: Session, db_forge: Forge) -> None:
    session.delete(db_forge)
    session.commit()


def sync_forge_links(
    *, session: Session, source_id: uuid.UUID, owner_id: uuid.UUID, content: str | None
) -> None:
    """解析 content 中的 [[title]] 引用，同步到 forgelink 表。"""
    # 删除旧链接
    old_links = session.exec(select(ForgeLink).where(ForgeLink.source_id == source_id)).all()
    for link in old_links:
        session.delete(link)

    if not content:
        session.commit()
        return

    titles = list(set(re.findall(r"\[\[([^\[\]\n]+)\]\]", content)))
    for title in titles:
        target = session.exec(
            select(Forge).where(
                Forge.owner_id == owner_id,
                Forge.title == title,
                Forge.id != source_id,
            )
        ).first()
        if target:
            session.add(ForgeLink(source_id=source_id, target_id=target.id))

    session.commit()


def get_backlinks(
    *, session: Session, forge_id: uuid.UUID, owner_id: uuid.UUID
) -> list[Forge]:
    """返回所有通过 [[title]] 引用了 forge_id 的笔记（同一用户）。"""
    statement = (
        select(Forge)
        .join(ForgeLink, ForgeLink.source_id == Forge.id)
        .where(ForgeLink.target_id == forge_id, Forge.owner_id == owner_id)
    )
    return list(session.exec(statement).all())


# ---------- Community CRUD ----------

def create_community_post(
    *, session: Session, post_in: CommunityPostCreate, owner_id: uuid.UUID
) -> CommunityPost:
    """创建社区帖子"""
    db_obj = CommunityPost.model_validate(post_in, update={"owner_id": owner_id})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    
    if post_in.source_forge_id:
        forge = session.get(Forge, post_in.source_forge_id)
        if forge:
            forge.published_to_community = True
            session.add(forge)
            session.commit()
    
    return db_obj


def get_community_posts(
    *, session: Session, skip: int = 0, limit: int = 50
) -> list[CommunityPost]:
    """获取社区帖子列表（按时间倒序）"""
    statement = (
        select(CommunityPost)
        .where(CommunityPost.is_published == True)
        .order_by(col(CommunityPost.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    return list(session.exec(statement).all())


def get_community_post(*, session: Session, post_id: uuid.UUID) -> CommunityPost | None:
    """获取单个帖子"""
    return session.get(CommunityPost, post_id)


def update_community_post(
    *, session: Session, db_post: CommunityPost, post_in: CommunityPostUpdate
) -> CommunityPost:
    """更新帖子"""
    from datetime import datetime, timezone
    update_data = post_in.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    db_post.sqlmodel_update(update_data)
    session.add(db_post)
    session.commit()
    session.refresh(db_post)
    return db_post


def delete_community_post(*, session: Session, db_post: CommunityPost) -> None:
    """删除帖子"""
    session.delete(db_post)
    session.commit()


def search_community_posts(
    *, session: Session, query_vector: list[float], limit: int = 20
) -> list[dict]:
    """基于 pgvector 的语义搜索（接收已生成的向量）"""
    try:
        statement = (
            select(
                CommunityPost,
                (1 - (CommunityPost.embedding.cosine_distance(query_vector))).label("similarity")
            )
            .where(CommunityPost.is_published == True)
            .where(CommunityPost.embedding != None)
            .order_by(col("similarity").desc())
            .limit(limit)
        )
        results = session.exec(statement).all()
        
        return [
            {
                "post": post,
                "similarity": float(similarity)
            }
            for post, similarity in results
        ]
    except Exception as e:
        print(f"Search error: {e}")
        return []


def follow_user(*, session: Session, follower_id: uuid.UUID, following_id: uuid.UUID) -> UserFollow:
    """关注用户"""
    if follower_id == following_id:
        raise ValueError("Cannot follow yourself")
    
    existing = session.exec(
        select(UserFollow).where(
            UserFollow.follower_id == follower_id,
            UserFollow.following_id == following_id
        )
    ).first()
    
    if existing:
        return existing
    
    follow = UserFollow(follower_id=follower_id, following_id=following_id)
    session.add(follow)
    session.commit()
    session.refresh(follow)
    return follow


def unfollow_user(*, session: Session, follower_id: uuid.UUID, following_id: uuid.UUID) -> None:
    """取消关注"""
    follow = session.exec(
        select(UserFollow).where(
            UserFollow.follower_id == follower_id,
            UserFollow.following_id == following_id
        )
    ).first()
    
    if follow:
        session.delete(follow)
        session.commit()


def is_following_user(*, session: Session, follower_id: uuid.UUID | None, following_id: uuid.UUID) -> bool:
    """检查用户是否已关注另一用户"""
    if not follower_id or follower_id == following_id:
        return False
    follow = session.exec(
        select(UserFollow).where(
            UserFollow.follower_id == follower_id,
            UserFollow.following_id == following_id
        )
    ).first()
    return follow is not None


def get_following_users(*, session: Session, user_id: uuid.UUID) -> list[dict]:
    """获取用户关注的列表"""
    from app.models.user import User
    
    statement = (
        select(UserFollow)
        .where(UserFollow.follower_id == user_id)
        .order_by(UserFollow.created_at.desc())
    )
    follows = session.exec(statement).all()
    
    result = []
    seen_users = set()
    
    for follow in follows:
        if follow.following_id not in seen_users:
            user = session.get(User, follow.following_id)
            if user:
                post_count = session.exec(
                    select(func.count()).select_from(CommunityPost).where(
                        CommunityPost.owner_id == follow.following_id,
                        CommunityPost.is_published == True
                    )
                ).one()
                
                result.append({
                    "user": user,
                    "followed_at": follow.created_at,
                    "post_count": post_count
                })
                seen_users.add(follow.following_id)
    
    return result


def favorite_post(*, session: Session, user_id: uuid.UUID, post_id: uuid.UUID) -> PostFavorite:
    """收藏帖子"""
    existing = session.exec(
        select(PostFavorite).where(
            PostFavorite.user_id == user_id,
            PostFavorite.post_id == post_id
        )
    ).first()
    
    if existing:
        return existing
    
    fav = PostFavorite(user_id=user_id, post_id=post_id)
    session.add(fav)
    session.commit()
    session.refresh(fav)
    return fav


def unfavorite_post(*, session: Session, user_id: uuid.UUID, post_id: uuid.UUID) -> None:
    """取消收藏"""
    fav = session.exec(
        select(PostFavorite).where(
            PostFavorite.user_id == user_id,
            PostFavorite.post_id == post_id
        )
    ).first()
    
    if fav:
        session.delete(fav)
        session.commit()


def get_user_favorites(*, session: Session, user_id: uuid.UUID) -> list[CommunityPost]:
    """获取用户收藏的帖子"""
    statement = (
        select(CommunityPost)
        .join(PostFavorite, PostFavorite.post_id == CommunityPost.id)
        .where(PostFavorite.user_id == user_id)
        .order_by(PostFavorite.created_at.desc())
    )
    return list(session.exec(statement).all())


def get_post_favorite_count(*, session: Session, post_id: uuid.UUID) -> int:
    """获取帖子收藏数"""
    count = session.exec(
        select(func.count()).select_from(PostFavorite).where(
            PostFavorite.post_id == post_id
        )
    ).one()
    return count


def is_post_favorited(*, session: Session, user_id: uuid.UUID, post_id: uuid.UUID) -> bool:
    """检查用户是否已收藏帖子"""
    fav = session.exec(
        select(PostFavorite).where(
            PostFavorite.user_id == user_id,
            PostFavorite.post_id == post_id
        )
    ).first()
    return fav is not None
