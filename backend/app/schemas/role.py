from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


class PermissionBase(BaseModel):
    name: str = Field(..., description="Nome único da permissão")
    resource: str = Field(..., description="Recurso (ex: products, clients)")
    action: str = Field(..., description="Ação (ex: view, create, edit, delete)")
    description: Optional[str] = Field(None, description="Descrição da permissão")


class Permission(PermissionBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PermissionCreate(PermissionBase):
    pass


class PermissionUpdate(BaseModel):
    name: Optional[str] = None
    resource: Optional[str] = None
    action: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class RolePermissionBase(BaseModel):
    permission_id: UUID
    granted: bool = True


class RolePermission(RolePermissionBase):
    id: UUID
    role_id: UUID
    permission: Permission
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class RoleBase(BaseModel):
    name: str = Field(..., description="Nome único do papel")
    description: Optional[str] = Field(None, description="Descrição do papel")


class Role(RoleBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    permissions: List[Permission] = []
    
    class Config:
        from_attributes = True


class RoleCreate(RoleBase):
    permission_ids: Optional[List[UUID]] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    permission_ids: Optional[List[UUID]] = None


class UserRoleInfo(BaseModel):
    role_id: Optional[UUID] = None
    role_name: Optional[str] = None
    permissions: List[str] = []  # Lista de permissões no formato "resource:action"