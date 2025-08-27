-- Migration: Sistema de Movimentações de Estoque

-- Tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Tipo de movimentação
    tipo_movimentacao VARCHAR(30) NOT NULL CHECK (tipo_movimentacao IN (
        'entrada_compra', 'entrada_ajuste', 'entrada_devolucao', 'entrada_transferencia',
        'saida_venda', 'saida_ajuste', 'saida_perda', 'saida_uso_interno', 'saida_transferencia', 'saida_devolucao'
    )),
    
    -- Quantidades
    quantidade_anterior DECIMAL(15,3) NOT NULL DEFAULT 0,
    quantidade_movimentada DECIMAL(15,3) NOT NULL, -- Positivo para entrada, negativo para saída
    quantidade_atual DECIMAL(15,3) NOT NULL DEFAULT 0,
    
    -- Custos
    custo_unitario DECIMAL(15,2) DEFAULT 0 CHECK (custo_unitario >= 0),
    custo_medio_anterior DECIMAL(15,2) DEFAULT 0 CHECK (custo_medio_anterior >= 0),
    custo_medio_atual DECIMAL(15,2) DEFAULT 0 CHECK (custo_medio_atual >= 0),
    valor_total_movimentacao DECIMAL(15,2) DEFAULT 0,
    
    -- Referências para rastreabilidade
    entrada_estoque_id UUID REFERENCES entradas_estoque(id),
    pedido_compra_id UUID REFERENCES pedidos_compra(id),
    sale_id UUID REFERENCES sales(id),
    
    -- Informações adicionais
    lote VARCHAR(50),
    data_validade DATE,
    motivo VARCHAR(100),
    observacoes TEXT,
    
    -- Dados do usuário e timestamp
    data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id UUID,
    
    -- Índice sequencial para ordenação
    numero_sequencial BIGSERIAL
);

-- Tabela de estoque atual (snapshot para consultas rápidas)
CREATE TABLE IF NOT EXISTS estoque_atual (
    product_id UUID PRIMARY KEY REFERENCES products(id),
    
    -- Quantidades
    quantidade_disponivel DECIMAL(15,3) DEFAULT 0 CHECK (quantidade_disponivel >= 0),
    quantidade_reservada DECIMAL(15,3) DEFAULT 0 CHECK (quantidade_reservada >= 0),
    quantidade_total DECIMAL(15,3) GENERATED ALWAYS AS (quantidade_disponivel + quantidade_reservada) STORED,
    
    -- Custos
    custo_medio DECIMAL(15,2) DEFAULT 0 CHECK (custo_medio >= 0),
    valor_estoque DECIMAL(15,2) GENERATED ALWAYS AS (quantidade_total * custo_medio) STORED,
    
    -- Controles de estoque
    estoque_minimo DECIMAL(15,3) DEFAULT 0,
    estoque_maximo DECIMAL(15,3) DEFAULT 0,
    ponto_reposicao DECIMAL(15,3) DEFAULT 0,
    
    -- Flags de alerta (calculadas automaticamente)
    precisa_reposicao BOOLEAN GENERATED ALWAYS AS (quantidade_disponivel <= ponto_reposicao) STORED,
    estoque_zerado BOOLEAN GENERATED ALWAYS AS (quantidade_disponivel = 0) STORED,
    estoque_negativo BOOLEAN GENERATED ALWAYS AS (quantidade_disponivel < 0) STORED,
    
    -- Rastreamento de movimentações
    ultima_entrada TIMESTAMP,
    ultima_saida TIMESTAMP,
    ultima_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Auditoria
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_movimentacoes_product ON movimentacoes_estoque(product_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes_estoque(tipo_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_estoque(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_entrada ON movimentacoes_estoque(entrada_estoque_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_pedido ON movimentacoes_estoque(pedido_compra_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_sale ON movimentacoes_estoque(sale_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_lote ON movimentacoes_estoque(lote);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_sequencial ON movimentacoes_estoque(numero_sequencial);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_user ON movimentacoes_estoque(user_id);

CREATE INDEX IF NOT EXISTS idx_estoque_atual_disponivel ON estoque_atual(quantidade_disponivel);
CREATE INDEX IF NOT EXISTS idx_estoque_atual_reposicao ON estoque_atual(precisa_reposicao) WHERE precisa_reposicao = true;
CREATE INDEX IF NOT EXISTS idx_estoque_atual_zerado ON estoque_atual(estoque_zerado) WHERE estoque_zerado = true;
CREATE INDEX IF NOT EXISTS idx_estoque_atual_negativo ON estoque_atual(estoque_negativo) WHERE estoque_negativo = true;

-- Função para atualizar estoque atual após movimentação
CREATE OR REPLACE FUNCTION update_estoque_atual()
RETURNS TRIGGER AS $$
DECLARE
    entrada_flag BOOLEAN;
BEGIN
    -- Determinar se é entrada ou saída
    entrada_flag := NEW.tipo_movimentacao LIKE 'entrada_%';
    
    -- Inserir ou atualizar registro no estoque atual
    INSERT INTO estoque_atual (
        product_id, 
        quantidade_disponivel, 
        custo_medio,
        ultima_entrada,
        ultima_saida,
        ultima_movimentacao
    ) VALUES (
        NEW.product_id,
        NEW.quantidade_atual,
        NEW.custo_medio_atual,
        CASE WHEN entrada_flag THEN NEW.data_movimentacao ELSE NULL END,
        CASE WHEN NOT entrada_flag THEN NEW.data_movimentacao ELSE NULL END,
        NEW.data_movimentacao
    )
    ON CONFLICT (product_id) DO UPDATE SET
        quantidade_disponivel = NEW.quantidade_atual,
        custo_medio = NEW.custo_medio_atual,
        ultima_entrada = CASE 
            WHEN entrada_flag THEN NEW.data_movimentacao 
            ELSE estoque_atual.ultima_entrada 
        END,
        ultima_saida = CASE 
            WHEN NOT entrada_flag THEN NEW.data_movimentacao 
            ELSE estoque_atual.ultima_saida 
        END,
        ultima_movimentacao = NEW.data_movimentacao,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar estoque atual
DROP TRIGGER IF EXISTS trigger_update_estoque_atual ON movimentacoes_estoque;
CREATE TRIGGER trigger_update_estoque_atual
    AFTER INSERT ON movimentacoes_estoque
    FOR EACH ROW EXECUTE FUNCTION update_estoque_atual();

-- Função para calcular custo médio ponderado
CREATE OR REPLACE FUNCTION calculate_average_cost(
    current_qty DECIMAL,
    current_cost DECIMAL,
    movement_qty DECIMAL,
    movement_cost DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    -- Se não há estoque atual, usar o custo da movimentação
    IF current_qty <= 0 THEN
        RETURN movement_cost;
    END IF;
    
    -- Se não há movimentação de entrada, manter custo atual
    IF movement_qty <= 0 THEN
        RETURN current_cost;
    END IF;
    
    -- Calcular custo médio ponderado
    RETURN (current_qty * current_cost + movement_qty * movement_cost) / (current_qty + movement_qty);
END;
$$ LANGUAGE plpgsql;

-- View para histórico completo de movimentações por produto
CREATE OR REPLACE VIEW vw_historico_movimentacoes AS
SELECT 
    me.id,
    me.product_id,
    p.name as product_name,
    p.barcode,
    me.tipo_movimentacao,
    me.quantidade_anterior,
    me.quantidade_movimentada,
    me.quantidade_atual,
    me.custo_unitario,
    me.custo_medio_anterior,
    me.custo_medio_atual,
    me.valor_total_movimentacao,
    me.lote,
    me.data_validade,
    me.motivo,
    me.observacoes,
    me.data_movimentacao,
    me.numero_sequencial,
    
    -- Referências
    ee.numero_entrada,
    pc.numero_pedido,
    s.id as sale_number,
    
    -- Tipo de movimentação formatado
    CASE 
        WHEN me.tipo_movimentacao LIKE 'entrada_%' THEN 'Entrada'
        WHEN me.tipo_movimentacao LIKE 'saida_%' THEN 'Saída'
        ELSE 'Outro'
    END as movimento_tipo,
    
    -- Descrição da movimentação
    CASE me.tipo_movimentacao
        WHEN 'entrada_compra' THEN 'Compra de Mercadorias'
        WHEN 'entrada_ajuste' THEN 'Ajuste de Entrada'
        WHEN 'entrada_devolucao' THEN 'Devolução de Cliente'
        WHEN 'entrada_transferencia' THEN 'Transferência de Entrada'
        WHEN 'saida_venda' THEN 'Venda de Mercadorias'
        WHEN 'saida_ajuste' THEN 'Ajuste de Saída'
        WHEN 'saida_perda' THEN 'Perda/Quebra'
        WHEN 'saida_uso_interno' THEN 'Uso Interno'
        WHEN 'saida_transferencia' THEN 'Transferência de Saída'
        WHEN 'saida_devolucao' THEN 'Devolução para Fornecedor'
        ELSE 'Outros'
    END as movimento_descricao
    
FROM movimentacoes_estoque me
JOIN products p ON me.product_id = p.id
LEFT JOIN entradas_estoque ee ON me.entrada_estoque_id = ee.id
LEFT JOIN pedidos_compra pc ON me.pedido_compra_id = pc.id
LEFT JOIN sales s ON me.sale_id = s.id
ORDER BY me.numero_sequencial DESC;

COMMENT ON TABLE movimentacoes_estoque IS 'Todas as movimentações de estoque com rastreabilidade completa';
COMMENT ON TABLE estoque_atual IS 'Snapshot do estoque atual de cada produto para consultas rápidas';
COMMENT ON VIEW vw_historico_movimentacoes IS 'Visão completa do histórico de movimentações com descrições';