"""
Modelos de resposta da API
"""
from typing import Any, Optional
from pydantic import BaseModel

class APIResponse(BaseModel):
    """Resposta padrão da API"""
    success: bool
    message: Optional[str] = None
    data: Optional[Any] = None