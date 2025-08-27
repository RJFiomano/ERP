#!/usr/bin/env python3

import psycopg2
import uuid
from datetime import datetime, timedelta
import random
from decimal import Decimal

# Configurações do banco
DB_CONFIG = {
    'host': 'db',
    'port': 5432,
    'database': 'erp_db', 
    'user': 'erp_user',
    'password': 'erp_password'
}

def generate_cnpj():
    """Gera um CNPJ fictício válido"""
    return f"{random.randint(10, 99)}.{random.randint(100, 999)}.{random.randint(100, 999)}/0001-{random.randint(10, 99)}"

def generate_cpf():
    """Gera um CPF fictício válido"""
    return f"{random.randint(100, 999)}.{random.randint(100, 999)}.{random.randint(100, 999)}-{random.randint(10, 99)}"

def generate_phone():
    """Gera um telefone fictício"""
    ddd = random.choice(['11', '21', '31', '41', '51', '61', '71', '81', '85', '47'])
    return f"({ddd}) 9{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"

def generate_cep():
    """Gera um CEP fictício"""
    return f"{random.randint(10000, 99999)}-{random.randint(100, 999)}"

def populate_categories(cur):
    """Popula categorias de produtos"""
    print("📦 Criando categorias...")
    
    categories = [
        ('Eletrônicos', 'Produtos eletrônicos em geral'),
        ('Informática', 'Computadores, notebooks, periféricos'),
        ('Móveis', 'Móveis para casa e escritório'),
        ('Eletrodomésticos', 'Geladeiras, fogões, micro-ondas'),
        ('Roupas', 'Vestuário masculino e feminino'),
        ('Calçados', 'Sapatos, tênis, sandálias'),
        ('Livros', 'Livros técnicos e literatura'),
        ('Brinquedos', 'Brinquedos infantis'),
        ('Esporte', 'Artigos esportivos'),
        ('Casa e Jardim', 'Utensílios domésticos e jardinagem'),
        ('Beleza', 'Cosméticos e produtos de beleza'),
        ('Ferramentas', 'Ferramentas manuais e elétricas')
    ]
    
    category_ids = []
    for name, desc in categories:
        cat_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO categories (id, name, description, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (cat_id, name, desc, True, datetime.now(), datetime.now()))
        category_ids.append(cat_id)
    
    print(f"✅ {len(categories)} categorias criadas")
    return category_ids

def populate_clients(cur):
    """Popula clientes (PF e PJ)"""
    print("👥 Criando clientes...")
    
    # Clientes PJ
    pj_clients = [
        ('ACME Informática Ltda', 'acme@informatica.com.br', 'Rua das Flores, 123', 'Centro'),
        ('TechSolutions S.A.', 'contato@techsolutions.com.br', 'Av. Paulista, 1000', 'Bela Vista'),
        ('Móveis & Cia', 'vendas@moveisecia.com.br', 'Rua do Comércio, 456', 'Comercial'),
        ('SuperMarket Brasil', 'compras@supermarket.com.br', 'Av. Brasil, 2000', 'Industrial'),
        ('Construtora Alpha', 'obras@alpha.com.br', 'Rua das Palmeiras, 789', 'Jardins'),
        ('Fashion Store', 'loja@fashion.com.br', 'Shopping Center, Loja 15', 'Centro'),
        ('Auto Peças Milano', 'pecas@milano.com.br', 'Av. dos Mecânicos, 300', 'Industrial'),
        ('Farmácia Vida', 'farmacia@vida.com.br', 'Rua da Saúde, 150', 'Centro'),
        ('Editora Conhecimento', 'editora@conhecimento.com.br', 'Rua dos Livros, 50', 'Cultural'),
        ('Esportes Total', 'vendas@esportestotal.com.br', 'Av. dos Esportes, 800', 'Zona Sul')
    ]
    
    client_ids = []
    for name, email, address, neighborhood in pj_clients:
        client_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO clients (id, name, email, document, person_type, 
                               address, city, state, zip_code, phone, 
                               is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (client_id, name, email, generate_cnpj(), 'PJ',
              f'{address}, {neighborhood}', 'São Paulo', 'SP', generate_cep(), generate_phone(),
              True, datetime.now(), datetime.now()))
        client_ids.append(client_id)
    
    # Clientes PF
    pf_clients = [
        ('João Silva Santos', 'joao.silva@email.com'),
        ('Maria Oliveira Costa', 'maria.oliveira@email.com'),
        ('Carlos Eduardo Lima', 'carlos.lima@email.com'),
        ('Ana Paula Ferreira', 'ana.paula@email.com'),
        ('Roberto Carlos Souza', 'roberto.souza@email.com'),
        ('Fernanda Alves', 'fernanda.alves@email.com'),
        ('Pedro Henrique Rocha', 'pedro.rocha@email.com'),
        ('Juliana Mendes', 'juliana.mendes@email.com'),
        ('Ricardo Barbosa', 'ricardo.barbosa@email.com'),
        ('Patrícia Gomes', 'patricia.gomes@email.com')
    ]
    
    neighborhoods = ['Centro', 'Jardins', 'Vila Madalena', 'Pinheiros', 'Moema', 'Itaim', 'Perdizes']
    
    for name, email in pf_clients:
        client_id = str(uuid.uuid4())
        neighborhood = random.choice(neighborhoods)
        cur.execute("""
            INSERT INTO clients (id, name, email, document, person_type,
                               address, city, state, zip_code, phone,
                               is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (client_id, name, email, generate_cpf(), 'PF',
              f'Rua {random.choice(["das Flores", "dos Andradas", "XV de Novembro", "da Liberdade"])}, {random.randint(100, 999)}, {neighborhood}',
              'São Paulo', 'SP', generate_cep(), generate_phone(),
              True, datetime.now(), datetime.now()))
        client_ids.append(client_id)
    
    print(f"✅ {len(pj_clients + pf_clients)} clientes criados")
    return client_ids

def populate_suppliers(cur):
    """Popula fornecedores"""
    print("🏭 Criando fornecedores...")
    
    suppliers = [
        ('Distribuidora Central', 'compras@central.com.br', 'Produtos diversos'),
        ('Eletrônica do Norte', 'vendas@eletronicanorte.com.br', 'Eletrônicos e informática'),
        ('Fábrica de Móveis Sul', 'fabrica@moveissul.com.br', 'Móveis residenciais'),
        ('Importadora Global', 'global@importadora.com.br', 'Produtos importados'),
        ('Indústria Alimentícia', 'industria@alimenticia.com.br', 'Alimentos processados'),
        ('Confecções Modelo', 'confeccoes@modelo.com.br', 'Roupas e acessórios'),
        ('Editora Nacional', 'editora@nacional.com.br', 'Livros e publicações'),
        ('Distribuidora de Cosméticos', 'cosmeticos@distribuidora.com.br', 'Beleza e higiene'),
        ('Ferramentas & Equipamentos', 'ferramentas@equipamentos.com.br', 'Ferramentas industriais'),
        ('Atacado Esportivo', 'atacado@esportivo.com.br', 'Artigos esportivos')
    ]
    
    supplier_ids = []
    for name, email, description in suppliers:
        supplier_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO suppliers (id, name, email, document, person_type,
                                 address, city, state, zip_code, phone,
                                 is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (supplier_id, name, email, generate_cnpj(), 'PJ',
              f'Av. Industrial, {random.randint(1000, 9999)}, Industrial',
              random.choice(['São Paulo', 'Guarulhos', 'Santo André']), 'SP',
              generate_cep(), generate_phone(),
              True, datetime.now(), datetime.now()))
        supplier_ids.append(supplier_id)
    
    print(f"✅ {len(suppliers)} fornecedores criados")
    return supplier_ids

def populate_products(cur, category_ids):
    """Popula produtos com diferentes preços e estoques"""
    print("🛍️ Criando produtos...")
    
    products = [
        # Eletrônicos
        ('Smartphone Galaxy A54', '7891234567890', 'UNID', 899.99, 25),
        ('Televisor LED 50" 4K', '7891234567891', 'UNID', 1599.99, 8),
        ('Fone de Ouvido Bluetooth', '7891234567892', 'UNID', 149.99, 50),
        ('Carregador Portátil 10000mAh', '7891234567893', 'UNID', 89.99, 30),
        
        # Informática
        ('Notebook Lenovo i5 8GB', '7891234567894', 'UNID', 2299.99, 12),
        ('Mouse Óptico USB', '7891234567895', 'UNID', 25.99, 100),
        ('Teclado Mecânico RGB', '7891234567896', 'UNID', 199.99, 20),
        ('Monitor 24" Full HD', '7891234567897', 'UNID', 599.99, 15),
        ('HD Externo 1TB', '7891234567898', 'UNID', 299.99, 25),
        
        # Móveis
        ('Mesa de Escritório 120cm', '7891234567899', 'UNID', 299.99, 10),
        ('Cadeira Ergonômica', '7891234567900', 'UNID', 399.99, 18),
        ('Estante 5 Prateleiras', '7891234567901', 'UNID', 199.99, 12),
        ('Sofá 3 Lugares', '7891234567902', 'UNID', 899.99, 5),
        
        # Eletrodomésticos
        ('Geladeira Frost Free 300L', '7891234567903', 'UNID', 1299.99, 6),
        ('Microondas 20L', '7891234567904', 'UNID', 299.99, 15),
        ('Liquidificador 600W', '7891234567905', 'UNID', 89.99, 25),
        
        # Roupas
        ('Camiseta Polo', '7891234567906', 'UNID', 49.99, 50),
        ('Calça Jeans', '7891234567907', 'UNID', 79.99, 40),
        ('Tênis Esportivo', '7891234567908', 'UNID', 159.99, 30),
        
        # Casa e Jardim
        ('Conjunto de Panelas', '7891234567909', 'UNID', 199.99, 20),
        ('Aspirador de Pó', '7891234567910', 'UNID', 249.99, 10),
        ('Ferro de Passar', '7891234567911', 'UNID', 79.99, 25),
        
        # Livros
        ('Livro Python Programming', '7891234567912', 'UNID', 89.99, 15),
        ('Livro Marketing Digital', '7891234567913', 'UNID', 65.99, 20),
        
        # Ferramentas
        ('Furadeira Elétrica', '7891234567914', 'UNID', 159.99, 12),
        ('Chaves de Fenda Kit', '7891234567915', 'UNID', 29.99, 40),
        ('Martelo 500g', '7891234567916', 'UNID', 19.99, 35),
        
        # Beleza
        ('Shampoo Anticaspa 400ml', '7891234567917', 'UNID', 15.99, 60),
        ('Creme Hidratante 200g', '7891234567918', 'UNID', 25.99, 45),
        ('Perfume Masculino 100ml', '7891234567919', 'UNID', 89.99, 20),
        
        # Esporte
        ('Bola de Futebol', '7891234567920', 'UNID', 39.99, 25),
        ('Raquete de Tênis', '7891234567921', 'UNID', 199.99, 8),
        ('Halteres 2kg (Par)', '7891234567922', 'UNID', 49.99, 15)
    ]
    
    product_ids = []
    for i, (name, barcode, unit, price, stock) in enumerate(products):
        product_id = str(uuid.uuid4())
        # Distribuir produtos entre categorias
        category_id = category_ids[i % len(category_ids)]
        
        # Gerar SKU baseado no índice
        sku = f'PRD{2024:04d}{i+1:04d}'
        
        cur.execute("""
            INSERT INTO products (id, sku, name, ean_gtin, unit, sale_price, cost_price, 
                                stock_quantity, min_stock, category_id, ncm, cfop,
                                icms_rate, pis_rate, cofins_rate, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (product_id, sku, name, barcode, unit, price, price * 0.6,  # margem de 40%
              stock, max(5, stock // 4),  # estoque mínimo
              category_id, '12345678', '5102',  # NCM e CFOP genéricos
              18.0, 1.65, 7.6,  # Alíquotas padrão
              True, datetime.now(), datetime.now()))
        product_ids.append(product_id)
    
    print(f"✅ {len(products)} produtos criados")
    return product_ids

def populate_sale_orders(cur, client_ids, product_ids):
    """Popula pedidos de venda"""
    print("🛒 Criando pedidos de venda...")
    
    statuses = ['draft', 'confirmed', 'invoiced']
    payment_methods = ['cash', 'installments_2x', 'credit_30']
    
    # Gerar 15 pedidos
    for i in range(15):
        order_id = str(uuid.uuid4())
        client_id = random.choice(client_ids)
        status = random.choice(statuses)
        payment_method = random.choice(payment_methods)
        order_date = datetime.now() - timedelta(days=random.randint(0, 30))
        
        # Calcular totais (valores simulados)
        subtotal = Decimal(str(random.uniform(100, 2000))).quantize(Decimal('0.01'))
        discount_percent = random.choice([0, 5, 10, 15])
        discount_amount = subtotal * Decimal(str(discount_percent / 100))
        tax_total = subtotal * Decimal('0.15')  # 15% de impostos
        total_amount = subtotal - discount_amount + tax_total
        
        cur.execute("""
            INSERT INTO sale_orders (id, order_number, client_id, order_date, status, payment_method,
                                   subtotal, discount_percent, discount_amount, tax_total, total_amount,
                                   notes, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (order_id, f'PV{2024:04d}{i+1:06d}', client_id, order_date, status, payment_method,
              subtotal, discount_percent, discount_amount, tax_total, total_amount,
              f'Pedido de venda #{i+1}', True, datetime.now(), datetime.now()))
        
        # Adicionar itens ao pedido (2-5 produtos por pedido)
        num_items = random.randint(2, 5)
        selected_products = random.sample(product_ids, num_items)
        
        for product_id in selected_products:
            item_id = str(uuid.uuid4())
            quantity = random.randint(1, 10)
            unit_price = Decimal(str(random.uniform(20, 500))).quantize(Decimal('0.01'))
            gross_total = unit_price * quantity
            net_total = gross_total * Decimal('0.95')  # 5% desconto médio
            
            cur.execute("""
                INSERT INTO sale_order_items (id, sale_order_id, product_id, quantity, unit_price,
                                            gross_total, net_total, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (item_id, order_id, product_id, quantity, unit_price,
                  gross_total, net_total, datetime.now(), datetime.now()))
    
    print("✅ 15 pedidos de venda criados")

def main():
    """Função principal para popular dados"""
    try:
        print("🚀 Iniciando população de dados de exemplo...")
        
        # Conectar ao banco
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Verificar se já existem dados
        cur.execute("SELECT COUNT(*) FROM categories")
        if cur.fetchone()[0] > 0:
            print("⚠️  Dados já existem. Deseja continuar? (Pode causar duplicatas)")
            response = input("Digite 'sim' para continuar: ")
            if response.lower() != 'sim':
                print("❌ Operação cancelada")
                return
        
        # Popular dados na ordem correta (dependências)
        category_ids = populate_categories(cur)
        client_ids = populate_clients(cur)
        supplier_ids = populate_suppliers(cur)
        product_ids = populate_products(cur, category_ids)
        # populate_sale_orders(cur, client_ids, product_ids)  # Tabela não existe ainda
        
        # Confirmar transação
        conn.commit()
        
        print("\n🎉 População de dados concluída com sucesso!")
        print("\n📊 Resumo:")
        print(f"   📦 {len(category_ids)} categorias")
        print(f"   👥 {len(client_ids)} clientes")
        print(f"   🏭 {len(supplier_ids)} fornecedores") 
        print(f"   🛍️ {len(product_ids)} produtos")
        # print("   🛒 15 pedidos de venda")
        
        print("\n🌐 Acesse o sistema em:")
        print("   Frontend: http://localhost:3000")
        print("   Login: admin@localhost.com")
        print("   Senha: Admin!123")
        
    except psycopg2.Error as e:
        print(f"❌ Erro no banco de dados: {e}")
    except Exception as e:
        print(f"❌ Erro geral: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()