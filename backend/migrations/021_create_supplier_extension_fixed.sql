-- Migration: Extensão de fornecedores para compras
-- Adapta a tabela suppliers existente para o módulo de compras

-- Adicionar campos específicos para fornecedores de compras
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'a_vista';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS delivery_time INTEGER DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS minimum_order_value DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_rating INTEGER CHECK (supplier_rating >= 0 AND supplier_rating <= 5);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_notes TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS purchase_history JSONB DEFAULT '{}';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS last_purchase_date DATE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS total_purchases DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS average_delivery_days INTEGER DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active_supplier BOOLEAN DEFAULT true;

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active_supplier ON suppliers(is_active_supplier);
CREATE INDEX IF NOT EXISTS idx_suppliers_rating ON suppliers(supplier_rating);
CREATE INDEX IF NOT EXISTS idx_suppliers_last_purchase ON suppliers(last_purchase_date);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_supplier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_suppliers_updated_at ON suppliers;
CREATE TRIGGER trigger_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_supplier_updated_at();

COMMENT ON TABLE suppliers IS 'Tabela de fornecedores com extensões para compras';