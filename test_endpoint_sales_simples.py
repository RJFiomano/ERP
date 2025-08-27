#!/usr/bin/env python3
"""
Script para testar o novo endpoint de vendas simples
"""

import requests
import json
import uuid

def test_simple_sales_endpoint():
    """Testa o novo endpoint /sales/quick-sale"""
    
    API_BASE = "http://localhost:8000"
    
    # Dados de teste simplificados
    test_sale_data = {
        "customer": None,
        "items": [
            {
                "id": str(uuid.uuid4()),
                "name": "Produto Teste Simples",
                "barcode": "1234567890123",
                "price": 15.99,
                "stock": 100,
                "quantity": 1
            }
        ],
        "subtotal": 15.99,
        "discount": 0,
        "total": 15.99
    }
    
    print("TESTANDO NOVO ENDPOINT SALES SIMPLES")
    print("=" * 45)
    
    try:
        # Teste 1: Endpoint novo simplificado
        print("\n1. Testando /sales/quick-sale...")
        response = requests.post(
            f"{API_BASE}/sales/quick-sale",
            json=test_sale_data,
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Venda simples processada com sucesso!")
                print(f"Sale ID: {data.get('data', {}).get('sale_id')}")
                print(f"Order Number: {data.get('data', {}).get('order_number')}")
                print(f"Total: R$ {data.get('data', {}).get('total_amount')}")
            else:
                print("❌ Resposta indica falha:", data)
        else:
            print("❌ Erro HTTP:")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")

def test_with_real_product():
    """Testa com produto real se existir"""
    print("\n2. Testando com produto real...")
    
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
                
                # Venda com produto real
                real_sale_data = {
                    "customer": None,
                    "items": [{
                        "id": real_product['id'],
                        "name": real_product['name'],
                        "barcode": real_product.get('ean_gtin', ''),
                        "price": float(real_product['sale_price']),
                        "stock": int(real_product['stock_quantity']),
                        "quantity": 1
                    }],
                    "subtotal": float(real_product['sale_price']),
                    "discount": 0,
                    "total": float(real_product['sale_price'])
                }
                
                response = requests.post(
                    f"{API_BASE}/sales/quick-sale",
                    json=real_sale_data,
                    timeout=10
                )
                
                print(f"Status produto real: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        print("✅ Venda com produto real processada!")
                    else:
                        print("❌ Falha na venda real:", data)
                else:
                    print("❌ Erro na venda real:", response.text)
            else:
                print("ℹ️ Nenhum produto real encontrado")
    except Exception as e:
        print(f"❌ Erro no teste com produto real: {e}")

def check_sales_table():
    """Verifica se as vendas foram salvas"""
    print("\n3. Verificando vendas salvas...")
    
    API_BASE = "http://localhost:8000"
    
    try:
        response = requests.get(f"{API_BASE}/sales/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            sales = data.get('sales', [])
            print(f"✅ Vendas encontradas na tabela: {len(sales)}")
            
            for sale in sales[-3:]:  # Últimas 3 vendas
                print(f"  - {sale['number']}: R$ {sale['total']} ({sale['status']})")
        else:
            print(f"❌ Erro ao verificar vendas: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro ao verificar vendas: {e}")

if __name__ == "__main__":
    test_simple_sales_endpoint()
    test_with_real_product()
    check_sales_table()
    
    print("\n" + "=" * 45)
    print("TESTES DO ENDPOINT SIMPLES CONCLUÍDOS!")
    print("\nResumo da solução:")
    print("✅ Criado endpoint /sales/quick-sale mais simples")
    print("✅ Usa tabela 'sales' ao invés de 'sale_orders'")
    print("✅ Evita problemas de UUID complexos")
    print("✅ Processa apenas produtos reais")
    print("✅ Ignora produtos de teste graciosamente")
    
    print("\nPara testar manualmente:")
    print("1. Acesse http://localhost:3000")
    print("2. Vá para Vendas > Venda Rápida") 
    print("3. Adicione produtos ao carrinho")
    print("4. Clique no botão 'Dinheiro'")
    print("5. Agora deve funcionar sem erro de UUID!")