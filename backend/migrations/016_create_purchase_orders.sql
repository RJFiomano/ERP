-- Migration: Criação das tabelas de pedidos de compra
-- Tabelas: pedidos_compra e pedidos_compra_itens

-- Tabela principal de pedidos de compra
CREATE TABLE IF NOT EXISTS pedidos_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_pedido VARCHAR(20) UNIQUE NOT NULL, -- PED001, PED002, etc.
    supplier_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Datas
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_entrega_prevista DATE,
    data_entrega_confirmada DATE,
    data_cancelamento TIMESTAMP,
    
    -- Status
    status VARCHAR(20) DEFAULT 'rascunho' CHECK (status IN (
        'rascunho', 'enviado', 'confirmado', 'parcial', 'recebido', 'cancelado'
    )),
    urgencia VARCHAR(10) DEFAULT 'normal' CHECK (urgencia IN ('baixa', 'normal', 'alta', 'critica')),
    
    -- Valores
    subtotal DECIMAL(15,2) DEFAULT 0.00,
    desconto_valor DECIMAL(15,2) DEFAULT 0.00,
    desconto_percentual DECIMAL(5,2) DEFAULT 0.00,
    frete_valor DECIMAL(12,2) DEFAULT 0.00,
    impostos_valor DECIMAL(12,2) DEFAULT 0.00,
    total_geral DECIMAL(15,2) DEFAULT 0.00,
    
    -- Condições
    condicoes_pagamento VARCHAR(50), -- 30_dias, a_vista, etc.
    local_entrega TEXT,
    observacoes TEXT,
    observacoes_internas TEXT,
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    
    -- Campos para auditoria
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Tabela de itens do pedido de compra
CREATE TABLE IF NOT EXISTS pedidos_compra_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Quantidades
    quantidade_pedida DECIMAL(12,3) NOT NULL CHECK (quantidade_pedida > 0),
    quantidade_recebida DECIMAL(12,3) DEFAULT 0.00,
    quantidade_cancelada DECIMAL(12,3) DEFAULT 0.00,
    
    -- Valores
    preco_unitario DECIMAL(12,2) NOT NULL CHECK (preco_unitario >= 0),
    desconto_item DECIMAL(5,2) DEFAULT 0.00, -- percentual
    preco_final DECIMAL(12,2) NOT NULL, -- preco_unitario com desconto
    subtotal_item DECIMAL(15,2) NOT NULL, -- preco_final * quantidade
    
    -- Impostos por item
    icms_percentual DECIMAL(5,2) DEFAULT 0.00,
    icms_valor DECIMAL(12,2) DEFAULT 0.00,
    ipi_percentual DECIMAL(5,2) DEFAULT 0.00,
    ipi_valor DECIMAL(12,2) DEFAULT 0.00,
    pis_percentual DECIMAL(5,4) DEFAULT 0.00,
    pis_valor DECIMAL(12,2) DEFAULT 0.00,
    cofins_percentual DECIMAL(5,4) DEFAULT 0.00,
    cofins_valor DECIMAL(12,2) DEFAULT 0.00,
    
    -- Informações adicionais
    unidade_medida VARCHAR(10) DEFAULT 'UN',
    observacoes_item TEXT,
    numero_item INTEGER NOT NULL, -- ordem do item no pedido
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(pedido_id, product_id), -- Um produto por pedido
    UNIQUE(pedido_id, numero_item) -- Numeração sequencial por pedido
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_supplier ON pedidos_compra(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_status ON pedidos_compra(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_data ON pedidos_compra(data_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_numero ON pedidos_compra(numero_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_user ON pedidos_compra(user_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_compra_itens_pedido ON pedidos_compra_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_itens_produto ON pedidos_compra_itens(product_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_itens_numero ON pedidos_compra_itens(pedido_id, numero_item);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_pedidos_compra_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pedidos_compra_updated_at
    BEFORE UPDATE ON pedidos_compra
    FOR EACH ROW
    EXECUTE FUNCTION update_pedidos_compra_updated_at();

CREATE OR REPLACE FUNCTION update_pedidos_compra_itens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pedidos_compra_itens_updated_at
    BEFORE UPDATE ON pedidos_compra_itens
    FOR EACH ROW
    EXECUTE FUNCTION update_pedidos_compra_itens_updated_at();

-- Função para gerar número do pedido automaticamente
CREATE OR REPLACE FUNCTION generate_numero_pedido()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    new_numero VARCHAR(20);
BEGIN
    IF NEW.numero_pedido IS NULL THEN
        -- Buscar próximo número
        SELECT COALESCE(
            MAX(CAST(SUBSTRING(numero_pedido FROM 4) AS INTEGER)) + 1, 
            1
        ) INTO next_number
        FROM pedidos_compra 
        WHERE numero_pedido ~ '^PED[0-9]+$';
        
        -- Formatar número com zeros à esquerda
        new_numero := 'PED' || LPAD(next_number::TEXT, 6, '0');
        NEW.numero_pedido := new_numero;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_numero_pedido
    BEFORE INSERT ON pedidos_compra
    FOR EACH ROW
    EXECUTE FUNCTION generate_numero_pedido();

-- RLS (Row Level Security) - usuários só veem pedidos da própria empresa
ALTER TABLE pedidos_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_compra_itens ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança serão definidas conforme necessário

-- Comentários para documentação
COMMENT ON TABLE pedidos_compra IS 'Pedidos de compra para fornecedores';
COMMENT ON TABLE pedidos_compra_itens IS 'Itens dos pedidos de compra';

COMMENT ON COLUMN pedidos_compra.numero_pedido IS 'Número sequencial do pedido (PED000001)';
COMMENT ON COLUMN pedidos_compra.status IS 'Status do pedido: rascunho, enviado, confirmado, parcial, recebido, cancelado';
COMMENT ON COLUMN pedidos_compra.urgencia IS 'Prioridade do pedido: baixa, normal, alta, critica';
COMMENT ON COLUMN pedidos_compra.condicoes_pagamento IS 'Condições de pagamento acordadas';

COMMENT ON COLUMN pedidos_compra_itens.quantidade_pedida IS 'Quantidade solicitada no pedido';
COMMENT ON COLUMN pedidos_compra_itens.quantidade_recebida IS 'Quantidade efetivamente recebida';
COMMENT ON COLUMN pedidos_compra_itens.preco_final IS 'Preço unitário após aplicar desconto do item';