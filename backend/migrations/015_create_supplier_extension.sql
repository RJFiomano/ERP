-- Migration: Extensão de Fornecedores no cadastro de contatos
-- Adiciona campos específicos para fornecedores

-- Adicionar novos campos na tabela contacts para fornecedores
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS supplier_data JSONB DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50); -- prazo_pagamento (ex: 30, 60, 90 dias)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS delivery_time INTEGER DEFAULT 0; -- prazo_entrega em dias
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS minimum_order_value DECIMAL(12,2) DEFAULT 0.00; -- pedido_minimo
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0.00; -- desconto_padrao
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS supplier_rating INTEGER DEFAULT 0 CHECK (supplier_rating >= 0 AND supplier_rating <= 5); -- avaliacao 0-5
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS supplier_notes TEXT; -- observacoes_fornecedor
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_active_supplier BOOLEAN DEFAULT true; -- ativo_fornecedor
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMP; -- ultima_compra
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS total_purchases DECIMAL(15,2) DEFAULT 0.00; -- total_comprado

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_contacts_supplier_active ON contacts(is_active_supplier) WHERE contact_type = 'supplier';
CREATE INDEX IF NOT EXISTS idx_contacts_payment_terms ON contacts(payment_terms) WHERE contact_type = 'supplier';
CREATE INDEX IF NOT EXISTS idx_contacts_last_purchase ON contacts(last_purchase_date) WHERE contact_type = 'supplier';

-- Comentários para documentação
COMMENT ON COLUMN contacts.supplier_data IS 'Dados específicos do fornecedor em formato JSON';
COMMENT ON COLUMN contacts.payment_terms IS 'Condições de pagamento padrão (ex: 30_dias, a_vista, 30_60_90)';
COMMENT ON COLUMN contacts.delivery_time IS 'Prazo médio de entrega em dias';
COMMENT ON COLUMN contacts.minimum_order_value IS 'Valor mínimo de pedido para o fornecedor';
COMMENT ON COLUMN contacts.discount_percentage IS 'Percentual de desconto padrão negociado';
COMMENT ON COLUMN contacts.supplier_rating IS 'Avaliação do fornecedor de 0 a 5 estrelas';
COMMENT ON COLUMN contacts.supplier_notes IS 'Observações sobre o fornecedor';
COMMENT ON COLUMN contacts.is_active_supplier IS 'Se o fornecedor está ativo para compras';
COMMENT ON COLUMN contacts.last_purchase_date IS 'Data da última compra realizada';
COMMENT ON COLUMN contacts.total_purchases IS 'Valor total já comprado deste fornecedor';