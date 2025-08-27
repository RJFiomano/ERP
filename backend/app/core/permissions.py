from typing import List, Optional
from functools import wraps
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.core.auth import get_current_user


def get_user_permissions(user: User, db: Session) -> List[str]:
    """
    Retorna lista de permissões do usuário no formato 'resource:action'
    """
    permissions = []
    
    if user.role_id:
        # Buscar permissões via novo sistema de roles
        role_permissions = db.query(RolePermission).join(Permission).filter(
            RolePermission.role_id == user.role_id,
            RolePermission.granted == True,
            Permission.is_active == True
        ).all()
        
        for rp in role_permissions:
            permission_key = f"{rp.permission.resource}:{rp.permission.action}"
            permissions.append(permission_key)
    
    # Fallback para sistema antigo de roles
    if user.role:
        legacy_permissions = get_legacy_role_permissions(user.role.value)
        permissions.extend(legacy_permissions)
    
    return list(set(permissions))  # Remove duplicatas


def get_legacy_role_permissions(role: str) -> List[str]:
    """
    Converte roles antigos em permissões para compatibilidade
    """
    admin_permissions = [
        "users:view", "users:create", "users:edit", "users:delete",
        "roles:view", "roles:create", "roles:edit", "roles:delete",
        "pessoas:view", "pessoas:create", "pessoas:edit", "pessoas:delete", "pessoas:manage_roles",
        "products:view", "products:create", "products:edit", "products:delete",
        "categories:view", "categories:create", "categories:edit", "categories:delete",
        "reports:view"
    ]
    
    legacy_mapping = {
        "admin": admin_permissions,
        "ADMIN": admin_permissions,  # Também aceitar maiúsculo
        "financeiro": [
            "pessoas:view",
            "products:view", "products:edit",
            "categories:view",
            "reports:view"
        ],
        "FINANCEIRO": [
            "pessoas:view",
            "products:view", "products:edit",
            "categories:view",
            "reports:view"
        ],
        "vendas": [
            "pessoas:view", "pessoas:create", "pessoas:edit",
            "products:view",
            "categories:view"
        ],
        "VENDAS": [
            "pessoas:view", "pessoas:create", "pessoas:edit",
            "products:view",
            "categories:view"
        ],
        "estoque": [
            "products:view", "products:create", "products:edit",
            "categories:view", "categories:create", "categories:edit"
        ],
        "ESTOQUE": [
            "products:view", "products:create", "products:edit",
            "categories:view", "categories:create", "categories:edit"
        ],
        "leitura": [
            "pessoas:view",
            "products:view",
            "categories:view"
        ],
        "LEITURA": [
            "pessoas:view",
            "products:view",
            "categories:view"
        ]
    }
    
    return legacy_mapping.get(role, [])


def has_permission(user: User, resource: str, action: str, db: Session) -> bool:
    """
    Verifica se o usuário tem uma permissão específica
    """
    permission_key = f"{resource}:{action}"
    user_permissions = get_user_permissions(user, db)
    return permission_key in user_permissions


def require_permission(resource: str, action: str):
    """
    Decorador para verificar permissões em rotas
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extrair dependências do kwargs
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            
            if not current_user or not db:
                raise HTTPException(status_code=500, detail="Dependências não encontradas")
            
            if not has_permission(current_user, resource, action, db):
                raise HTTPException(
                    status_code=403, 
                    detail=f"Sem permissão para {action} em {resource}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_permissions(permissions: List[str]):
    """
    Decorador para verificar múltiplas permissões (OR logic)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            
            if not current_user or not db:
                raise HTTPException(status_code=500, detail="Dependências não encontradas")
            
            user_permissions = get_user_permissions(current_user, db)
            
            # Verifica se o usuário tem pelo menos uma das permissões necessárias
            has_any_permission = any(perm in user_permissions for perm in permissions)
            
            if not has_any_permission:
                raise HTTPException(
                    status_code=403, 
                    detail="Sem permissão para executar esta ação"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


class PermissionChecker:
    """
    Classe para verificação de permissões que pode ser injetada como dependência
    """
    def __init__(self, resource: str, action: str):
        self.resource = resource
        self.action = action
    
    def __call__(
        self, 
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        if not has_permission(current_user, self.resource, self.action, db):
            raise HTTPException(
                status_code=403,
                detail=f"Sem permissão para {self.action} em {self.resource}"
            )
        return current_user