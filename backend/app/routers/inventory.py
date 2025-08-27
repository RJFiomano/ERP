from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User

router = APIRouter()


@router.get("/movements")
def get_stock_movements(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "estoque"))):
    return {"message": "Movimentações de estoque - implementar"}


@router.post("/movements")
def create_stock_movement(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "estoque"))):
    return {"message": "Criar movimentação de estoque - implementar"}


@router.get("/alerts")
def get_stock_alerts(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "estoque"))):
    return {"message": "Alertas de estoque mínimo - implementar"}


@router.post("/inventory")
def create_inventory(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "estoque"))):
    return {"message": "Fazer inventário - implementar"}


@router.get("/dashboard")
def inventory_dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "estoque"))):
    return {
        "message": "Dashboard de estoque - implementar",
        "kpis": {
            "total_products": 1250,
            "low_stock_alerts": 15,
            "stock_value": 85000.00
        }
    }