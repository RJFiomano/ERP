from sqlalchemy import Column, String, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    FINANCEIRO = "financeiro"
    VENDAS = "vendas"
    ESTOQUE = "estoque"
    LEITURA = "leitura"


class User(BaseModel):
    __tablename__ = "users"
    
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.LEITURA)  # Manter compatibilidade
    role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id'), nullable=True)  # Novo sistema
    is_active = Column(Boolean, default=True)
    
    # Relacionamento com role
    role_obj = relationship("Role", back_populates="users")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")