#!/usr/bin/env python3

import requests
import json

# Configurações
API_BASE = "http://localhost:8000"
LOGIN_DATA = {
    "email": "admin@localhost.com",
    "password": "Admin!123"
}

def test_purchase_orders():
    """Testa a funcionalidade de pedidos de compra"""
    
    print("TESTANDO PEDIDOS DE COMPRA...")
    
    # 1. Login
    print("\n1. Fazendo login...")
    login_response = requests.post(
        f"{API_BASE}/auth/login",
        json=LOGIN_DATA,
        headers={"Content-Type": "application/json"}
    )
    
    if login_response.status_code != 200:
        print(f"ERRO: Erro no login: {login_response.text}")
        return
        
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login realizado com sucesso!")
    
    # 2. Listar pedidos
    print("\n2. Listando pedidos de compra...")
    orders_response = requests.get(f"{API_BASE}/purchase/orders", headers=headers)
    
    if orders_response.status_code != 200:
        print(f"Erro ao listar pedidos: {orders_response.text}")
        return
        
    orders_data = orders_response.json()
    print(f"Resposta da API: {json.dumps(orders_data, indent=2)}")
    
    # 3. Listar fornecedores
    print("\n3. Listando fornecedores...")
    suppliers_response = requests.get(f"{API_BASE}/purchase/suppliers", headers=headers)
    
    if suppliers_response.status_code != 200:
        print(f"ERRO: Erro ao listar fornecedores: {suppliers_response.text}")
        return
        
    suppliers_data = suppliers_response.json()
    print(f"OK: Fornecedores encontrados: {len(suppliers_data.get('data', []))}")
    
    # 4. Listar produtos
    print("\n4. Listando produtos...")
    products_response = requests.get(f"{API_BASE}/purchase/products", headers=headers)
    
    if products_response.status_code != 200:
        print(f"ERRO: Erro ao listar produtos: {products_response.text}")
        return
        
    products_data = products_response.json()
    print(f"OK: Produtos encontrados: {len(products_data.get('data', []))}")
    
    print("\nTeste concluido!")

if __name__ == "__main__":
    test_purchase_orders()