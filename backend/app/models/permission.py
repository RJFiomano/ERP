from sqlalchemy import Column, String, Boolean, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Permission(BaseModel):
    __tablename__ = "permissions"
    
    name = Column(String(100), unique=True, nullable=False, index=True)
    resource = Column(String(100), nullable=False, index=True)  # ex: products, clients, categories
    action = Column(String(50), nullable=False, index=True)     # ex: view, create, edit, delete
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Relacionamento com roles
    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")