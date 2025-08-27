from sqlalchemy import Column, String, Boolean, Text, Numeric
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Category(BaseModel):
    __tablename__ = "categories"
    
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Sistema de margem de lucro por categoria
    default_margin_percentage = Column(Numeric(5, 2))  # Margem padrão da categoria (%)
    
    # Relacionamento com produtos
    products = relationship("Product", back_populates="category")