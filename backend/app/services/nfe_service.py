from typing import Dict, Any, Optional
from decimal import Decimal
import uuid
from datetime import datetime
from app.models.sale_order import SaleOrder
from app.services.tax_calculator import TaxCalculatorService

class NFEService:
    """Serviço para emissão de Nota Fiscal Eletrônica (Mock)"""
    
    def __init__(self):
        self.tax_calculator = TaxCalculatorService()
    
    def generate_nfe(self, sale_order: SaleOrder, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Gera uma NF-e mock baseada no pedido de venda"""
        
        nfe_number = self._generate_nfe_number()
        
        # Dados do emitente (empresa)
        emitente = {
            "cnpj": "12.345.678/0001-90",
            "inscricao_estadual": "123.456.789.012",
            "razao_social": "Empresa ERP LTDA",
            "nome_fantasia": "ERP Sistema",
            "endereco": {
                "logradouro": "Rua das Empresas, 123",
                "bairro": "Centro",
                "municipio": "São Paulo",
                "uf": "SP",
                "cep": "01234-567"
            }
        }
        
        # Dados do destinatário
        destinatario = {
            "cpf_cnpj": customer_data.get("document", ""),
            "nome": customer_data.get("name", ""),
            "endereco": customer_data.get("address", {})
        }
        
        # Itens da nota
        items = []
        for item in sale_order.items:
            nfe_item = {
                "codigo": str(item.product_id),
                "descricao": f"Produto {item.product_id}",
                "quantidade": float(item.quantity),
                "valor_unitario": float(item.unit_price),
                "valor_total": float(item.net_total),
                "tributos": {
                    "icms": {
                        "aliquota": float(item.icms_rate),
                        "valor": float(item.icms_amount)
                    },
                    "pis": {
                        "aliquota": float(item.pis_rate),
                        "valor": float(item.pis_amount)
                    },
                    "cofins": {
                        "aliquota": float(item.cofins_rate),
                        "valor": float(item.cofins_amount)
                    }
                }
            }
            items.append(nfe_item)
        
        # Totais
        totals = {
            "valor_produtos": float(sale_order.subtotal),
            "valor_desconto": float(sale_order.discount_amount),
            "valor_icms": float(sale_order.icms_total),
            "valor_pis": float(sale_order.pis_total),
            "valor_cofins": float(sale_order.cofins_total),
            "valor_total_tributos": float(sale_order.tax_total),
            "valor_total_nota": float(sale_order.total_amount)
        }
        
        nfe_data = {
            "numero": nfe_number,
            "serie": "001",
            "data_emissao": datetime.now().isoformat(),
            "tipo": "1",  # Saída
            "modelo": "55",  # NFe
            "chave_acesso": self._generate_access_key(),
            "emitente": emitente,
            "destinatario": destinatario,
            "items": items,
            "totais": totals,
            "status": "autorizada",
            "protocolo": f"135{nfe_number}0012345678901234567890",
            "xml_path": f"/nfe/xml/{nfe_number}.xml",
            "pdf_path": f"/nfe/pdf/{nfe_number}.pdf"
        }
        
        return nfe_data
    
    def _generate_nfe_number(self) -> str:
        """Gera um número sequencial de NF-e"""
        # Em um ambiente real, isso seria um contador em banco de dados
        return f"{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:4].upper()}"
    
    def _generate_access_key(self) -> str:
        """Gera uma chave de acesso mock para a NF-e"""
        # Formato: AAMMDDHHMMSSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
        timestamp = datetime.now().strftime("%y%m%d%H%M%S")
        random_part = uuid.uuid4().hex[:32].upper()
        return f"{timestamp}{random_part}"
    
    def cancel_nfe(self, nfe_number: str, reason: str) -> Dict[str, Any]:
        """Cancela uma NF-e (Mock)"""
        return {
            "numero": nfe_number,
            "status": "cancelada",
            "motivo": reason,
            "data_cancelamento": datetime.now().isoformat(),
            "protocolo_cancelamento": f"135{nfe_number}CANCEL123456789"
        }
    
    def consult_nfe_status(self, access_key: str) -> Dict[str, Any]:
        """Consulta o status de uma NF-e na SEFAZ (Mock)"""
        return {
            "chave_acesso": access_key,
            "status": "autorizada",
            "protocolo": f"135{access_key[:8]}STATUS123456789",
            "data_consulta": datetime.now().isoformat(),
            "situacao": "100 - Autorizado o uso da NF-e"
        }