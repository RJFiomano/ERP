"""
Schemas de resposta da API
"""
from typing import Any, Optional, Generic, TypeVar
from pydantic import BaseModel

T = TypeVar('T')

class APIResponse(BaseModel, Generic[T]):
    """Resposta padrão da API"""
    success: bool
    message: Optional[str] = None
    data: Optional[T] = None
    
    @classmethod
    def success_response(cls, data: T = None, message: str = "Sucesso"):
        return cls(success=True, data=data, message=message)
    
    @classmethod
    def error_response(cls, message: str = "Erro interno"):
        return cls(success=False, message=message, data=None)