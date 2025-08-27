from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Tuple
from app.models.product import Product
from app.models.client import Client
from app.schemas.sale_order import TaxCalculation


class TaxCalculatorService:
    """
    Serviço para cálculo de impostos (ICMS, PIS, COFINS)
    
    Implementa as regras básicas de tributação brasileira.
    Para casos mais complexos, pode ser expandido com integração
    a serviços especializados como AvaTax ou similar.
    """
    
    def __init__(self):
        # Alíquotas padrão - podem ser configuráveis no futuro
        self.default_rates = {
            'icms': Decimal('18.00'),  # 18% ICMS padrão SP
            'pis': Decimal('1.65'),    # 1.65% PIS
            'cofins': Decimal('7.60')  # 7.60% COFINS
        }
    
    def calculate_item_taxes(
        self, 
        product: Product,
        quantity: Decimal,
        unit_price: Decimal,
        discount_amount: Decimal = Decimal('0'),
        client: Client = None
    ) -> TaxCalculation:
        """
        Calcula impostos para um item específico do pedido
        
        Args:
            product: Produto
            quantity: Quantidade
            unit_price: Preço unitário
            discount_amount: Desconto aplicado
            client: Cliente (para regras específicas)
            
        Returns:
            TaxCalculation com os valores calculados
        """
        # Calcular base de cálculo (valor líquido do item)
        gross_amount = quantity * unit_price
        net_amount = gross_amount - discount_amount
        
        # Obter alíquotas do produto ou usar padrão
        icms_rate = self._get_icms_rate(product, client)
        pis_rate = self._get_pis_rate(product)
        cofins_rate = self._get_cofins_rate(product)
        
        # Calcular valores dos impostos
        icms_amount = self._calculate_tax_amount(net_amount, icms_rate)
        pis_amount = self._calculate_tax_amount(net_amount, pis_rate)
        cofins_amount = self._calculate_tax_amount(net_amount, cofins_rate)
        
        total_tax = icms_amount + pis_amount + cofins_amount
        
        return TaxCalculation(
            icms_rate=icms_rate,
            pis_rate=pis_rate,
            cofins_rate=cofins_rate,
            icms_amount=icms_amount,
            pis_amount=pis_amount,
            cofins_amount=cofins_amount,
            total_tax=total_tax
        )
    
    def calculate_order_taxes(
        self,
        items_data: List[Dict],
        client: Client = None
    ) -> Dict[str, Decimal]:
        """
        Calcula impostos totais do pedido
        
        Args:
            items_data: Lista com dados dos itens [{'product', 'quantity', 'unit_price', 'discount_amount'}]
            client: Cliente
            
        Returns:
            Dict com totais por tipo de imposto
        """
        total_icms = Decimal('0')
        total_pis = Decimal('0')
        total_cofins = Decimal('0')
        
        for item_data in items_data:
            tax_calc = self.calculate_item_taxes(
                product=item_data['product'],
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price'],
                discount_amount=item_data.get('discount_amount', Decimal('0')),
                client=client
            )
            
            total_icms += tax_calc.icms_amount
            total_pis += tax_calc.pis_amount
            total_cofins += tax_calc.cofins_amount
        
        return {
            'icms_total': total_icms,
            'pis_total': total_pis,
            'cofins_total': total_cofins,
            'tax_total': total_icms + total_pis + total_cofins
        }
    
    def _get_icms_rate(self, product: Product, client: Client = None) -> Decimal:
        """Determina alíquota de ICMS baseada no produto e cliente"""
        
        # Se o produto tem alíquota específica, usar ela
        if product.icms_rate and product.icms_rate > 0:
            return product.icms_rate
        
        # Regras específicas por NCM (podem ser expandidas)
        if product.ncm:
            # Exemplo: Alguns NCMs têm alíquotas reduzidas
            reduced_icms_ncms = [
                '84152010',  # Ar condicionado - 12%
                '85287290',  # Televisores - 12%
            ]
            
            if product.ncm in reduced_icms_ncms:
                return Decimal('12.00')
        
        # ICMS interestadual vs interno (simplificado)
        if client and client.state and client.state != 'SP':
            # Alíquota interestadual (varia por estado de destino)
            interstate_rates = {
                'RJ': Decimal('12.00'),
                'MG': Decimal('12.00'),
                'RS': Decimal('12.00'),
                'PR': Decimal('12.00'),
                'SC': Decimal('12.00'),
            }
            return interstate_rates.get(client.state, Decimal('7.00'))  # 7% para demais estados
        
        # ICMS interno SP - alíquota padrão
        return self.default_rates['icms']
    
    def _get_pis_rate(self, product: Product) -> Decimal:
        """Determina alíquota de PIS"""
        
        # Se o produto tem alíquota específica, usar ela
        if product.pis_rate and product.pis_rate > 0:
            return product.pis_rate
            
        # Produtos com PIS zero (lista pode ser expandida)
        if product.cst in ['06', '07', '08', '09']:  # CSTs de PIS sem cobrança
            return Decimal('0')
            
        return self.default_rates['pis']
    
    def _get_cofins_rate(self, product: Product) -> Decimal:
        """Determina alíquota de COFINS"""
        
        # Se o produto tem alíquota específica, usar ela
        if product.cofins_rate and product.cofins_rate > 0:
            return product.cofins_rate
            
        # Produtos com COFINS zero (lista pode ser expandida)  
        if product.cst in ['06', '07', '08', '09']:  # CSTs de COFINS sem cobrança
            return Decimal('0')
            
        return self.default_rates['cofins']
    
    def _calculate_tax_amount(self, base_amount: Decimal, rate: Decimal) -> Decimal:
        """
        Calcula valor do imposto com arredondamento correto
        
        Args:
            base_amount: Base de cálculo
            rate: Alíquota percentual
            
        Returns:
            Valor do imposto arredondado
        """
        if rate == 0:
            return Decimal('0')
            
        tax_amount = base_amount * (rate / Decimal('100'))
        # Arredondar para 2 casas decimais usando ROUND_HALF_UP
        return tax_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def get_tax_simulation(
        self,
        product: Product,
        quantity: Decimal,
        unit_price: Decimal,
        client: Client = None
    ) -> Dict:
        """
        Simula cálculo de impostos para exibição na interface
        
        Returns:
            Dict com simulação detalhada dos impostos
        """
        tax_calc = self.calculate_item_taxes(product, quantity, unit_price, client=client)
        
        gross_amount = quantity * unit_price
        net_amount_after_taxes = gross_amount - tax_calc.total_tax
        
        return {
            'gross_amount': gross_amount,
            'taxes': {
                'icms': {
                    'rate': tax_calc.icms_rate,
                    'amount': tax_calc.icms_amount
                },
                'pis': {
                    'rate': tax_calc.pis_rate,
                    'amount': tax_calc.pis_amount
                },
                'cofins': {
                    'rate': tax_calc.cofins_rate,
                    'amount': tax_calc.cofins_amount
                }
            },
            'total_taxes': tax_calc.total_tax,
            'net_amount': net_amount_after_taxes,
            'effective_tax_rate': (tax_calc.total_tax / gross_amount * Decimal('100')) if gross_amount > 0 else Decimal('0')
        }