from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum
from datetime import datetime


class MovementType(str, enum.Enum):
    IN = "in"          # Entrada
    OUT = "out"        # Saída
    ADJUSTMENT = "adjustment"  # Ajuste


class StockMovement(BaseModel):
    __tablename__ = "stock_movements"
    
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    movement_type = Column(Enum(MovementType), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(10, 2), nullable=True)
    
    reference_document = Column(String(100))  # Nota fiscal, pedido, etc.
    notes = Column(String(500))
    
    movement_date = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("Product")