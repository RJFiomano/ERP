-- Criar tabela sales manualmente

-- Criar enum para status da venda
DO $$ BEGIN
    CREATE TYPE salestatus AS ENUM ('draft', 'confirmed', 'invoiced', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela sales
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    user_id UUID REFERENCES users(id) NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status salestatus DEFAULT 'draft',
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_total DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) DEFAULT 0,
    notes VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índice
CREATE INDEX IF NOT EXISTS ix_sales_id ON sales(id);

-- Criar tabela sale_items
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id) NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    icms_amount DECIMAL(10,2) DEFAULT 0,
    pis_amount DECIMAL(10,2) DEFAULT 0,
    cofins_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índice
CREATE INDEX IF NOT EXISTS ix_sale_items_id ON sale_items(id);

-- Feedback
SELECT 'Tabelas sales e sale_items criadas com sucesso!' as result;