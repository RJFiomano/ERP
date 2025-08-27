-- Migration: Sistema de Pedidos de Compra
-- Adaptado para usar a tabela suppliers existente

-- Sequência para numeração automática dos pedidos
CREATE SEQUENCE IF NOT EXISTS seq_pedido_compra_numero START 1;

-- Tabela principal de pedidos de compra
CREATE TABLE IF NOT EXISTS pedidos_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_pedido VARCHAR(20) UNIQUE NOT NULL DEFAULT 'PC' || LPAD(nextval('seq_pedido_compra_numero')::TEXT, 6, '0'),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    user_id UUID, -- Referência ao usuário que criou
    
    -- Datas
    data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
    data_entrega_prevista DATE,
    
    -- Valores (calculados automaticamente via trigger)
    subtotal DECIMAL(15,2) DEFAULT 0.00,
    desconto_total DECIMAL(15,2) DEFAULT 0.00,
    valor_frete DECIMAL(15,2) DEFAULT 0.00,
    outras_despesas DECIMAL(15,2) DEFAULT 0.00,
    valor_total DECIMAL(15,2) DEFAULT 0.00,
    
    -- Status e condições
    status VARCHAR(20) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'confirmado', 'parcial', 'recebido', 'cancelado')),
    forma_pagamento VARCHAR(30) DEFAULT 'a_vista',
    condicoes_pagamento TEXT,
    
    -- Logística
    local_entrega VARCHAR(500),
    observacoes TEXT,
    urgencia VARCHAR(20) DEFAULT 'normal' CHECK (urgencia IN ('baixa', 'normal', 'alta', 'critica')),
    
    -- Auditoria
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS pedidos_compra_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Quantidades
    quantidade DECIMAL(15,3) NOT NULL CHECK (quantidade > 0),
    quantidade_recebida DECIMAL(15,3) DEFAULT 0,
    quantidade_pendente DECIMAL(15,3) GENERATED ALWAYS AS (quantidade - quantidade_recebida) STORED,
    
    -- Preços e descontos
    preco_unitario DECIMAL(15,2) NOT NULL CHECK (preco_unitario >= 0),
    desconto_percentual DECIMAL(5,2) DEFAULT 0 CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100),
    desconto_valor DECIMAL(15,2) GENERATED ALWAYS AS (quantidade * preco_unitario * desconto_percentual / 100) STORED,
    preco_liquido DECIMAL(15,2) GENERATED ALWAYS AS (preco_unitario - (preco_unitario * desconto_percentual / 100)) STORED,
    valor_total_item DECIMAL(15,2) GENERATED ALWAYS AS (quantidade * (preco_unitario - (preco_unitario * desconto_percentual / 100))) STORED,
    
    -- Informações adicionais
    observacoes_item TEXT,
    numero_item INTEGER NOT NULL,
    
    -- Status do item
    status_item VARCHAR(20) DEFAULT 'pendente' CHECK (status_item IN ('pendente', 'parcial', 'recebido', 'cancelado')),
    
    UNIQUE(pedido_id, numero_item)
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_supplier ON pedidos_compra(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_status ON pedidos_compra(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_data ON pedidos_compra(data_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_urgencia ON pedidos_compra(urgencia);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_user ON pedidos_compra(user_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_itens_pedido ON pedidos_compra_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_itens_product ON pedidos_compra_itens(product_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_itens_status ON pedidos_compra_itens(status_item);

-- Função para atualizar totais do pedido
CREATE OR REPLACE FUNCTION update_pedido_compra_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar totais do pedido quando itens forem modificados
    UPDATE pedidos_compra SET
        subtotal = (
            SELECT COALESCE(SUM(valor_total_item), 0)
            FROM pedidos_compra_itens 
            WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
        ),
        desconto_total = (
            SELECT COALESCE(SUM(desconto_valor), 0)
            FROM pedidos_compra_itens 
            WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
        ),
        valor_total = (
            SELECT COALESCE(SUM(valor_total_item), 0) + COALESCE(valor_frete, 0) + COALESCE(outras_despesas, 0)
            FROM pedidos_compra_itens 
            WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para cálculos automáticos
DROP TRIGGER IF EXISTS trigger_pedido_itens_totals ON pedidos_compra_itens;
CREATE TRIGGER trigger_pedido_itens_totals
    AFTER INSERT OR UPDATE OR DELETE ON pedidos_compra_itens
    FOR EACH ROW EXECUTE FUNCTION update_pedido_compra_totals();

-- Função para atualizar status do pedido baseado nos itens
CREATE OR REPLACE FUNCTION update_pedido_status()
RETURNS TRIGGER AS $$
DECLARE
    total_items INTEGER;
    received_items INTEGER;
    pedido_id_val UUID;
BEGIN
    pedido_id_val := COALESCE(NEW.pedido_id, OLD.pedido_id);
    
    SELECT COUNT(*), COUNT(CASE WHEN status_item = 'recebido' THEN 1 END)
    INTO total_items, received_items
    FROM pedidos_compra_itens 
    WHERE pedido_id = pedido_id_val;
    
    UPDATE pedidos_compra SET
        status = CASE 
            WHEN received_items = 0 THEN status -- Manter status atual se nenhum item foi recebido
            WHEN received_items = total_items THEN 'recebido'
            ELSE 'parcial'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = pedido_id_val AND status NOT IN ('cancelado');
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar status do pedido
DROP TRIGGER IF EXISTS trigger_pedido_status_update ON pedidos_compra_itens;
CREATE TRIGGER trigger_pedido_status_update
    AFTER UPDATE OF status_item ON pedidos_compra_itens
    FOR EACH ROW EXECUTE FUNCTION update_pedido_status();

COMMENT ON TABLE pedidos_compra IS 'Pedidos de compra com numeração automática e cálculos automáticos';
COMMENT ON TABLE pedidos_compra_itens IS 'Itens dos pedidos de compra com cálculos de preços e descontos';