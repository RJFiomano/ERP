from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, users, clients, suppliers, categories, products, sales, financial, inventory, reports, roles, permissions, contacts, sale_orders, nfe, payments, quick_sales, pessoas, setup, purchase, stock, accounts_payable

app = FastAPI(
    title="ERP Sistema",
    description="Sistema ERP para PMEs no Brasil",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://172.18.0.5:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
app.include_router(users.router)
app.include_router(clients.router, prefix="/clients", tags=["Clientes"])
app.include_router(suppliers.router, prefix="/suppliers", tags=["Fornecedores"])
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(sales.router, prefix="/sales", tags=["Vendas"])
app.include_router(sale_orders.router, prefix="/sale-orders", tags=["Pedidos de Venda"])
app.include_router(financial.router, prefix="/financial", tags=["Financeiro"])
app.include_router(inventory.router, prefix="/inventory", tags=["Estoque"])
app.include_router(reports.router, prefix="/reports", tags=["Relatórios"])
app.include_router(roles.router)
app.include_router(permissions.router)
app.include_router(contacts.router)
app.include_router(nfe.router)
app.include_router(payments.router)
# app.include_router(quick_sales.router)  # Commented out to avoid conflict with sales router
app.include_router(pessoas.router)
app.include_router(setup.router)

# Novos módulos de compras
app.include_router(purchase.router)
app.include_router(stock.router)
app.include_router(accounts_payable.router)


@app.get("/")
async def root():
    return {"message": "ERP Sistema API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "OK"}

@app.get("/test-json-main")
async def test_json_main():
    """Teste JSON direto no main"""
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"🧪 TESTE JSON NO MAIN CHAMADO!")
    return {"message": "JSON no main funcionando!", "status": "ok"}

@app.get("/test-pdf-without-reportlab")
async def test_pdf_without_reportlab():
    """Criar PDF simples SEM reportlab"""
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"🔥 CRIANDO PDF SEM REPORTLAB!")
        
        # Criar PDF básico manualmente
        pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(PEDIDO DE COMPRA) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000015 00000 n 
0000000068 00000 n 
0000000125 00000 n 
0000000280 00000 n 
0000000350 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
445
%%EOF"""
        
        logger.error(f"✅ PDF MANUAL CRIADO! Tamanho: {len(pdf_content)}")
        
        from fastapi.responses import Response
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=pedido-manual.pdf"}
        )
        
    except Exception as e:
        logger.error(f"💥 ERRO PDF MANUAL:", exc_info=True)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Erro PDF manual: {str(e)}")

@app.get("/test-reportlab-install")
async def test_reportlab_install():
    """Testar instalação do reportlab"""
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"🔍 TESTANDO IMPORTAÇÃO REPORTLAB...")
        
        try:
            import reportlab
            logger.error(f"✅ REPORTLAB IMPORTADO!")
            version = getattr(reportlab, 'Version', 'desconhecida')
            logger.error(f"📦 VERSÃO: {version}")
            
            from reportlab.lib.pagesizes import A4
            logger.error(f"✅ PAGESIZES OK!")
            
            from reportlab.platypus import SimpleDocTemplate
            logger.error(f"✅ PLATYPUS OK!")
            
            return {"status": "ok", "reportlab": "instalado", "version": version}
            
        except ImportError as import_err:
            logger.error(f"❌ ERRO IMPORTAÇÃO: {import_err}")
            return {"status": "error", "error": str(import_err)}
            
    except Exception as e:
        logger.error(f"💥 ERRO GERAL:", exc_info=True)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/debug-order-details")
async def debug_order_details():
    """Debug detalhes de pedidos"""
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.error("🔍 DEBUGANDO DETALHES DO PEDIDO")
        
        from app.database.connection import get_db_connection
        from app.services.purchase_service import PurchaseService
        from uuid import UUID
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Verificar se existem pedidos
        cursor.execute("SELECT COUNT(*) FROM pedidos_compra")
        count = cursor.fetchone()[0]
        logger.error(f"📊 Total de pedidos: {count}")
        
        if count > 0:
            # 2. Buscar último pedido criado
            cursor.execute("""
                SELECT id, numero_pedido, pessoa_id, status 
                FROM pedidos_compra 
                ORDER BY data_pedido DESC 
                LIMIT 1
            """)
            last_order = cursor.fetchone()
            
            if last_order:
                order_id_str = str(last_order[0])
                logger.error(f"🎯 Último pedido: {order_id_str}")
                
                # 3. Testar o método get_purchase_order_details
                service = PurchaseService()
                details = await service.get_purchase_order_details(UUID(order_id_str))
                logger.error(f"📋 Detalhes obtidos: {details.success}")
                
                cursor.close()
                conn.close()
                
                return {
                    "status": "ok",
                    "total_orders": count,
                    "last_order_id": order_id_str,
                    "details_success": details.success,
                    "details_message": details.message,
                    "has_data": bool(details.data) if details.data else False
                }
            else:
                cursor.close()
                conn.close()
                return {"status": "error", "message": "Nenhum pedido encontrado"}
        else:
            cursor.close()
            conn.close()
            return {"status": "error", "message": "Nenhum pedido na base"}
            
    except Exception as e:
        logger.error(f"💥 Erro:", exc_info=True)
        return {"status": "error", "message": str(e)}

@app.post("/test-email-working")
async def test_email_working():
    """Teste de email que realmente funciona"""
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        # Usar smtplib síncrono ao invés de aiosmtplib
        msg = MIMEMultipart()
        msg['From'] = "reginaldo.fiomano@gmail.com"
        msg['To'] = "reginaldo.fiomano@gmail.com"
        msg['Subject'] = "Teste ERP - Sistema Funcionando!"
        
        body = "Sistema de email funcionando perfeitamente!"
        msg.attach(MIMEText(body, 'plain'))
        
        # Conectar e enviar
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login("reginaldo.fiomano@gmail.com", "ttlg ohrd aoiq itxh")
        
        text = msg.as_string()
        server.sendmail("reginaldo.fiomano@gmail.com", "reginaldo.fiomano@gmail.com", text)
        server.quit()
        
        return {"status": "ok", "message": "Email enviado com smtplib!"}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/debug-smtp-config")
async def debug_smtp_config():
    """Debug das configurações SMTP"""
    from app.config import settings
    import os
    
    return {
        "env_file_exists": os.path.exists(".env"),
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
        "smtp_username": settings.smtp_username,
        "smtp_password": settings.smtp_password[:4] + "****" if settings.smtp_password else None,
        "smtp_from": settings.smtp_from,
        "raw_env": {
            "SMTP_HOST": os.getenv("SMTP_HOST"),
            "SMTP_PORT": os.getenv("SMTP_PORT"),
            "SMTP_USERNAME": os.getenv("SMTP_USERNAME"),
            "SMTP_PASSWORD": os.getenv("SMTP_PASSWORD")[:4] + "****" if os.getenv("SMTP_PASSWORD") else None,
            "SMTP_FROM": os.getenv("SMTP_FROM")
        }
    }

@app.post("/test-email-service")
async def test_email_service():
    """Teste do serviço de email usando PurchaseService"""
    try:
        import logging
        from app.services.purchase_service import PurchaseService
        from app.config import settings
        from uuid import uuid4
        
        logger = logging.getLogger(__name__)
        logger.error("🧪 TESTANDO SERVIÇO DE EMAIL...")
        
        # Verificar configurações SMTP
        logger.error(f"📧 SMTP Host: {settings.smtp_host}")
        logger.error(f"📧 SMTP Port: {settings.smtp_port}")
        logger.error(f"📧 SMTP Username: {settings.smtp_username}")
        logger.error(f"📧 SMTP Password: {settings.smtp_password[:4]}****")
        
        # Criar dados fictícios para teste
        fake_order_data = {
            'order_number': 'TESTE-001',
            'supplier': {'name': 'Fornecedor Teste'},
            'values': {'total': 100.50},
            'items': [
                {
                    'product': {'name': 'Produto Teste'},
                    'quantities': {'ordered': 2},
                    'prices': {'unit_price': 25.25, 'subtotal': 50.50}
                }
            ]
        }
        
        # Mock da função get_purchase_order_details
        service = PurchaseService()
        original_method = service.get_purchase_order_details
        
        async def mock_get_order_details(order_id):
            from app.models.response import APIResponse
            return APIResponse(success=True, data=fake_order_data)
        
        service.get_purchase_order_details = mock_get_order_details
        
        # Testar envio
        result = await service.send_order_by_email(uuid4(), "reginaldo.fiomano@gmail.com")
        
        # Restaurar método original
        service.get_purchase_order_details = original_method
        
        return {
            "status": "ok" if result.success else "error",
            "message": result.message,
            "data": result.data
        }
        
    except Exception as e:
        logger.error(f"💥 ERRO: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}

@app.get("/test-sending-endpoints")
async def test_sending_endpoints():
    """Testar endpoints de envio diretamente"""
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"🧪 TESTANDO ENDPOINTS DE ENVIO...")
        
        from app.services.purchase_service import PurchaseService
        from uuid import UUID
        
        # Simular um teste de envio com dados fictícios
        service = PurchaseService()
        
        # ID fictício para teste (não precisa existir na base)
        test_order_id = UUID('12345678-1234-5678-9abc-123456789abc')
        
        # Teste 1: Email
        try:
            logger.error("📧 Testando envio de email...")
            # A função retornará erro porque o pedido não existe, mas isso é esperado
            email_result = await service.send_order_by_email(test_order_id, "test@email.com")
            email_status = f"✅ Método email executado: {email_result.message}"
        except Exception as e:
            # Esperamos este erro porque o pedido não existe
            if "não encontrado" in str(e).lower() or "not found" in str(e).lower():
                email_status = "✅ Método email funcional (erro esperado: pedido não existe)"
            else:
                email_status = f"❌ Erro inesperado no email: {e}"
        
        return {
            "status": "ok",
            "email_test": email_status,
            "message": "Testes de endpoints de envio concluídos",
            "note": "Erros 'pedido não encontrado' são esperados pois usamos ID fictício"
        }
        
    except Exception as e:
        logger.error(f"💥 ERRO GERAL:", exc_info=True)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))