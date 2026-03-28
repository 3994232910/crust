"""
Common utility models used across the application.
"""

from sqlmodel import Field, SQLModel


# Generic message
class Message(SQLModel):
    """Standard response message model."""

    message: str


# JSON payload containing access token
class Token(SQLModel):
    """Authentication token response model."""

    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    """JWT token payload model."""

    sub: str | None = None


class NewPassword(SQLModel):
    """Password reset model."""

    token: str
    new_password: str = Field(min_length=8, max_length=128)
