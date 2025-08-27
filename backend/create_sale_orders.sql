-- Criar tabelas sale_orders e sale_order_items

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

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_sale_orders_number ON sale_orders(number);
CREATE INDEX IF NOT EXISTS idx_sale_orders_client_id ON sale_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_sale_orders_status ON sale_orders(status);
CREATE INDEX IF NOT EXISTS idx_sale_orders_order_date ON sale_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_sale_order_items_sale_order_id ON sale_order_items(sale_order_id);
CREATE INDEX IF NOT EXISTS idx_sale_order_items_product_id ON sale_order_items(product_id);

-- Registrar migração no Alembic (se a tabela existir)
INSERT INTO alembic_version (version_num) 
SELECT '008_create_sale_orders_tables'
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alembic_version')
AND NOT EXISTS (SELECT 1 FROM alembic_version WHERE version_num = '008_create_sale_orders_tables');