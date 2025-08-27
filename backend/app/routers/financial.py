from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User

router = APIRouter()


@router.get("/accounts-receivable")
def get_accounts_receivable(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "financeiro"))):
    return {"message": "Contas a receber - implementar"}


@router.get("/accounts-payable")
def get_accounts_payable(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "financeiro"))):
    return {"message": "Contas a pagar - implementar"}


@router.post("/payment")
def process_payment(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "financeiro"))):
    return {"message": "Processar pagamento - mock PIX/Cartão/Boleto"}


@router.get("/dashboard")
def financial_dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "financeiro"))):
    return {
        "message": "Dashboard financeiro - implementar",
        "kpis": {
            "total_receivable": 150000.00,
            "total_payable": 80000.00,
            "cash_flow": 70000.00
        }
    }