#!/usr/bin/env python3
"""
Script para testar a correção do erro de pagamento em dinheiro
"""

import requests
import json
import uuid

def test_payment_flow():
    """Testa o fluxo de pagamento em dinheiro"""
    
    API_BASE = "http://localhost:8000"
    
    # Dados de teste para venda rápida
    test_sale_data = {
        "customer": None,  # Cliente avulso
        "items": [
            {
                "id": str(uuid.uuid4()),  # UUID de teste
                "name": "Produto Teste",
                "barcode": "1234567890123",
                "price": 10.50,
                "stock": 100,
                "quantity": 2
            },
            {
                "id": str(uuid.uuid4()),  # Outro UUID de teste
                "name": "Produto Teste 2",
                "barcode": "1234567890124", 
                "price": 25.00,
                "stock": 50,
                "quantity": 1
            }
        ],
        "subtotal": 46.00,
        "discount": 0,
        "total": 46.00
    }
    
    print("TESTANDO PAGAMENTO EM DINHEIRO")
    print("=" * 40)
    
    try:
        # Teste 1: Processar venda rápida
        print("\n1. Testando processamento de venda...")
        response = requests.post(
            f"{API_BASE}/quick-sales/quick-sale",
            json=test_sale_data,
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Venda processada com sucesso!")
            print(f"Sale ID: {data.get('data', {}).get('sale_id')}")
            print(f"Order Number: {data.get('data', {}).get('order_number')}")
            print(f"Total: R$ {data.get('data', {}).get('total_amount')}")
        else:
            print("❌ Erro no processamento:")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
    
    # Teste 2: Verificar produtos criados
    print("\n2. Testando criação de produtos temporários...")
    try:
        response = requests.get(f"{API_BASE}/products/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            products = data.get('products', [])
            temp_products = [p for p in products if 'temporário' in p.get('description', '')]
            print(f"✅ Produtos temporários criados: {len(temp_products)}")
        else:
            print(f"❌ Erro ao verificar produtos: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro ao verificar produtos: {e}")
    
    # Teste 3: Verificar vendas recentes
    print("\n3. Testando vendas recentes...")
    try:
        response = requests.get(f"{API_BASE}/quick-sales/recent", timeout=5)
        if response.status_code == 200:
            data = response.json()
            sales = data.get('data', [])
            print(f"✅ Vendas recentes encontradas: {len(sales)}")
            if sales:
                latest = sales[0]
                print(f"Última venda: {latest.get('number')} - R$ {latest.get('total_amount')}")
        else:
            print(f"❌ Erro ao verificar vendas: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro ao verificar vendas: {e}")

def test_real_product_sale():
    """Testa venda com produto real se existir"""
    print("\n4. Testando venda com produto real...")
    
    API_BASE = "http://localhost:8000"
    
    try:
        # Buscar um produto real
        response = requests.get(f"{API_BASE}/products/?limit=1", timeout=5)
        if response.status_code == 200:
            data = response.json()
            products = data.get('products', [])
            
            if products:
                real_product = products[0]
                print(f"✅ Produto real encontrado: {real_product['name']}")
                
                # Criar venda com produto real
                real_sale_data = {
                    "customer": None,
                    "items": [{
                        "id": real_product['id'],
                        "name": real_product['name'],
                        "barcode": real_product['barcode'],
                        "price": float(real_product['sale_price']),
                        "stock": int(real_product['stock_quantity']),
                        "quantity": 1
                    }],
                    "subtotal": float(real_product['sale_price']),
                    "discount": 0,
                    "total": float(real_product['sale_price'])
                }
                
                response = requests.post(
                    f"{API_BASE}/quick-sales/quick-sale",
                    json=real_sale_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    print("✅ Venda com produto real processada!")
                else:
                    print(f"❌ Erro na venda real: {response.status_code}")
                    print(response.text)
            else:
                print("ℹ️ Nenhum produto real encontrado")
    except Exception as e:
        print(f"❌ Erro no teste com produto real: {e}")

if __name__ == "__main__":
    test_payment_flow()
    test_real_product_sale()
    
    print("\n" + "=" * 40)
    print("TESTES CONCLUÍDOS!")
    print("\nPara testar manualmente:")
    print("1. Acesse http://localhost:3000")
    print("2. Vá para Vendas > Venda Rápida")
    print("3. Adicione produtos ao carrinho")
    print("4. Clique no botão 'Dinheiro'")
    print("5. Verifique se não há mais erro de UUID")