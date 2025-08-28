from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    password: str
    role: Optional[UserRole] = UserRole.LEITURA  # Sistema legado
    role_id: Optional[UUID] = None  # Novo sistema


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None  # Sistema legado
    role_id: Optional[UUID] = None  # Novo sistema
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: UUID
    role: UserRole
    role_id: Optional[UUID] = None
    role_name: Optional[str] = Field(None, description="Nome do role atual")
    permissions: List[str] = Field(default_factory=list, description="Lista de permissões do usuário")
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    id: UUID
    email: EmailStr
    name: str
    role: UserRole
    role_id: Optional[UUID] = None
    role_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    current_password: Optional[str] = Field(None, description="Senha atual para validação")
    new_password: Optional[str] = Field(None, min_length=6, description="Nova senha")
    confirm_password: Optional[str] = Field(None, description="Confirmação da nova senha")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "João Silva",
                "email": "joao@empresa.com",
                "current_password": "senhaAtual123",
                "new_password": "novaSenha123", 
                "confirm_password": "novaSenha123"
            }
        }