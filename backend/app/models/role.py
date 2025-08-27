from sqlalchemy import Column, String, Boolean, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Role(BaseModel):
    __tablename__ = "roles"
    
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Relacionamento com usuários
    users = relationship("User", back_populates="role_obj")
    
    # Relacionamento com permissões
    role_permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")