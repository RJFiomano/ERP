from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.role import Role
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse, UserProfileUpdate
from app.core.auth import get_current_user
from app.core.permissions import PermissionChecker, get_user_permissions
from app.core.security import get_password_hash, verify_password

router = APIRouter(prefix="/users", tags=["users"])

# Dependências de permissão
require_users_view = PermissionChecker("users", "view")
require_users_create = PermissionChecker("users", "create")
require_users_edit = PermissionChecker("users", "edit")
require_users_delete = PermissionChecker("users", "delete")


@router.get("/", response_model=List[UserListResponse])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    role_filter: Optional[str] = Query(None, alias="role"),
    status: Optional[str] = Query("active"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_users_view)
):
    """Listar usuários com filtros"""
    query = db.query(User).outerjoin(Role, User.role_id == Role.id)
    
    # Filtro de status
    if status == "active":
        query = query.filter(User.is_active == True)
    elif status == "inactive":
        query = query.filter(User.is_active == False)
    
    # Filtro de busca
    if search:
        search_filter = or_(
            User.name.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    # Filtro por role
    if role_filter:
        query = query.filter(
            or_(
                Role.name.ilike(f"%{role_filter}%"),
                User.role == role_filter
            )
        )
    
    # Aplicar paginação
    users = query.offset(skip).limit(limit).all()
    
    # Preparar resposta com informações do role
    result = []
    for user in users:
        user_dict = UserListResponse.model_validate(user).model_dump()
        
        # Adicionar nome do role
        if user.role_obj:
            user_dict["role_name"] = user.role_obj.name
        elif user.role:
            user_dict["role_name"] = user.role.value
        
        result.append(UserListResponse(**user_dict))
    
    return result


@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_users_create)
):
    """Criar novo usuário"""
    # Verificar se email já existe
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Verificar se role_id existe (se fornecido)
    if user_data.role_id:
        role = db.query(Role).filter(Role.id == user_data.role_id, Role.is_active == True).first()
        if not role:
            raise HTTPException(status_code=400, detail="Role não encontrado")
    
    # Criar usuário
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        role_id=user_data.role_id,
        password_hash=get_password_hash(user_data.password)
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Retornar com informações completas
    return await get_user_with_details(user.id, db)


@router.get("/profile", response_model=UserResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obter perfil do usuário logado"""
    return await get_user_with_details(str(current_user.id), db)


@router.put("/profile", response_model=UserResponse)
async def update_my_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualizar perfil do usuário logado"""
    
    # Validar se está tentando alterar senha
    if profile_data.new_password:
        if not profile_data.current_password:
            raise HTTPException(
                status_code=400, 
                detail="Senha atual é obrigatória para alterar a senha"
            )
        
        if not verify_password(profile_data.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=400,
                detail="Senha atual incorreta"
            )
        
        if profile_data.new_password != profile_data.confirm_password:
            raise HTTPException(
                status_code=400,
                detail="Nova senha e confirmação não coincidem"
            )
    
    # Validar email único (se está sendo alterado)
    if profile_data.email and profile_data.email != current_user.email:
        existing_user = db.query(User).filter(
            User.email == profile_data.email,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Este email já está em uso por outro usuário"
            )
    
    # Atualizar dados
    update_data = {}
    if profile_data.name:
        update_data["name"] = profile_data.name
    if profile_data.email:
        update_data["email"] = profile_data.email
    if profile_data.new_password:
        update_data["password_hash"] = get_password_hash(profile_data.new_password)
    
    # Aplicar mudanças
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    return await get_user_with_details(str(current_user.id), db)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_users_view)
):
    """Obter usuário por ID"""
    return await get_user_with_details(user_id, db)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_users_edit)
):
    """Atualizar usuário"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar email duplicado (se alterando)
    if user_data.email and user_data.email != user.email:
        existing_user = db.query(User).filter(
            User.email == user_data.email,
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email já está em uso")
    
    # Verificar se role_id existe (se fornecido)
    if user_data.role_id:
        role = db.query(Role).filter(Role.id == user_data.role_id, Role.is_active == True).first()
        if not role:
            raise HTTPException(status_code=400, detail="Role não encontrado")
    
    # Atualizar campos
    update_data = user_data.model_dump(exclude_unset=True)
    
    # Tratar senha separadamente
    if "password" in update_data and update_data["password"]:
        update_data["password_hash"] = get_password_hash(update_data["password"])
        del update_data["password"]
    
    for field, value in update_data.items():
        if hasattr(user, field):
            setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return await get_user_with_details(user.id, db)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_users_delete)
):
    """Inativar usuário (soft delete)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuário já está inativo")
    
    # Não permitir inativar o próprio usuário
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Não é possível inativar seu próprio usuário")
    
    user.is_active = False
    db.commit()
    
    return {"message": "Usuário inativado com sucesso"}


@router.patch("/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_users_edit)
):
    """Alternar status do usuário (ativo/inativo)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Não permitir alterar status do próprio usuário
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Não é possível alterar status do seu próprio usuário")
    
    user.is_active = not user.is_active
    db.commit()
    
    status = "ativado" if user.is_active else "inativado"
    return {"message": f"Usuário {status} com sucesso"}


@router.get("/{user_id}/permissions")
async def get_user_permissions_endpoint(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_users_view)
):
    """Obter permissões de um usuário específico"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    permissions = get_user_permissions(user, db)
    
    role_name = None
    if user.role_obj:
        role_name = user.role_obj.name
    elif user.role:
        role_name = user.role.value
    
    return {
        "user_id": user.id,
        "user_name": user.name,
        "role_id": user.role_id,
        "role_name": role_name,
        "permissions": permissions
    }


async def get_user_with_details(user_id: str, db: Session) -> UserResponse:
    """Função auxiliar para obter usuário com todos os detalhes"""
    user = db.query(User).outerjoin(Role, User.role_id == Role.id).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user_dict = UserResponse.model_validate(user).model_dump()
    
    # Adicionar nome do role
    if user.role_obj:
        user_dict["role_name"] = user.role_obj.name
    elif user.role:
        user_dict["role_name"] = user.role.value
    
    # Adicionar permissões
    user_dict["permissions"] = get_user_permissions(user, db)
    
    return UserResponse(**user_dict)