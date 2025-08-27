from sqlalchemy import Column, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel


class RolePermission(BaseModel):
    __tablename__ = "role_permissions"
    
    role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id'), nullable=False)
    permission_id = Column(UUID(as_uuid=True), ForeignKey('permissions.id'), nullable=False)
    granted = Column(Boolean, default=True)  # Permite negação explícita de permissões
    
    # Relacionamentos
    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")