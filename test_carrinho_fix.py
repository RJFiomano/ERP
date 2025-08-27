#!/usr/bin/env python3
"""
Script simples para testar a correção do carrinho de vendas
"""

import requests
import json

def test_products_api():
    """Testa se a API de produtos está funcionando"""
    try:
        # Testar busca de produtos
        response = requests.get("http://localhost:8000/products/", timeout=5)
        print(f"Status produtos: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            products = data.get('products', [])
            print(f"Produtos encontrados: {len(products)}")
            
            # Mostrar alguns produtos
            for i, product in enumerate(products[:3]):
                print(f"  {i+1}. {product.get('name')} - {product.get('barcode')} - R$ {product.get('sale_price', 0)}")
        else:
            print("Erro na API de produtos")
            
    except Exception as e:
        print(f"Erro ao testar produtos: {e}")

def test_quick_sales_api():
    """Testa endpoints de vendas rápidas"""
    try:
        # Testar vendas recentes
        response = requests.get("http://localhost:8000/quick-sales/recent", timeout=5)
        print(f"Status vendas recentes: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            sales = data.get('data', [])
            print(f"Vendas recentes: {len(sales)}")
        
        # Testar estatísticas
        response = requests.get("http://localhost:8000/quick-sales/stats/today", timeout=5)
        print(f"Status estatísticas: {response.status_code}")
        
    except Exception as e:
        print(f"Erro ao testar vendas: {e}")

def main():
    print("TESTANDO CORRECOES DO CARRINHO")
    print("=" * 40)
    
    print("\n1. Testando API de produtos...")
    test_products_api()
    
    print("\n2. Testando API de vendas...")
    test_quick_sales_api()
    
    print("\n3. Instruções para teste manual:")
    print("   - Abra http://localhost:3000")
    print("   - Vá para Vendas > Venda Rápida")
    print("   - Adicione múltiplos produtos diferentes")
    print("   - Verifique se aparecem na lista do carrinho")
    print("   - Abra F12 para ver os logs de debug")
    
    print("\nCORRECOES IMPLEMENTADAS:")
    print("- Key única para itens do carrinho")
    print("- Identificação por ID + barcode")
    print("- Logs de debug adicionados")
    print("- Funções de atualização melhoradas")

if __name__ == "__main__":
    main()