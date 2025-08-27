from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID
from decimal import Decimal


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    default_margin_percentage: Optional[Decimal] = Field(None, ge=0, le=1000, description="Margem padrão da categoria (%)")


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_margin_percentage: Optional[Decimal] = Field(None, ge=0, le=1000, description="Margem padrão da categoria (%)")


class Category(CategoryBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True