from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional, Dict
from decimal import Decimal
from datetime import datetime
from app.models.sale_order import SaleOrder, SaleOrderItem, SaleOrderStatus
from app.models.product import Product
from app.models.client import Client
from app.schemas.sale_order import SaleOrderCreate, SaleOrderUpdate, SaleOrderStatusUpdate
from app.services.tax_calculator import TaxCalculatorService
from fastapi import HTTPException


class SaleOrderService:
    """
    Serviço para gerenciamento de pedidos de venda
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.tax_calculator = TaxCalculatorService()
    
    def create_order(self, order_data: SaleOrderCreate) -> SaleOrder:
        """Cria um novo pedido de venda com cálculo automático de impostos e totais"""
        
        # Verificar se cliente existe
        client = self.db.query(Client).filter(Client.id == order_data.client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Gerar número sequencial do pedido
        order_number = self._generate_order_number()
        
        # Criar pedido
        sale_order = SaleOrder(
            number=order_number,
            client_id=order_data.client_id,
            delivery_date=order_data.delivery_date,
            payment_method=order_data.payment_method,
            discount_percent=order_data.discount_percent or Decimal('0'),
            discount_amount=order_data.discount_amount or Decimal('0'),
            notes=order_data.notes,
            internal_notes=order_data.internal_notes,
            delivery_address=order_data.delivery_address,
            seller_name=order_data.seller_name,
            status=SaleOrderStatus.DRAFT
        )
        
        self.db.add(sale_order)
        self.db.flush()  # Para obter o ID do pedido
        
        # Processar itens
        subtotal = Decimal('0')
        total_icms = Decimal('0')
        total_pis = Decimal('0')
        total_cofins = Decimal('0')
        
        for item_data in order_data.items:
            # Verificar se produto existe e tem estoque
            product = self.db.query(Product).filter(Product.id == item_data.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Produto {item_data.product_id} não encontrado")
            
            if not product.is_active:
                raise HTTPException(status_code=400, detail=f"Produto {product.name} está inativo")
            
            # Verificar estoque disponível
            if product.stock_quantity < item_data.quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Estoque insuficiente para {product.name}. Disponível: {product.stock_quantity}"
                )
            
            # Calcular valores do item
            gross_total = item_data.quantity * item_data.unit_price
            discount_amount = item_data.discount_amount or Decimal('0')
            net_total = gross_total - discount_amount
            
            # Calcular impostos do item
            tax_calc = self.tax_calculator.calculate_item_taxes(
                product=product,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                discount_amount=discount_amount,
                client=client
            )
            
            # Criar item do pedido
            order_item = SaleOrderItem(
                sale_order_id=sale_order.id,
                product_id=item_data.product_id,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                discount_percent=item_data.discount_percent or Decimal('0'),
                discount_amount=discount_amount,
                gross_total=gross_total,
                net_total=net_total,
                icms_rate=tax_calc.icms_rate,
                pis_rate=tax_calc.pis_rate,
                cofins_rate=tax_calc.cofins_rate,
                icms_amount=tax_calc.icms_amount,
                pis_amount=tax_calc.pis_amount,
                cofins_amount=tax_calc.cofins_amount
            )
            
            self.db.add(order_item)
            
            # Somar aos totais
            subtotal += net_total
            total_icms += tax_calc.icms_amount
            total_pis += tax_calc.pis_amount
            total_cofins += tax_calc.cofins_amount
        
        # Aplicar desconto geral se houver
        if order_data.discount_percent and order_data.discount_percent > 0:
            additional_discount = subtotal * (order_data.discount_percent / Decimal('100'))
            subtotal -= additional_discount
        
        # Atualizar totais do pedido
        tax_total = total_icms + total_pis + total_cofins
        total_amount = subtotal + tax_total
        
        sale_order.subtotal = subtotal
        sale_order.icms_total = total_icms
        sale_order.pis_total = total_pis
        sale_order.cofins_total = total_cofins
        sale_order.tax_total = tax_total
        sale_order.total_amount = total_amount
        
        self.db.commit()
        self.db.refresh(sale_order)
        
        return sale_order
    
    def get_order(self, order_id: str) -> Optional[SaleOrder]:
        """Busca pedido por ID"""
        return self.db.query(SaleOrder).filter(
            and_(SaleOrder.id == order_id, SaleOrder.is_active == True)
        ).first()
    
    def get_orders(
        self, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[SaleOrderStatus] = None,
        client_id: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[SaleOrder]:
        """Lista pedidos com filtros"""
        
        query = self.db.query(SaleOrder).filter(SaleOrder.is_active == True)
        
        if status:
            query = query.filter(SaleOrder.status == status)
        
        if client_id:
            query = query.filter(SaleOrder.client_id == client_id)
        
        if search:
            search_filter = f"%{search}%"
            query = query.join(Client).filter(
                SaleOrder.number.ilike(search_filter) |
                Client.name.ilike(search_filter) |
                Client.document.ilike(search_filter)
            )
        
        return query.order_by(SaleOrder.created_at.desc()).offset(skip).limit(limit).all()
    
    def update_order(self, order_id: str, order_data: SaleOrderUpdate) -> SaleOrder:
        """Atualiza pedido (apenas se estiver em rascunho)"""
        
        order = self.get_order(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Pedido não encontrado")
        
        if order.status != SaleOrderStatus.DRAFT:
            raise HTTPException(status_code=400, detail="Apenas pedidos em rascunho podem ser editados")
        
        # Atualizar campos básicos
        if order_data.client_id:
            client = self.db.query(Client).filter(Client.id == order_data.client_id).first()
            if not client:
                raise HTTPException(status_code=404, detail="Cliente não encontrado")
            order.client_id = order_data.client_id
        
        if order_data.delivery_date is not None:
            order.delivery_date = order_data.delivery_date
        
        if order_data.payment_method:
            order.payment_method = order_data.payment_method
        
        if order_data.discount_percent is not None:
            order.discount_percent = order_data.discount_percent
        
        if order_data.discount_amount is not None:
            order.discount_amount = order_data.discount_amount
        
        if order_data.notes is not None:
            order.notes = order_data.notes
        
        if order_data.internal_notes is not None:
            order.internal_notes = order_data.internal_notes
        
        if order_data.delivery_address is not None:
            order.delivery_address = order_data.delivery_address
        
        if order_data.seller_name is not None:
            order.seller_name = order_data.seller_name
        
        # Se foram enviados novos itens, recriar todos
        if order_data.items is not None:
            # Remover itens existentes
            self.db.query(SaleOrderItem).filter(SaleOrderItem.sale_order_id == order.id).delete()
            
            # Recriar itens (reutilizar lógica do create)
            client = self.db.query(Client).filter(Client.id == order.client_id).first()
            
            subtotal = Decimal('0')
            total_icms = Decimal('0')
            total_pis = Decimal('0')
            total_cofins = Decimal('0')
            
            for item_data in order_data.items:
                product = self.db.query(Product).filter(Product.id == item_data.product_id).first()
                if not product:
                    raise HTTPException(status_code=404, detail=f"Produto {item_data.product_id} não encontrado")
                
                if product.stock_quantity < item_data.quantity:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Estoque insuficiente para {product.name}. Disponível: {product.stock_quantity}"
                    )
                
                # Calcular valores e impostos (mesmo código do create)
                gross_total = item_data.quantity * item_data.unit_price
                discount_amount = item_data.discount_amount or Decimal('0')
                net_total = gross_total - discount_amount
                
                tax_calc = self.tax_calculator.calculate_item_taxes(
                    product=product,
                    quantity=item_data.quantity,
                    unit_price=item_data.unit_price,
                    discount_amount=discount_amount,
                    client=client
                )
                
                order_item = SaleOrderItem(
                    sale_order_id=order.id,
                    product_id=item_data.product_id,
                    quantity=item_data.quantity,
                    unit_price=item_data.unit_price,
                    discount_percent=item_data.discount_percent or Decimal('0'),
                    discount_amount=discount_amount,
                    gross_total=gross_total,
                    net_total=net_total,
                    icms_rate=tax_calc.icms_rate,
                    pis_rate=tax_calc.pis_rate,
                    cofins_rate=tax_calc.cofins_rate,
                    icms_amount=tax_calc.icms_amount,
                    pis_amount=tax_calc.pis_amount,
                    cofins_amount=tax_calc.cofins_amount
                )
                
                self.db.add(order_item)
                
                subtotal += net_total
                total_icms += tax_calc.icms_amount
                total_pis += tax_calc.pis_amount
                total_cofins += tax_calc.cofins_amount
            
            # Aplicar desconto geral
            if order.discount_percent and order.discount_percent > 0:
                additional_discount = subtotal * (order.discount_percent / Decimal('100'))
                subtotal -= additional_discount
            
            # Atualizar totais
            tax_total = total_icms + total_pis + total_cofins
            order.subtotal = subtotal
            order.icms_total = total_icms
            order.pis_total = total_pis
            order.cofins_total = total_cofins
            order.tax_total = tax_total
            order.total_amount = subtotal + tax_total
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def update_order_status(self, order_id: str, status_data: SaleOrderStatusUpdate) -> SaleOrder:
        """Atualiza status do pedido com validações e baixa de estoque"""
        
        order = self.get_order(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Pedido não encontrado")
        
        # Validar transição de status
        if not self._is_valid_status_transition(order.status, status_data.status):
            raise HTTPException(
                status_code=400, 
                detail=f"Transição inválida: {order.status.value} → {status_data.status.value}"
            )
        
        old_status = order.status
        order.status = status_data.status
        
        # Executar ações baseadas no novo status
        if status_data.status == SaleOrderStatus.CONFIRMED and old_status == SaleOrderStatus.DRAFT:
            self._reserve_stock(order)
        
        elif status_data.status == SaleOrderStatus.INVOICED and old_status == SaleOrderStatus.CONFIRMED:
            self._process_stock_movement(order)
        
        elif status_data.status == SaleOrderStatus.CANCELLED:
            if old_status == SaleOrderStatus.CONFIRMED:
                self._release_stock_reservation(order)
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def delete_order(self, order_id: str) -> bool:
        """Soft delete do pedido (apenas se estiver em rascunho)"""
        
        order = self.get_order(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Pedido não encontrado")
        
        if order.status != SaleOrderStatus.DRAFT:
            raise HTTPException(status_code=400, detail="Apenas pedidos em rascunho podem ser excluídos")
        
        order.is_active = False
        self.db.commit()
        
        return True
    
    def _generate_order_number(self) -> str:
        """Gera número sequencial do pedido"""
        
        # Obter o maior número atual
        last_order = self.db.query(SaleOrder).order_by(SaleOrder.created_at.desc()).first()
        
        if last_order and last_order.number.startswith('PV'):
            try:
                last_number = int(last_order.number[2:])  # Remove 'PV' do início
                next_number = last_number + 1
            except ValueError:
                next_number = 1
        else:
            next_number = 1
        
        return f"PV{next_number:06d}"  # PV000001, PV000002, etc.
    
    def _is_valid_status_transition(self, current: SaleOrderStatus, new: SaleOrderStatus) -> bool:
        """Valida se a transição de status é permitida"""
        
        valid_transitions = {
            SaleOrderStatus.DRAFT: [SaleOrderStatus.CONFIRMED, SaleOrderStatus.CANCELLED],
            SaleOrderStatus.CONFIRMED: [SaleOrderStatus.INVOICED, SaleOrderStatus.CANCELLED],
            SaleOrderStatus.INVOICED: [SaleOrderStatus.CANCELLED],
            SaleOrderStatus.CANCELLED: []  # Status final
        }
        
        return new in valid_transitions.get(current, [])
    
    def _reserve_stock(self, order: SaleOrder):
        """Reserva estoque quando pedido é confirmado"""
        # Por enquanto não implementamos reserva separada
        # O estoque é verificado no momento da criação/edição
        pass
    
    def _process_stock_movement(self, order: SaleOrder):
        """Processa baixa no estoque quando pedido é faturado"""
        
        for item in order.items:
            product = self.db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                # Verificar se ainda tem estoque suficiente
                if product.stock_quantity < item.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Estoque insuficiente para {product.name}. Disponível: {product.stock_quantity}"
                    )
                
                # Baixar estoque
                product.stock_quantity -= int(item.quantity)
                
                # TODO: Criar movimentação de estoque para auditoria
                # stock_movement = StockMovement(
                #     product_id=product.id,
                #     movement_type="sale",
                #     quantity=-item.quantity,
                #     reference_id=order.id,
                #     notes=f"Venda - Pedido {order.number}"
                # )
        
        self.db.commit()
    
    def _release_stock_reservation(self, order: SaleOrder):
        """Libera reserva de estoque quando pedido confirmado é cancelado"""
        # Por enquanto não implementamos reserva separada
        pass
    
    def get_order_stats(self) -> Dict:
        """Retorna estatísticas dos pedidos"""
        
        total_orders = self.db.query(func.count(SaleOrder.id)).filter(SaleOrder.is_active == True).scalar()
        
        total_value = self.db.query(func.sum(SaleOrder.total_amount)).filter(
            and_(SaleOrder.is_active == True, SaleOrder.status != SaleOrderStatus.CANCELLED)
        ).scalar() or Decimal('0')
        
        # Pedidos por status
        orders_by_status = {}
        for status in SaleOrderStatus:
            count = self.db.query(func.count(SaleOrder.id)).filter(
                and_(SaleOrder.status == status, SaleOrder.is_active == True)
            ).scalar()
            orders_by_status[status.value] = count
        
        # Média do valor dos pedidos
        avg_order_value = total_value / total_orders if total_orders > 0 else Decimal('0')
        
        # Pedidos este mês
        current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        orders_this_month = self.db.query(func.count(SaleOrder.id)).filter(
            and_(
                SaleOrder.created_at >= current_month,
                SaleOrder.is_active == True
            )
        ).scalar()
        
        value_this_month = self.db.query(func.sum(SaleOrder.total_amount)).filter(
            and_(
                SaleOrder.created_at >= current_month,
                SaleOrder.is_active == True,
                SaleOrder.status != SaleOrderStatus.CANCELLED
            )
        ).scalar() or Decimal('0')
        
        return {
            'total_orders': total_orders,
            'total_value': total_value,
            'orders_by_status': orders_by_status,
            'avg_order_value': avg_order_value,
            'orders_this_month': orders_this_month,
            'value_this_month': value_this_month
        }