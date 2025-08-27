#!/usr/bin/env python3

import requests
import json

# Configurações
API_BASE = "http://localhost:8000"
LOGIN_DATA = {
    "email": "admin@localhost.com",
    "password": "Admin!123"
}

def test_pdf():
    """Testa a geração de PDF"""
    
    print("TESTANDO GERACAO DE PDF...")
    
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
    
    # 2. Buscar um pedido existente
    print("\n2. Buscando pedido existente...")
    orders_response = requests.get(f"{API_BASE}/purchase/orders", headers=headers)
    
    if orders_response.status_code != 200:
        print(f"ERRO: Erro ao listar pedidos: {orders_response.text}")
        return
        
    orders_data = orders_response.json()
    if not orders_data.get('data'):
        print("ERRO: Nenhum pedido encontrado")
        return
        
    order_id = orders_data['data'][0]['id']
    print(f"Pedido encontrado: {order_id}")
    
    # 3. Testar PDF
    print("\n3. Tentando gerar PDF...")
    pdf_response = requests.get(f"{API_BASE}/purchase/orders/{order_id}/pdf", headers=headers)
    
    print(f"Status da resposta: {pdf_response.status_code}")
    if pdf_response.status_code == 200:
        print(f"PDF gerado com sucesso! Tamanho: {len(pdf_response.content)} bytes")
        
        # Salvar arquivo para testar
        with open('teste_pedido.pdf', 'wb') as f:
            f.write(pdf_response.content)
        print("PDF salvo como 'teste_pedido.pdf'")
    else:
        print(f"ERRO: {pdf_response.text}")
    
    print("\nTeste concluido!")

if __name__ == "__main__":
    test_pdf()