from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from app.models.base import BaseModel


class PasswordResetToken(BaseModel):
    __tablename__ = "password_reset_tokens"
    
    token = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    
    # Relacionamentos
    user = relationship("User", back_populates="password_reset_tokens")
    
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self):
        return not self.used and not self.is_expired()
    
    @classmethod
    def create_token(cls, user_id: str, token: str, expires_hours: int = 1):
        """Create a new password reset token"""
        return cls(
            token=token,
            user_id=user_id,
            expires_at=datetime.utcnow() + timedelta(hours=expires_hours)
        )