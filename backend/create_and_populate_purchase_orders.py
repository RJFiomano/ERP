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

def create_purchase_tables(cur):
    """Cria as tabelas de pedidos de compras"""
    print("🔧 Criando tabelas de pedidos de compras...")
    
    # Criar extensão UUID se não existir
    cur.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
    
    # Criar tabela de pedidos de compras
    cur.execute("""
        CREATE TABLE IF NOT EXISTS purchase_orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_number VARCHAR(50) UNIQUE NOT NULL,
            supplier_id UUID REFERENCES suppliers(id),
            order_date TIMESTAMP NOT NULL DEFAULT NOW(),
            expected_delivery_date TIMESTAMP,
            delivery_date TIMESTAMP,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            payment_terms VARCHAR(50),
            subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
            discount_percent NUMERIC(5, 2) DEFAULT 0,
            discount_amount NUMERIC(12, 2) DEFAULT 0,
            tax_amount NUMERIC(12, 2) DEFAULT 0,
            shipping_cost NUMERIC(12, 2) DEFAULT 0,
            total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
            notes TEXT,
            internal_notes TEXT,
            created_by UUID REFERENCES users(id),
            approved_by UUID REFERENCES users(id),
            approved_at TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
    """)
    
    # Criar tabela de itens do pedido de compras
    cur.execute("""
        CREATE TABLE IF NOT EXISTS purchase_order_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id),
            quantity NUMERIC(10, 3) NOT NULL,
            unit_cost NUMERIC(12, 2) NOT NULL,
            discount_percent NUMERIC(5, 2) DEFAULT 0,
            discount_amount NUMERIC(12, 2) DEFAULT 0,
            total_cost NUMERIC(12, 2) NOT NULL,
            received_quantity NUMERIC(10, 3) DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
    """)
    
    # Criar índices
    cur.execute("CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(purchase_order_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON purchase_order_items(product_id);")
    
    print("✅ Tabelas de pedidos de compras criadas")

def get_suppliers_and_products(cur):
    """Busca fornecedores e produtos existentes"""
    # Buscar fornecedores
    cur.execute("SELECT id, name FROM suppliers WHERE is_active = TRUE ORDER BY name")
    suppliers = cur.fetchall()
    
    # Buscar produtos
    cur.execute("SELECT id, name, cost_price FROM products WHERE is_active = TRUE ORDER BY name")
    products = cur.fetchall()
    
    print(f"📋 Encontrados: {len(suppliers)} fornecedores e {len(products)} produtos")
    return suppliers, products

def get_admin_user(cur):
    """Busca o usuário admin"""
    cur.execute("SELECT id FROM users WHERE email LIKE '%admin%' LIMIT 1")
    user = cur.fetchone()
    return user[0] if user else None

def generate_purchase_orders(cur, suppliers, products, admin_user_id):
    """Gera pedidos de compras com itens"""
    print("🛒 Criando pedidos de compras...")
    
    if not suppliers or not products:
        print("❌ Não há fornecedores ou produtos cadastrados")
        return
    
    statuses = ['pending', 'approved', 'partially_received', 'received', 'cancelled']
    payment_terms_list = ['À vista', '30 dias', '60 dias', '90 dias', 'Parcelado 2x', 'Parcelado 3x']
    
    purchase_order_ids = []
    
    # Gerar 20 pedidos de compras
    for i in range(20):
        order_id = str(uuid.uuid4())
        supplier_id, supplier_name = random.choice(suppliers)
        status = random.choice(statuses)
        payment_terms = random.choice(payment_terms_list)
        
        # Datas
        order_date = datetime.now() - timedelta(days=random.randint(0, 60))
        expected_delivery = order_date + timedelta(days=random.randint(7, 30))
        
        # Se status é 'received' ou 'partially_received', definir data de entrega
        delivery_date = None
        if status in ['received', 'partially_received']:
            delivery_date = expected_delivery + timedelta(days=random.randint(-3, 7))
        
        # Aprovação (se não for 'pending')
        approved_by = admin_user_id if status != 'pending' else None
        approved_at = order_date + timedelta(hours=random.randint(1, 48)) if approved_by else None
        
        # Número do pedido
        order_number = f'PC{2024:04d}{i+1:06d}'
        
        # Inserir pedido
        cur.execute("""
            INSERT INTO purchase_orders (
                id, order_number, supplier_id, order_date, expected_delivery_date, 
                delivery_date, status, payment_terms, subtotal, discount_percent, 
                discount_amount, tax_amount, shipping_cost, total_amount, 
                notes, created_by, approved_by, approved_at, 
                is_active, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            order_id, order_number, supplier_id, order_date, expected_delivery,
            delivery_date, status, payment_terms, 0, 0, 0, 0, 0, 0,  # Totais serão calculados depois
            f'Pedido de compras #{i+1} - {supplier_name}',
            admin_user_id, approved_by, approved_at,
            True, datetime.now(), datetime.now()
        ))
        
        purchase_order_ids.append((order_id, status))
    
    print(f"✅ {len(purchase_order_ids)} pedidos de compras criados")
    return purchase_order_ids

def generate_purchase_order_items(cur, purchase_order_ids, products):
    """Gera itens para os pedidos de compras"""
    print("📦 Adicionando itens aos pedidos...")
    
    total_items = 0
    
    for order_id, order_status in purchase_order_ids:
        # Cada pedido terá entre 2 e 8 itens
        num_items = random.randint(2, 8)
        selected_products = random.sample(products, min(num_items, len(products)))
        
        order_subtotal = Decimal('0')
        
        for product_id, product_name, cost_price in selected_products:
            item_id = str(uuid.uuid4())
            quantity = random.randint(5, 100)
            
            # Usar preço de custo do produto ou gerar um próximo a ele
            if cost_price and cost_price > 0:
                # Variar o preço de custo em até ±20%
                variation = random.uniform(0.8, 1.2)
                unit_cost = Decimal(str(float(cost_price) * variation)).quantize(Decimal('0.01'))
            else:
                unit_cost = Decimal(str(random.uniform(10, 500))).quantize(Decimal('0.01'))
            
            # Desconto ocasional
            discount_percent = random.choice([0, 0, 0, 5, 10, 15])  # Maioria sem desconto
            discount_amount = (unit_cost * quantity * Decimal(str(discount_percent)) / 100).quantize(Decimal('0.01'))
            
            total_cost = (unit_cost * quantity - discount_amount).quantize(Decimal('0.01'))
            order_subtotal += total_cost
            
            # Quantidade recebida (depende do status do pedido)
            received_quantity = 0
            if order_status == 'received':
                received_quantity = quantity
            elif order_status == 'partially_received':
                received_quantity = random.randint(1, quantity - 1)
            
            cur.execute("""
                INSERT INTO purchase_order_items (
                    id, purchase_order_id, product_id, quantity, unit_cost,
                    discount_percent, discount_amount, total_cost, received_quantity,
                    notes, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                item_id, order_id, product_id, quantity, unit_cost,
                discount_percent, discount_amount, total_cost, received_quantity,
                f'Item: {product_name}',
                datetime.now(), datetime.now()
            ))
            
            total_items += 1
        
        # Atualizar totais do pedido
        tax_amount = (order_subtotal * Decimal('0.08')).quantize(Decimal('0.01'))  # 8% de impostos
        shipping_cost = Decimal(str(random.choice([0, 0, 50, 100, 150, 200]))).quantize(Decimal('0.01'))
        total_amount = order_subtotal + tax_amount + shipping_cost
        
        cur.execute("""
            UPDATE purchase_orders 
            SET subtotal = %s, tax_amount = %s, shipping_cost = %s, total_amount = %s,
                updated_at = %s
            WHERE id = %s
        """, (order_subtotal, tax_amount, shipping_cost, total_amount, datetime.now(), order_id))
    
    print(f"✅ {total_items} itens adicionados aos pedidos")

def display_summary(cur):
    """Exibe resumo dos dados criados"""
    print("\n📊 RESUMO DOS PEDIDOS DE COMPRAS:")
    print("=" * 50)
    
    # Contadores por status
    cur.execute("""
        SELECT status, COUNT(*), SUM(total_amount)
        FROM purchase_orders 
        GROUP BY status 
        ORDER BY status
    """)
    
    for status, count, total in cur.fetchall():
        total_formatted = f"R$ {float(total):,.2f}" if total else "R$ 0,00"
        print(f"   📋 {status.upper():<20} | {count:>3} pedidos | {total_formatted}")
    
    # Total geral
    cur.execute("SELECT COUNT(*), SUM(total_amount) FROM purchase_orders")
    total_orders, total_value = cur.fetchone()
    
    cur.execute("SELECT COUNT(*) FROM purchase_order_items")
    total_items = cur.fetchone()[0]
    
    print(f"\n🎯 TOTAIS:")
    print(f"   📦 {total_orders} pedidos de compras")
    print(f"   📋 {total_items} itens no total")
    print(f"   💰 R$ {float(total_value):,.2f} em compras")

def main():
    """Função principal"""
    try:
        print("🚀 Criando e populando pedidos de compras...")
        
        # Conectar ao banco
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Verificar se tabelas já existem
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name = 'purchase_orders'
        """)
        
        if cur.fetchone()[0] > 0:
            cur.execute("SELECT COUNT(*) FROM purchase_orders")
            existing_count = cur.fetchone()[0]
            if existing_count > 0:
                print(f"⚠️  Já existem {existing_count} pedidos de compras")
                response = input("Deseja recriar as tabelas? (sim/não): ")
                if response.lower() not in ['sim', 's']:
                    print("❌ Operação cancelada")
                    return
                else:
                    # Limpar dados existentes
                    cur.execute("DROP TABLE IF EXISTS purchase_order_items CASCADE")
                    cur.execute("DROP TABLE IF EXISTS purchase_orders CASCADE")
                    print("🗑️  Tabelas antigas removidas")
        
        # Criar tabelas
        create_purchase_tables(cur)
        
        # Buscar dados existentes
        suppliers, products = get_suppliers_and_products(cur)
        admin_user_id = get_admin_user(cur)
        
        if not suppliers:
            print("❌ Erro: Nenhum fornecedor encontrado. Execute primeiro o script de população básica.")
            return
            
        if not products:
            print("❌ Erro: Nenhum produto encontrado. Execute primeiro o script de população básica.")
            return
        
        # Gerar pedidos de compras
        purchase_order_ids = generate_purchase_orders(cur, suppliers, products, admin_user_id)
        
        # Gerar itens dos pedidos
        generate_purchase_order_items(cur, purchase_order_ids, products)
        
        # Confirmar transações
        conn.commit()
        
        # Exibir resumo
        display_summary(cur)
        
        print("\n🎉 Pedidos de compras criados com sucesso!")
        print("\n🌐 Acesse o sistema:")
        print("   Frontend: http://localhost:3000")
        print("   Login: admin@localhost.com")
        print("   Senha: Admin!123")
        
    except psycopg2.Error as e:
        print(f"❌ Erro no banco de dados: {e}")
        if 'conn' in locals():
            conn.rollback()
    except Exception as e:
        print(f"❌ Erro geral: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()