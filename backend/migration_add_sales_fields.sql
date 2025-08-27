-- Adicionar campos extras na tabela sales
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP;

-- Criar tabela de pagamentos se não existir
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id),
    method VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    amount NUMERIC(12, 2) NOT NULL,
    fee_amount NUMERIC(10, 2) DEFAULT 0,
    net_amount NUMERIC(12, 2) NOT NULL,
    installments INTEGER DEFAULT 1,
    installment_amount NUMERIC(10, 2),
    authorization_code VARCHAR(100),
    transaction_id VARCHAR(100),
    pix_key VARCHAR(200),
    qr_code VARCHAR(500),
    barcode VARCHAR(200),
    card_brand VARCHAR(50),
    card_last_digits VARCHAR(4),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Verificar se as colunas de impostos existem na tabela sale_items
DO $$ 
BEGIN
    -- ICMS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_items' AND column_name='icms_amount') THEN
        ALTER TABLE sale_items ADD COLUMN icms_amount NUMERIC(10, 2) DEFAULT 0;
    END IF;
    
    -- PIS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_items' AND column_name='pis_amount') THEN
        ALTER TABLE sale_items ADD COLUMN pis_amount NUMERIC(10, 2) DEFAULT 0;
    END IF;
    
    -- COFINS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_items' AND column_name='cofins_amount') THEN
        ALTER TABLE sale_items ADD COLUMN cofins_amount NUMERIC(10, 2) DEFAULT 0;
    END IF;
END $$;