import psycopg2
from psycopg2 import sql

# Configurações do banco (ajustar se necessário)
DB_CONFIG = {
    'host': 'db',
    'port': 5432,
    'database': 'erp_db', 
    'user': 'erp_user',
    'password': 'erp_password'
}

def create_tables():
    """Cria as tabelas sale_orders necessárias"""
    
    sql_commands = """
    -- Criar extensão para UUID se não existir
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Criar tabela sale_orders
    CREATE TABLE IF NOT EXISTS sale_orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        number VARCHAR(20) NOT NULL UNIQUE,
        client_id UUID REFERENCES clients(id),
        order_date TIMESTAMP NOT NULL DEFAULT NOW(),
        delivery_date TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        payment_method VARCHAR(30) NOT NULL DEFAULT 'cash',
        subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
        discount_percent NUMERIC(5, 2) DEFAULT 0,
        discount_amount NUMERIC(10, 2) DEFAULT 0,
        icms_total NUMERIC(10, 2) DEFAULT 0,
        pis_total NUMERIC(10, 2) DEFAULT 0,
        cofins_total NUMERIC(10, 2) DEFAULT 0,
        tax_total NUMERIC(10, 2) DEFAULT 0,
        total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        notes TEXT,
        internal_notes TEXT,
        delivery_address TEXT,
        seller_name VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    -- Criar tabela sale_order_items
    CREATE TABLE IF NOT EXISTS sale_order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_order_id UUID NOT NULL REFERENCES sale_orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id),
        quantity NUMERIC(10, 3) NOT NULL,
        unit_price NUMERIC(10, 2) NOT NULL,
        discount_percent NUMERIC(5, 2) DEFAULT 0,
        discount_amount NUMERIC(10, 2) DEFAULT 0,
        gross_total NUMERIC(10, 2) NOT NULL,
        net_total NUMERIC(10, 2) NOT NULL,
        icms_rate NUMERIC(5, 2) DEFAULT 0,
        pis_rate NUMERIC(5, 2) DEFAULT 0,
        cofins_rate NUMERIC(5, 2) DEFAULT 0,
        icms_amount NUMERIC(10, 2) DEFAULT 0,
        pis_amount NUMERIC(10, 2) DEFAULT 0,
        cofins_amount NUMERIC(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    -- Criar índices
    CREATE INDEX IF NOT EXISTS idx_sale_orders_number ON sale_orders(number);
    CREATE INDEX IF NOT EXISTS idx_sale_orders_client_id ON sale_orders(client_id);
    CREATE INDEX IF NOT EXISTS idx_sale_orders_status ON sale_orders(status);
    CREATE INDEX IF NOT EXISTS idx_sale_orders_order_date ON sale_orders(order_date);
    CREATE INDEX IF NOT EXISTS idx_sale_order_items_sale_order_id ON sale_order_items(sale_order_id);
    CREATE INDEX IF NOT EXISTS idx_sale_order_items_product_id ON sale_order_items(product_id);
    """

    try:
        # Conectar ao banco
        print("Conectando ao banco de dados...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Executar comandos SQL
        print("Executando comandos SQL...")
        cur.execute(sql_commands)
        
        # Confirmar transação
        conn.commit()
        print("Tabelas criadas com sucesso!")
        
        # Verificar se as tabelas foram criadas
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name IN ('sale_orders', 'sale_order_items');")
        tables = cur.fetchall()
        print(f"Tabelas encontradas: {[t[0] for t in tables]}")
        
        return True
        
    except psycopg2.Error as e:
        print(f"Erro no banco de dados: {e}")
        return False
    except Exception as e:
        print(f"Erro geral: {e}")
        return False
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    success = create_tables()
    if success:
        print("Migração concluída com sucesso!")
    else:
        print("Falha na migração!")