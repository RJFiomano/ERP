"""
Rotas da API para módulo de compras
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import Response
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.services.purchase_service import PurchaseService
from app.schemas.response import APIResponse

router = APIRouter(prefix="/purchase", tags=["Compras"])

# ===== MODELS =====

class SupplierUpdateModel(BaseModel):
    payment_terms: Optional[str] = None
    delivery_time: Optional[int] = None
    minimum_order_value: Optional[float] = None
    discount_percentage: Optional[float] = None
    supplier_rating: Optional[int] = Field(None, ge=0, le=5)
    supplier_notes: Optional[str] = None
    is_active_supplier: Optional[bool] = None

class PurchaseOrderItemModel(BaseModel):
    product_id: UUID
    quantity: float = Field(..., gt=0)
    notes: Optional[str] = None

class PurchaseOrderCreateModel(BaseModel):
    supplier_id: UUID
    delivery_date: Optional[date] = None
    payment_terms: Optional[str] = "a_vista"
    delivery_location: Optional[str] = None
    notes: Optional[str] = None
    urgency: Optional[str] = Field("normal", pattern="^(baixa|normal|alta|critica)$")
    items: List[PurchaseOrderItemModel]

class PurchaseOrderFiltersModel(BaseModel):
    supplier_id: Optional[UUID] = None
    status: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    limit: Optional[int] = Field(50, le=200)
    offset: Optional[int] = 0

# ===== FORNECEDORES =====

@router.get("/suppliers", response_model=APIResponse)
async def get_suppliers(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    active_only: bool = Query(True),
    current_user: dict = Depends(get_current_user)
):
    """Buscar lista de fornecedores"""
    try:
        service = PurchaseService()
        
        filters = {
            'limit': limit,
            'offset': offset,
            'is_active_supplier': active_only
        }
        
        if search:
            filters['search'] = search
        
        return await service.get_suppliers(filters)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/suppliers/{supplier_id}", response_model=APIResponse)
async def update_supplier(
    supplier_id: UUID,
    supplier_data: SupplierUpdateModel,
    current_user: dict = Depends(get_current_user)
):
    """Atualizar dados específicos do fornecedor"""
    try:
        service = PurchaseService()
        
        # Converter para dict removendo valores None
        update_data = {k: v for k, v in supplier_data.dict().items() if v is not None}
        
        if not update_data:
            return APIResponse(success=True, message="Nenhum campo para atualizar")
        
        return await service.update_supplier_data(supplier_id, update_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== PRODUTOS PARA COMPRA =====

@router.get("/products", response_model=APIResponse)
async def get_products_for_purchase(
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    active_only: bool = Query(True),
    current_user: dict = Depends(get_current_user)
):
    """Buscar lista de produtos ativos para pedidos de compra"""
    try:
        from app.database.connection import get_db_connection
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Construir query base
        where_conditions = []
        params = []
        
        if active_only:
            where_conditions.append("is_active = true")
        
        if search:
            where_conditions.append("(name ILIKE %s OR sku ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param])
        
        where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        query = f"""
            SELECT 
                id, name, sku, sale_price, cost_price, 
                stock_quantity, unit, description
            FROM products
            {where_clause}
            ORDER BY name
            LIMIT %s OFFSET %s
        """
        
        params.extend([limit, offset])
        cursor.execute(query, params)
        products = cursor.fetchall()
        
        result = []
        for product in products:
            result.append({
                'id': str(product[0]),
                'name': product[1],
                'sku': product[2],
                'sale_price': float(product[3]) if product[3] else 0,
                'cost_price': float(product[4]) if product[4] else 0,
                'stock_quantity': float(product[5]) if product[5] else 0,
                'unit': product[6] or 'UN',
                'description': product[7]
            })
        
        cursor.close()
        conn.close()
        
        from app.models.response import APIResponse
        return APIResponse(
            success=True,
            data=result,
            message=f"{len(result)} produtos encontrados"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== PEDIDOS DE COMPRA =====

@router.post("/orders", response_model=APIResponse)
async def create_purchase_order(
    order_data: PurchaseOrderCreateModel,
    current_user: dict = Depends(get_current_user)
):
    """Criar novo pedido de compra"""
    try:
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"Dados recebidos no router: {order_data}")
        logger.info(f"Current user: {current_user}")
        
        service = PurchaseService()
        user_id = current_user.id
        
        # Converter items para formato esperado
        items_data = []
        for item in order_data.items:
            items_data.append({
                'product_id': str(item.product_id),
                'quantity': item.quantity,
                'notes': item.notes
            })
        
        order_dict = {
            'supplier_id': str(order_data.supplier_id),
            'delivery_date': order_data.delivery_date,
            'payment_terms': order_data.payment_terms,
            'delivery_location': order_data.delivery_location,
            'notes': order_data.notes,
            'urgency': order_data.urgency,
            'items': items_data
        }
        
        logger.info(f"Chamando serviço com: {order_dict}")
        result = await service.create_purchase_order(order_dict, user_id)
        logger.info(f"Resultado do serviço: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Erro no router: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders", response_model=APIResponse)
async def get_purchase_orders(
    supplier_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Buscar pedidos de compra"""
    try:
        service = PurchaseService()
        
        filters = {
            'limit': limit,
            'offset': offset
        }
        
        if supplier_id:
            filters['supplier_id'] = str(supplier_id)
        if status:
            filters['status'] = status
        if date_from:
            filters['date_from'] = date_from
        if date_to:
            filters['date_to'] = date_to
        
        return await service.get_purchase_orders(filters)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders/{order_id}", response_model=APIResponse)
async def get_purchase_order_details(
    order_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Buscar detalhes completos de um pedido"""
    try:
        service = PurchaseService()
        return await service.get_purchase_order_details(order_id)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/orders/{order_id}")
async def update_purchase_order(
    order_id: UUID,
    order_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Atualizar pedido de compra - VERSÃO SIMPLIFICADA"""
    try:
        from app.database.connection import get_db_connection
        import logging
        logger = logging.getLogger(__name__)
        
        logger.error(f"🔥 ATUALIZANDO PEDIDO {order_id} DIRETAMENTE!")
        logger.error(f"Dados: {order_data}")
        logger.error(f"📊 STATUS recebido: {order_data.get('status', 'NÃO INFORMADO')}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Atualizar dados básicos do pedido
        cursor.execute("""
            UPDATE pedidos_compra 
            SET pessoa_id = %s, 
                data_entrega_prevista = %s,
                condicoes_pagamento = %s,
                local_entrega = %s,
                observacoes = %s,
                urgencia = %s,
                status = %s
            WHERE id = %s
        """, (
            order_data.get('supplier_id'),
            order_data.get('delivery_date'),
            order_data.get('payment_terms', 'a_vista'),
            order_data.get('delivery_location', ''),
            order_data.get('notes', ''),
            order_data.get('urgency', 'normal'),
            order_data.get('status', 'rascunho'),
            order_id
        ))
        
        logger.error(f"✅ Dados básicos atualizados!")
        
        # 2. Limpar itens existentes
        cursor.execute("DELETE FROM pedidos_compra_itens WHERE pedido_id = %s", (order_id,))
        logger.error(f"🗑️ Itens antigos removidos!")
        
        # 3. Inserir novos itens
        items = order_data.get('items', [])
        
        for i, item in enumerate(items, 1):
            quantidade = float(item.get('quantity', 0))
            
            cursor.execute("""
                INSERT INTO pedidos_compra_itens (
                    pedido_id, product_id, quantidade, quantidade_pedida,
                    preco_unitario, desconto_item, preco_final,
                    subtotal_item, valor_total_item, numero_item,
                    observacoes_item
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                order_id, item.get('product_id'), quantidade, quantidade,
                0.0, 0.0, 0.0, 0.0, 0.0, i,
                item.get('notes', '')
            ))
        
        logger.error(f"📦 {len(items)} itens inseridos!")
        
        # 4. Remove update of totals since we no longer track prices
        
        # 5. COMMIT!
        conn.commit()
        logger.error(f"💾 COMMIT REALIZADO! Items: {len(items)}")
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "message": "Pedido atualizado com sucesso!",
            "data": {
                "id": str(order_id),
                "items_count": len(items)
            }
        }
        
    except Exception as e:
        logger.error(f"💥 ERRO: {str(e)}", exc_info=True)
        if 'conn' in locals():
            conn.rollback()
            cursor.close()
            conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/orders/{order_id}/status", response_model=APIResponse)
async def update_purchase_order_status(
    order_id: UUID,
    new_status: str = Query(..., pattern="^(rascunho|enviado|confirmado|parcial|recebido|cancelado)$"),
    current_user: dict = Depends(get_current_user)
):
    """Atualizar status do pedido de compra"""
    try:
        service = PurchaseService()
        user_id = current_user.id
        
        return await service.update_purchase_order_status(order_id, new_status, user_id)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-simple-json")
async def test_simple_json():
    """Teste JSON super simples"""
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"🧪 TESTE JSON SIMPLES CHAMADO!")
    return {"message": "JSON funcionando!", "status": "ok"}

@router.get("/test-pdf-simple")
async def test_pdf_super_simple():
    """Teste PDF sem autenticação e sem parâmetros"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.error(f"🧪🧪🧪 TESTE PDF SUPER SIMPLES INICIADO!")
        
        # Teste 1: Importações
        logger.error(f"📦 TESTANDO IMPORTAÇÕES...")
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph
        from reportlab.lib.styles import getSampleStyleSheet
        from io import BytesIO
        logger.error(f"✅ IMPORTAÇÕES OK!")
        
        # Teste 2: Criar PDF
        logger.error(f"🔨 CRIANDO PDF...")
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = [Paragraph("TESTE PDF SIMPLES", styles['Title'])]
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        logger.error(f"✅ PDF CRIADO! Tamanho: {len(pdf_bytes)}")
        
        # Teste 3: Retornar
        from fastapi.responses import Response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=teste-simples.pdf"}
        )
        
    except Exception as e:
        logger.error(f"💥 ERRO NO TESTE SIMPLES:", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro específico: {str(e)}")

@router.get("/orders/{order_id}/pdf-test")
async def test_pdf_endpoint(
    order_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Teste simples do endpoint PDF"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.error(f"🧪 TESTE PDF ENDPOINT CHAMADO!")
    logger.error(f"Order ID: {order_id}")
    logger.error(f"User: {current_user.email}")
    
    return {"message": "Endpoint funcionando!", "order_id": str(order_id), "user": current_user.email}

@router.get("/orders/{order_id}/pdf")
async def download_purchase_order_pdf(
    order_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Baixar pedido de compra em PDF"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.error(f"🎯 GERANDO PDF PARA PEDIDO {order_id}")
        logger.error(f"👤 User: {current_user.email}")
        
        service = PurchaseService()
        
        # Buscar dados do pedido
        order_response = await service.get_purchase_order_details(order_id)
        if not order_response.success:
            raise HTTPException(status_code=404, detail="Pedido não encontrado")
        
        order_data = order_response.data
        logger.error(f"✅ DADOS OBTIDOS")
        
        # Extrair dados completos do pedido
        order_number = order_data.get('order_number', 'N/A')
        supplier_info = order_data.get('supplier', {})
        supplier_name = supplier_info.get('name', 'N/A')
        status = order_data.get('status', 'N/A')
        values = order_data.get('values', {})
        total = values.get('total', 0)
        subtotal = values.get('subtotal', 0)
        
        # Dados de datas
        dates = order_data.get('dates', {})
        order_date = dates.get('order_date', 'N/A')
        delivery_date = dates.get('delivery_expected', 'N/A')
        
        # Outros dados
        payment_terms = order_data.get('payment_terms', 'N/A')
        delivery_location = order_data.get('delivery_location', 'N/A')
        notes = order_data.get('notes', '')
        urgency = order_data.get('urgency', 'N/A')
        
        # Função para limpar apenas dados variáveis (remover acentos para compatibilidade)
        def limpar_dados_variaveis(texto):
            import unicodedata
            if texto is None:
                return ""
            
            # Converter para string se não for
            texto = str(texto)
            
            # Normalizar e remover acentos apenas dos dados do usuário
            texto_normalizado = unicodedata.normalize('NFD', texto)
            texto_sem_acentos = ''.join(c for c in texto_normalizado if unicodedata.category(c) != 'Mn')
            
            # Substituir caracteres especiais problemáticos
            substituicoes = {
                'ç': 'c', 'Ç': 'C',
                'ã': 'a', 'Ã': 'A',
                'õ': 'o', 'Õ': 'O',
                'ñ': 'n', 'Ñ': 'N'
            }
            
            for original, substituto in substituicoes.items():
                texto_sem_acentos = texto_sem_acentos.replace(original, substituto)
            
            return texto_sem_acentos

        # Itens do pedido
        items = order_data.get('items', [])
        logger.error(f"📦 ITENS ENCONTRADOS: {len(items)}")
        
        # Construir conteúdo dos itens com acentuação corrigida
        items_content = ""
        
        for i, item in enumerate(items, 1):
            product_info = item.get('product', {})
            product_name = product_info.get('name', f'Item {i}')
            product_name_clean = limpar_dados_variaveis(product_name)
            quantities = item.get('quantities', {})
            quantity = quantities.get('ordered', 0)
            notes = item.get('notes', '')
            notes_clean = limpar_dados_variaveis(notes)
            
            items_content += f"""
0 -{20 * i} Td
({i}. {product_name_clean[:35]}) Tj
250 0 Td
(Qtd: {quantity}) Tj
80 0 Td
({notes_clean[:15] if notes_clean else '-'}) Tj
-330 0 Td"""
        
        # Aplicar limpeza apenas nos dados variáveis (manter acentos no texto fixo)
        supplier_name_clean = limpar_dados_variaveis(supplier_name)
        delivery_location_clean = limpar_dados_variaveis(delivery_location)
        notes_clean = limpar_dados_variaveis(notes)
        
        # Corrigir formatação da data - usar data atual correta
        from datetime import datetime
        today = datetime.now()
        data_atual_formatada = today.strftime('%d/%m/%Y')
        
        # Formatar data de entrega se existir
        if delivery_date and delivery_date != 'N/A':
            try:
                # Converter string da data para objeto datetime e depois formatar
                delivery_dt = datetime.strptime(delivery_date[:10], '%Y-%m-%d')
                delivery_date_formatted = delivery_dt.strftime('%d/%m/%Y')
            except:
                delivery_date_formatted = 'N/A'
        else:
            delivery_date_formatted = 'N/A'
        
        # Gerar PDF completo com as mesmas informações do HTML e acentuação corrigida
        pdf_content = f"""%PDF-1.4
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
/F2 5 0 R
>>
>>
/Contents 6 0 R
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
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
endobj

6 0 obj
<<
/Length 2500
>>
stream
BT
/F2 18 Tf
72 720 Td
(SOLICITACAO DE COTACAO #{order_number}) Tj
0 -40 Td

/F1 11 Tf
(Prezado(a) {supplier_name_clean},) Tj
0 -25 Td

/F1 10 Tf
(Segue nossa solicitacao de cotacao para os itens relacionados abaixo.) Tj
0 -30 Td

/F2 12 Tf
(ITENS PARA COTACAO ({len(items)} itens):) Tj
0 -20 Td

/F1 9 Tf
(Produto                               Qtd    Observacoes) Tj
0 -12 Td
(------------------------------------------------------------) Tj{items_content}
0 -25 Td

/F2 11 Tf
(POR FAVOR, NOS ENVIE SUA COTACAO COM:) Tj
0 -20 Td

/F1 10 Tf
(- Precos unitarios para cada item) Tj
0 -15 Td
(- Prazos de entrega) Tj
0 -15 Td
(- Condicoes de pagamento) Tj
0 -15 Td
(- Validade da proposta) Tj
0 -25 Td

/F2 11 Tf
(DETALHES DA SOLICITACAO:) Tj
0 -15 Td
/F1 10 Tf
(Data da Solicitacao: {data_atual_formatada}) Tj
0 -12 Td
(Data de Entrega Desejada: {delivery_date_formatted}) Tj
0 -12 Td
(Local de Entrega: {delivery_location_clean if delivery_location_clean else 'Nao especificado'}) Tj
0 -12 Td
(Urgencia: {urgency.upper() if urgency else 'NORMAL'}) Tj
0 -12 Td
(Forma de Pagamento: {payment_terms if payment_terms else 'A definir'}) Tj
0 -20 Td

/F1 9 Tf
(Observacoes Gerais:) Tj
0 -12 Td
({notes_clean[:60] if notes_clean else 'Nenhuma observacao adicional'}) Tj
0 -20 Td

/F1 8 Tf
(-------------------------------------------------------------) Tj
0 -10 Td
(Este documento foi gerado automaticamente pelo Sistema ERP.) Tj
0 -8 Td
(Em caso de duvidas, entre em contato conosco.) Tj
ET
endstream
endobj

xref
0 7
0000000000 65535 f 
0000000015 00000 n 
0000000068 00000 n 
0000000125 00000 n 
0000000280 00000 n 
0000000350 00000 n 
0000000420 00000 n 
trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
2800
%%EOF""".encode('latin-1', errors='ignore')
        
        filename = f"solicitacao-cotacao-{order_number}.pdf"
        logger.error(f"📄 RETORNANDO PDF: {filename}")
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
            }
        )
        
    except Exception as e:
        logger.error(f"💥 ERRO:", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")


@router.post("/orders/{order_id}/update")
async def post_update_purchase_order(
    order_id: UUID,
    order_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Atualizar pedido usando POST"""
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"=== POST UPDATE ENDPOINT SENDO CHAMADO ===")
    logger.error(f"Order ID: {order_id}")
    logger.error(f"Data recebida COMPLETA: {order_data}")
    logger.error(f"User: {current_user.email}")
    logger.error(f"User ID: {current_user.id}")
    
    try:
        service = PurchaseService()
        user_id = current_user.id
        
        logger.error(f"Items recebidos: {order_data.get('items', [])}")
        
        # Converter items para formato esperado
        items_data = []
        for i, item in enumerate(order_data.get('items', [])):
            logger.error(f"Processando item {i}: {item}")
            items_data.append({
                'product_id': str(item.get('product_id')),
                'quantity': item.get('quantity'),
                'notes': item.get('notes', '')
            })
        
        order_dict = {
            'supplier_id': str(order_data.get('supplier_id')),
            'delivery_date': order_data.get('delivery_date'),
            'payment_terms': order_data.get('payment_terms', 'a_vista'),
            'delivery_location': order_data.get('delivery_location', ''),
            'notes': order_data.get('notes', ''),
            'urgency': order_data.get('urgency', 'normal'),
            'items': items_data
        }
        
        logger.error(f"Chamando service com order_dict: {order_dict}")
        result = await service.update_purchase_order(order_id, order_dict, user_id)
        logger.error(f"=== RESULTADO DO SERVICE RETORNADO: {result} ===")
        
        return result
        
    except Exception as e:
        logger.error(f"=== ERRO CRÍTICO no endpoint POST ===", exc_info=True)
        logger.error(f"Erro detalhado: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/orders/{order_id}", response_model=APIResponse)
async def delete_purchase_order(
    order_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Excluir pedido de compra"""
    try:
        service = PurchaseService()
        return await service.delete_purchase_order(order_id, current_user.id)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders/{order_id}/send-email")
async def send_order_by_email(
    order_id: UUID,
    email_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Enviar pedido por email"""
    try:
        import logging
        logger = logging.getLogger(__name__)
        
        logger.error(f"🚀 ENDPOINT /orders/{order_id}/send-email CHAMADO!")
        logger.error(f"📧 Dados recebidos: {email_data}")
        logger.error(f"👤 Usuario: {getattr(current_user, 'email', 'N/A')}")
        
        email_address = email_data.get('email')
        if not email_address:
            logger.error("❌ Email não informado!")
            raise HTTPException(status_code=400, detail="Email é obrigatório")
        
        logger.error(f"📤 Iniciando envio para: {email_address}")
        
        service = PurchaseService()
        result = await service.send_order_by_email(order_id, email_address)
        
        logger.error(f"✅ Resultado do envio: {result.success} - {result.message}")
        
        if result.success:
            return {"success": True, "message": result.message, "data": result.data}
        else:
            logger.error(f"❌ Falha no envio: {result.message}")
            raise HTTPException(status_code=500, detail=result.message)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 ERRO GERAL EMAIL: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ===== RELATÓRIOS =====

@router.get("/reports/suppliers-performance", response_model=APIResponse)
async def get_suppliers_performance_report(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Relatório de performance dos fornecedores"""
    try:
        # Implementar lógica do relatório
        return APIResponse(
            success=True,
            data={},
            message="Relatório de fornecedores em desenvolvimento"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/purchase-orders-summary", response_model=APIResponse)
async def get_purchase_orders_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Resumo dos pedidos de compra"""
    try:
        # Implementar lógica do relatório
        return APIResponse(
            success=True,
            data={},
            message="Resumo de pedidos em desenvolvimento"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))