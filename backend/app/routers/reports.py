from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
import csv
import io

router = APIRouter()


@router.get("/dashboard")
def get_dashboard_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {
        "message": "Dashboard principal - implementar KPIs reais",
        "kpis": {
            "total_sales": 250000.00,
            "monthly_revenue": 45000.00,
            "active_clients": 180,
            "pending_orders": 25
        },
        "charts": {
            "sales_by_month": [10000, 15000, 20000, 25000, 30000, 45000],
            "top_products": ["Product A", "Product B", "Product C"],
            "sales_by_client_type": {"PF": 60, "PJ": 40}
        }
    }


@router.get("/sales")
def get_sales_report(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"message": "Relatório de vendas - implementar filtros"}


@router.get("/sales/export")
def export_sales_report(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Mock CSV export
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Data', 'Cliente', 'Produto', 'Quantidade', 'Valor'])
    writer.writerow(['2024-01-15', 'Cliente A', 'Produto X', '10', 'R$ 1.000,00'])
    writer.writerow(['2024-01-16', 'Cliente B', 'Produto Y', '5', 'R$ 500,00'])
    
    content = output.getvalue()
    output.close()
    
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vendas.csv"}
    )


@router.get("/financial")
def get_financial_report(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"message": "Relatório financeiro - implementar"}


@router.get("/inventory")
def get_inventory_report(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"message": "Relatório de estoque - implementar"}