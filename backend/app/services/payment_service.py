from typing import Dict, Any, Optional, List
from decimal import Decimal
from enum import Enum
import uuid
from datetime import datetime, timedelta
import random

class PaymentMethod(Enum):
    PIX = "pix"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BOLETO = "boleto"
    CASH = "cash"

class PaymentStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    APPROVED = "approved"
    REFUSED = "refused"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class PaymentService:
    """Serviço para processamento de pagamentos (Mock)"""
    
    def __init__(self):
        self.processed_payments = {}  # Mock storage
    
    def process_pix_payment(self, amount: Decimal, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Processa pagamento via PIX"""
        payment_id = str(uuid.uuid4())
        
        # Simula processamento PIX instantâneo
        qr_code = self._generate_pix_qr_code(amount, payment_id)
        
        payment_data = {
            "payment_id": payment_id,
            "method": PaymentMethod.PIX.value,
            "amount": float(amount),
            "status": PaymentStatus.PENDING.value,
            "qr_code": qr_code,
            "pix_key": "empresa@erpsistema.com.br",
            "expires_at": (datetime.now() + timedelta(minutes=30)).isoformat(),
            "created_at": datetime.now().isoformat()
        }
        
        self.processed_payments[payment_id] = payment_data
        return payment_data
    
    def process_card_payment(
        self, 
        amount: Decimal, 
        card_data: Dict[str, Any], 
        installments: int = 1
    ) -> Dict[str, Any]:
        """Processa pagamento com cartão"""
        payment_id = str(uuid.uuid4())
        
        # Simula validação do cartão
        card_valid = self._validate_card(card_data)
        
        if not card_valid:
            return {
                "payment_id": payment_id,
                "status": PaymentStatus.REFUSED.value,
                "error": "Cartão inválido ou recusado"
            }
        
        # Simula taxa de aprovação de 95%
        approved = random.random() < 0.95
        
        installment_amount = amount / installments if installments > 1 else amount
        
        payment_data = {
            "payment_id": payment_id,
            "method": PaymentMethod.CREDIT_CARD.value if installments > 1 else PaymentMethod.DEBIT_CARD.value,
            "amount": float(amount),
            "installments": installments,
            "installment_amount": float(installment_amount),
            "status": PaymentStatus.APPROVED.value if approved else PaymentStatus.REFUSED.value,
            "authorization_code": f"AUTH{random.randint(100000, 999999)}" if approved else None,
            "card_last_digits": card_data.get("number", "0000")[-4:],
            "card_brand": self._detect_card_brand(card_data.get("number", "")),
            "created_at": datetime.now().isoformat()
        }
        
        self.processed_payments[payment_id] = payment_data
        return payment_data
    
    def process_boleto_payment(self, amount: Decimal, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Processa pagamento via boleto"""
        payment_id = str(uuid.uuid4())
        
        # Gera linha digitável do boleto
        barcode = self._generate_boleto_barcode(amount, payment_id)
        
        payment_data = {
            "payment_id": payment_id,
            "method": PaymentMethod.BOLETO.value,
            "amount": float(amount),
            "status": PaymentStatus.PENDING.value,
            "barcode": barcode,
            "digitable_line": self._format_digitable_line(barcode),
            "due_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
            "pdf_url": f"/boletos/{payment_id}.pdf",
            "created_at": datetime.now().isoformat()
        }
        
        self.processed_payments[payment_id] = payment_data
        return payment_data
    
    def check_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """Consulta status de um pagamento"""
        payment = self.processed_payments.get(payment_id)
        
        if not payment:
            return {"error": "Pagamento não encontrado"}
        
        # Simula mudança de status para PIX e boleto
        if payment["method"] == PaymentMethod.PIX.value and payment["status"] == PaymentStatus.PENDING.value:
            # Simula 70% de chance de aprovação após 1 minuto
            if random.random() < 0.7:
                payment["status"] = PaymentStatus.APPROVED.value
                payment["approved_at"] = datetime.now().isoformat()
        
        elif payment["method"] == PaymentMethod.BOLETO.value and payment["status"] == PaymentStatus.PENDING.value:
            # Simula pagamento de boleto após algumas horas
            if random.random() < 0.3:
                payment["status"] = PaymentStatus.APPROVED.value
                payment["approved_at"] = datetime.now().isoformat()
        
        return payment
    
    def cancel_payment(self, payment_id: str) -> Dict[str, Any]:
        """Cancela um pagamento"""
        payment = self.processed_payments.get(payment_id)
        
        if not payment:
            return {"error": "Pagamento não encontrado"}
        
        payment["status"] = PaymentStatus.CANCELLED.value
        payment["cancelled_at"] = datetime.now().isoformat()
        
        return payment
    
    def refund_payment(self, payment_id: str, amount: Optional[Decimal] = None) -> Dict[str, Any]:
        """Processa estorno de pagamento"""
        payment = self.processed_payments.get(payment_id)
        
        if not payment:
            return {"error": "Pagamento não encontrado"}
        
        if payment["status"] != PaymentStatus.APPROVED.value:
            return {"error": "Apenas pagamentos aprovados podem ser estornados"}
        
        refund_amount = amount or Decimal(str(payment["amount"]))
        
        payment["status"] = PaymentStatus.REFUNDED.value
        payment["refunded_amount"] = float(refund_amount)
        payment["refunded_at"] = datetime.now().isoformat()
        
        return payment
    
    def _generate_pix_qr_code(self, amount: Decimal, payment_id: str) -> str:
        """Gera código QR PIX mock"""
        return f"00020101021226580014BR.GOV.BCB.PIX2536empresa@erpsistema.com.br5204000053039865802BR5913ERP Sistema6009SAO PAULO62070503{payment_id[:8]}6304XXXX"
    
    def _validate_card(self, card_data: Dict[str, Any]) -> bool:
        """Valida dados do cartão (mock)"""
        number = card_data.get("number", "")
        cvv = card_data.get("cvv", "")
        
        # Validações básicas mock
        if len(number) < 13 or len(number) > 19:
            return False
        
        if len(cvv) < 3 or len(cvv) > 4:
            return False
        
        # Simula cartões de teste que sempre falham
        test_cards = ["4000000000000002", "4000000000000069"]
        if number in test_cards:
            return False
        
        return True
    
    def _detect_card_brand(self, number: str) -> str:
        """Detecta bandeira do cartão"""
        if number.startswith("4"):
            return "Visa"
        elif number.startswith("5") or number.startswith("2"):
            return "Mastercard"
        elif number.startswith("3"):
            return "American Express"
        elif number.startswith("6"):
            return "Discover"
        else:
            return "Outras"
    
    def _generate_boleto_barcode(self, amount: Decimal, payment_id: str) -> str:
        """Gera código de barras do boleto"""
        # Formato simplificado: banco + moeda + DV + vencimento + valor
        bank_code = "033"  # Santander
        currency = "9"     # Real
        
        # Data de vencimento em dias desde 07/10/1997
        due_date = (datetime.now() + timedelta(days=3))
        days_since_base = (due_date - datetime(1997, 10, 7)).days
        
        # Valor em centavos (10 dígitos)
        amount_cents = f"{int(amount * 100):010d}"
        
        # Código do cedente + nosso número (simplificado)
        cedente = "1234567"
        our_number = payment_id[:8]
        
        barcode = f"{bank_code}{currency}0{days_since_base:04d}{amount_cents}{cedente}{our_number}"
        return barcode
    
    def _format_digitable_line(self, barcode: str) -> str:
        """Formata linha digitável do boleto"""
        # Simplificado - em produção usaria algoritmo específico
        return f"{barcode[:5]}.{barcode[5:10]} {barcode[10:15]}.{barcode[15:21]} {barcode[21:26]}.{barcode[26:32]} {barcode[32]} {barcode[33:]}"
    
    def get_payment_methods(self) -> List[Dict[str, Any]]:
        """Retorna métodos de pagamento disponíveis"""
        return [
            {
                "method": PaymentMethod.PIX.value,
                "name": "PIX",
                "description": "Pagamento instantâneo via PIX",
                "fee_percentage": 0.0,
                "max_installments": 1
            },
            {
                "method": PaymentMethod.DEBIT_CARD.value,
                "name": "Cartão de Débito",
                "description": "Débito em conta corrente",
                "fee_percentage": 2.5,
                "max_installments": 1
            },
            {
                "method": PaymentMethod.CREDIT_CARD.value,
                "name": "Cartão de Crédito",
                "description": "Parcelamento em até 12x",
                "fee_percentage": 3.5,
                "max_installments": 12
            },
            {
                "method": PaymentMethod.BOLETO.value,
                "name": "Boleto Bancário",
                "description": "Vencimento em 3 dias úteis",
                "fee_percentage": 2.0,
                "max_installments": 1
            }
        ]