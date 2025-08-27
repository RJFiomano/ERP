-- Migration: Criação da tabela de movimentações de estoque
-- Tabela: movimentacoes_estoque (histórico completo de todas as movimentações)

-- Tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Produto
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Tipo de movimentação
    tipo_movimentacao VARCHAR(20) NOT NULL CHECK (tipo_movimentacao IN (
        'entrada_compra',      -- Entrada por compra
        'entrada_devolucao',   -- Entrada por devolução de cliente
        'entrada_transferencia', -- Entrada por transferência entre estoques
        'entrada_ajuste',      -- Entrada por ajuste de inventário
        'entrada_producao',    -- Entrada por produção
        'saida_venda',         -- Saída por venda
        'saida_devolucao',     -- Saída por devolução para fornecedor
        'saida_transferencia', -- Saída por transferência entre estoques
        'saida_ajuste',        -- Saída por ajuste de inventário
        'saida_perda',         -- Saída por perda/avaria
        'saida_uso_interno',   -- Saída para uso interno da empresa
        'saida_brinde'         -- Saída como brinde/amostra grátis
    )),
    
    -- Quantidades
    quantidade_anterior DECIMAL(12,3) NOT NULL, -- estoque antes da movimentação
    quantidade_movimentada DECIMAL(12,3) NOT NULL, -- quantidade da movimentação (+ ou -)
    quantidade_atual DECIMAL(12,3) NOT NULL, -- estoque após a movimentação
    
    -- Valores
    custo_unitario DECIMAL(12,2) NOT NULL DEFAULT 0.00, -- custo unitário no momento
    custo_medio_anterior DECIMAL(12,2) DEFAULT 0.00, -- custo médio antes
    custo_medio_atual DECIMAL(12,2) DEFAULT 0.00, -- custo médio após
    valor_total_movimentacao DECIMAL(15,2) DEFAULT 0.00, -- custo_unitario * quantidade
    
    -- Referências (origem da movimentação)
    entrada_estoque_id UUID REFERENCES entradas_estoque(id) ON DELETE SET NULL,
    entrada_item_id UUID REFERENCES entradas_estoque_itens(id) ON DELETE SET NULL,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL, -- referência para vendas
    pedido_id UUID REFERENCES pedidos_compra(id) ON DELETE SET NULL,
    documento_origem VARCHAR(50), -- número do documento que gerou a movimentação
    
    -- Informações de lote/validade
    lote VARCHAR(50),
    data_validade DATE,
    numero_serie VARCHAR(50),
    
    -- Localização no estoque
    localizacao_origem VARCHAR(100), -- onde estava antes
    localizacao_destino VARCHAR(100), -- onde ficou depois
    
    -- Datas
    data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_documento DATE, -- data do documento que originou
    
    -- Usuário responsável
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Observações
    observacoes TEXT,
    motivo TEXT, -- motivo específico da movimentação
    
    -- Controle de reversão
    movimentacao_reversa_id UUID REFERENCES movimentacoes_estoque(id), -- se foi estornada
    eh_reversao BOOLEAN DEFAULT false, -- se é uma movimentação de estorno
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (quantidade_movimentada != 0), -- não pode ser zero
    CHECK (quantidade_atual >= 0) -- estoque não pode ficar negativo
);

-- Tabela para controle de estoque atual (resumo)
CREATE TABLE IF NOT EXISTS estoque_atual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID UNIQUE NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Quantidades
    quantidade_disponivel DECIMAL(12,3) DEFAULT 0.00,
    quantidade_reservada DECIMAL(12,3) DEFAULT 0.00, -- reservado para vendas
    quantidade_total DECIMAL(12,3) DEFAULT 0.00, -- disponível + reservada
    
    -- Custos
    custo_medio DECIMAL(12,2) DEFAULT 0.00,
    valor_estoque DECIMAL(15,2) DEFAULT 0.00, -- quantidade_total * custo_medio
    
    -- Estoque mínimo/máximo
    estoque_minimo DECIMAL(12,3) DEFAULT 0.00,
    estoque_maximo DECIMAL(12,3) DEFAULT 0.00,
    ponto_reposicao DECIMAL(12,3) DEFAULT 0.00,
    
    -- Localização principal
    localizacao_principal VARCHAR(100),
    
    -- Controle de movimentação
    ultima_entrada TIMESTAMP,
    ultima_saida TIMESTAMP,
    ultima_movimentacao TIMESTAMP,
    
    -- Indicadores
    precisa_reposicao BOOLEAN GENERATED ALWAYS AS (quantidade_disponivel <= ponto_reposicao) STORED,
    estoque_zerado BOOLEAN GENERATED ALWAYS AS (quantidade_total <= 0) STORED,
    estoque_negativo BOOLEAN GENERATED ALWAYS AS (quantidade_disponivel < 0) STORED,
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_produto ON movimentacoes_estoque(product_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_tipo ON movimentacoes_estoque(tipo_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_data ON movimentacoes_estoque(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_entrada ON movimentacoes_estoque(entrada_estoque_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_sale ON movimentacoes_estoque(sale_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_lote ON movimentacoes_estoque(lote);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_user ON movimentacoes_estoque(user_id);

CREATE INDEX IF NOT EXISTS idx_estoque_atual_produto ON estoque_atual(product_id);
CREATE INDEX IF NOT EXISTS idx_estoque_atual_reposicao ON estoque_atual(precisa_reposicao) WHERE precisa_reposicao = true;
CREATE INDEX IF NOT EXISTS idx_estoque_atual_zerado ON estoque_atual(estoque_zerado) WHERE estoque_zerado = true;
CREATE INDEX IF NOT EXISTS idx_estoque_atual_negativo ON estoque_atual(estoque_negativo) WHERE estoque_negativo = true;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_estoque_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_movimentacoes_estoque_updated_at
    BEFORE UPDATE ON movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION update_estoque_updated_at();

CREATE TRIGGER trigger_estoque_atual_updated_at
    BEFORE UPDATE ON estoque_atual
    FOR EACH ROW
    EXECUTE FUNCTION update_estoque_updated_at();

-- Função para atualizar estoque atual após movimentação
CREATE OR REPLACE FUNCTION atualizar_estoque_atual()
RETURNS TRIGGER AS $$
DECLARE
    estoque_row estoque_atual%ROWTYPE;
    nova_quantidade DECIMAL(12,3);
    novo_custo_medio DECIMAL(12,2);
    novo_valor_estoque DECIMAL(15,2);
BEGIN
    -- Buscar registro do estoque atual
    SELECT * INTO estoque_row FROM estoque_atual WHERE product_id = NEW.product_id;
    
    -- Se não existe, criar
    IF NOT FOUND THEN
        INSERT INTO estoque_atual (
            product_id, 
            quantidade_disponivel, 
            quantidade_total,
            custo_medio,
            valor_estoque,
            ultima_movimentacao
        ) VALUES (
            NEW.product_id,
            NEW.quantidade_atual,
            NEW.quantidade_atual,
            NEW.custo_medio_atual,
            NEW.quantidade_atual * NEW.custo_medio_atual,
            NEW.data_movimentacao
        );
    ELSE
        -- Atualizar estoque existente
        UPDATE estoque_atual SET
            quantidade_disponivel = NEW.quantidade_atual,
            quantidade_total = NEW.quantidade_atual + COALESCE(quantidade_reservada, 0),
            custo_medio = NEW.custo_medio_atual,
            valor_estoque = (NEW.quantidade_atual + COALESCE(quantidade_reservada, 0)) * NEW.custo_medio_atual,
            ultima_movimentacao = NEW.data_movimentacao,
            ultima_entrada = CASE 
                WHEN NEW.quantidade_movimentada > 0 THEN NEW.data_movimentacao 
                ELSE ultima_entrada 
            END,
            ultima_saida = CASE 
                WHEN NEW.quantidade_movimentada < 0 THEN NEW.data_movimentacao 
                ELSE ultima_saida 
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_estoque_atual
    AFTER INSERT ON movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_estoque_atual();

-- Função para calcular custo médio
CREATE OR REPLACE FUNCTION calcular_custo_medio(
    p_product_id UUID,
    p_quantidade_anterior DECIMAL(12,3),
    p_custo_anterior DECIMAL(12,2),
    p_quantidade_entrada DECIMAL(12,3),
    p_custo_entrada DECIMAL(12,2)
) RETURNS DECIMAL(12,2) AS $$
DECLARE
    novo_custo_medio DECIMAL(12,2);
    quantidade_total DECIMAL(12,3);
    valor_total DECIMAL(15,2);
BEGIN
    -- Se é saída, mantém custo anterior
    IF p_quantidade_entrada < 0 THEN
        RETURN p_custo_anterior;
    END IF;
    
    -- Se estoque estava zerado, usar custo da entrada
    IF p_quantidade_anterior <= 0 THEN
        RETURN p_custo_entrada;
    END IF;
    
    -- Calcular média ponderada
    quantidade_total := p_quantidade_anterior + p_quantidade_entrada;
    valor_total := (p_quantidade_anterior * p_custo_anterior) + (p_quantidade_entrada * p_custo_entrada);
    
    IF quantidade_total > 0 THEN
        novo_custo_medio := valor_total / quantidade_total;
    ELSE
        novo_custo_medio := p_custo_anterior;
    END IF;
    
    RETURN ROUND(novo_custo_medio, 2);
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security)
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_atual ENABLE ROW LEVEL SECURITY;

-- Views úteis para relatórios
CREATE OR REPLACE VIEW vw_estoque_produtos AS
SELECT 
    p.id,
    p.name,
    p.barcode,
    p.category_id,
    ea.quantidade_disponivel,
    ea.quantidade_reservada,
    ea.quantidade_total,
    ea.custo_medio,
    ea.valor_estoque,
    p.sale_price,
    (p.sale_price - ea.custo_medio) as margem_unitaria,
    CASE 
        WHEN ea.custo_medio > 0 THEN 
            ROUND(((p.sale_price - ea.custo_medio) / ea.custo_medio * 100), 2)
        ELSE 0 
    END as margem_percentual,
    ea.precisa_reposicao,
    ea.estoque_zerado,
    ea.estoque_negativo,
    ea.ultima_entrada,
    ea.ultima_saida
FROM products p
LEFT JOIN estoque_atual ea ON p.id = ea.product_id;

-- Comentários para documentação
COMMENT ON TABLE movimentacoes_estoque IS 'Histórico completo de todas as movimentações de estoque';
COMMENT ON TABLE estoque_atual IS 'Situação atual do estoque de cada produto';

COMMENT ON COLUMN movimentacoes_estoque.tipo_movimentacao IS 'Tipo da movimentação: entrada_compra, saida_venda, etc.';
COMMENT ON COLUMN movimentacoes_estoque.quantidade_movimentada IS 'Quantidade movimentada (positiva=entrada, negativa=saída)';
COMMENT ON COLUMN movimentacoes_estoque.custo_medio_atual IS 'Custo médio do produto após esta movimentação';

COMMENT ON VIEW vw_estoque_produtos IS 'View consolidada com informações de estoque e margem de lucro';