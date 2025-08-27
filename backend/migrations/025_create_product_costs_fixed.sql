-- Migration: Sistema de Custos de Produtos

-- Tabela de histórico de custos dos produtos
CREATE TABLE IF NOT EXISTS produtos_custos_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Custos
    custo_anterior DECIMAL(15,2) DEFAULT 0 CHECK (custo_anterior >= 0),
    custo_novo DECIMAL(15,2) NOT NULL CHECK (custo_novo >= 0),
    variacao_percentual DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE WHEN custo_anterior > 0 
        THEN ((custo_novo - custo_anterior) / custo_anterior) * 100 
        ELSE 0 END
    ) STORED,
    
    -- Motivo da alteração
    motivo_alteracao VARCHAR(50) NOT NULL CHECK (motivo_alteracao IN (
        'entrada_compra', 'ajuste_manual', 'recontagem', 'inflacao', 
        'promocao_fornecedor', 'mudanca_fornecedor', 'outro'
    )),
    
    -- Referências
    entrada_estoque_id UUID REFERENCES entradas_estoque(id),
    user_id UUID,
    
    -- Dados adicionais
    observacoes TEXT,
    data_alteracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Dados do fornecedor (para análise de preços)
    supplier_id UUID REFERENCES suppliers(id),
    preco_compra DECIMAL(15,2) CHECK (preco_compra >= 0),
    
    -- Metadados
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de políticas de preços por produto
CREATE TABLE IF NOT EXISTS produtos_politicas_precos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Margens de lucro
    margem_minima DECIMAL(8,4) DEFAULT 0 CHECK (margem_minima >= 0),
    margem_ideal DECIMAL(8,4) DEFAULT 0 CHECK (margem_ideal >= margem_minima),
    margem_maxima DECIMAL(8,4) DEFAULT 0 CHECK (margem_maxima >= margem_ideal),
    
    -- Preços sugeridos (baseados no custo atual)
    preco_custo DECIMAL(15,2) DEFAULT 0 CHECK (preco_custo >= 0),
    preco_minimo DECIMAL(15,2) GENERATED ALWAYS AS (preco_custo * (1 + margem_minima / 100)) STORED,
    preco_ideal DECIMAL(15,2) GENERATED ALWAYS AS (preco_custo * (1 + margem_ideal / 100)) STORED,
    preco_maximo DECIMAL(15,2) GENERATED ALWAYS AS (preco_custo * (1 + margem_maxima / 100)) STORED,
    
    -- Configurações de markup
    markup_percentual DECIMAL(8,4) DEFAULT 0 CHECK (markup_percentual >= 0),
    preco_markup DECIMAL(15,2) GENERATED ALWAYS AS (preco_custo * (1 + markup_percentual / 100)) STORED,
    
    -- Preços especiais
    preco_promocional DECIMAL(15,2) CHECK (preco_promocional >= 0),
    data_inicio_promocao DATE,
    data_fim_promocao DATE,
    
    -- Controle de preços por categoria de cliente
    preco_atacado DECIMAL(15,2) CHECK (preco_atacado >= 0),
    quantidade_minima_atacado DECIMAL(15,3) DEFAULT 1,
    
    -- Metadados
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Constraint para garantir apenas uma política ativa por produto
    UNIQUE(product_id) DEFERRABLE INITIALLY DEFERRED
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_produtos_custos_product ON produtos_custos_historico(product_id);
CREATE INDEX IF NOT EXISTS idx_produtos_custos_data ON produtos_custos_historico(data_alteracao);
CREATE INDEX IF NOT EXISTS idx_produtos_custos_motivo ON produtos_custos_historico(motivo_alteracao);
CREATE INDEX IF NOT EXISTS idx_produtos_custos_supplier ON produtos_custos_historico(supplier_id);
CREATE INDEX IF NOT EXISTS idx_produtos_custos_entrada ON produtos_custos_historico(entrada_estoque_id);

CREATE INDEX IF NOT EXISTS idx_produtos_politicas_product ON produtos_politicas_precos(product_id);
CREATE INDEX IF NOT EXISTS idx_produtos_politicas_ativa ON produtos_politicas_precos(ativa) WHERE ativa = true;
CREATE INDEX IF NOT EXISTS idx_produtos_politicas_promocao ON produtos_politicas_precos(data_inicio_promocao, data_fim_promocao);

-- Função para registrar alterações de custo automaticamente
CREATE OR REPLACE FUNCTION registrar_alteracao_custo()
RETURNS TRIGGER AS $$
BEGIN
    -- Registrar histórico quando o custo médio mudar
    IF OLD.custo_medio IS DISTINCT FROM NEW.custo_medio THEN
        INSERT INTO produtos_custos_historico (
            product_id,
            custo_anterior,
            custo_novo,
            motivo_alteracao,
            observacoes
        ) VALUES (
            NEW.product_id,
            COALESCE(OLD.custo_medio, 0),
            NEW.custo_medio,
            'entrada_compra', -- Assumir que mudanças vêm de entradas
            'Atualização automática via movimentação de estoque'
        );
        
        -- Atualizar política de preços com novo custo
        UPDATE produtos_politicas_precos 
        SET 
            preco_custo = NEW.custo_medio,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = NEW.product_id AND ativa = true;
        
        -- Criar política padrão se não existir
        INSERT INTO produtos_politicas_precos (
            product_id,
            preco_custo,
            margem_minima,
            margem_ideal,
            margem_maxima,
            markup_percentual,
            created_by
        ) 
        SELECT 
            NEW.product_id,
            NEW.custo_medio,
            30.0, -- 30% margem mínima padrão
            50.0, -- 50% margem ideal padrão
            80.0, -- 80% margem máxima padrão
            60.0, -- 60% markup padrão
            NULL
        WHERE NOT EXISTS (
            SELECT 1 FROM produtos_politicas_precos 
            WHERE product_id = NEW.product_id AND ativa = true
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para registrar alterações de custo
DROP TRIGGER IF EXISTS trigger_registrar_custo_change ON estoque_atual;
CREATE TRIGGER trigger_registrar_custo_change
    AFTER UPDATE OF custo_medio ON estoque_atual
    FOR EACH ROW EXECUTE FUNCTION registrar_alteracao_custo();

-- Função para atualizar preço de venda baseado na política
CREATE OR REPLACE FUNCTION sugerir_preco_venda(p_product_id UUID)
RETURNS TABLE (
    preco_minimo_sugerido DECIMAL(15,2),
    preco_ideal_sugerido DECIMAL(15,2),
    preco_maximo_sugerido DECIMAL(15,2),
    preco_markup_sugerido DECIMAL(15,2),
    preco_atual DECIMAL(15,2),
    margem_atual DECIMAL(8,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pp.preco_minimo,
        pp.preco_ideal,
        pp.preco_maximo,
        pp.preco_markup,
        p.sale_price,
        CASE 
            WHEN pp.preco_custo > 0 AND p.sale_price > pp.preco_custo
            THEN ((p.sale_price - pp.preco_custo) / pp.preco_custo) * 100
            ELSE 0
        END as margem_atual
    FROM produtos_politicas_precos pp
    JOIN products p ON pp.product_id = p.id
    WHERE pp.product_id = p_product_id AND pp.ativa = true;
END;
$$ LANGUAGE plpgsql;

-- View para análise de rentabilidade por produto
CREATE OR REPLACE VIEW vw_analise_rentabilidade AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.barcode,
    p.sale_price as preco_venda_atual,
    
    -- Custos atuais
    ea.custo_medio as custo_atual,
    ea.quantidade_disponivel,
    ea.valor_estoque,
    
    -- Políticas de preço
    pp.preco_minimo as preco_minimo_sugerido,
    pp.preco_ideal as preco_ideal_sugerido,
    pp.preco_maximo as preco_maximo_sugerido,
    pp.preco_markup as preco_markup_sugerido,
    pp.preco_promocional,
    pp.preco_atacado,
    
    -- Margens atuais
    CASE 
        WHEN ea.custo_medio > 0 AND p.sale_price > ea.custo_medio
        THEN ((p.sale_price - ea.custo_medio) / ea.custo_medio) * 100
        ELSE 0
    END as margem_atual_percentual,
    
    CASE 
        WHEN p.sale_price > 0 AND ea.custo_medio > 0
        THEN ((p.sale_price - ea.custo_medio) / p.sale_price) * 100
        ELSE 0
    END as markup_atual_percentual,
    
    -- Lucro unitário
    p.sale_price - ea.custo_medio as lucro_unitario,
    
    -- Análise de situação
    CASE 
        WHEN p.sale_price < pp.preco_minimo THEN 'Preço Abaixo do Mínimo'
        WHEN p.sale_price >= pp.preco_minimo AND p.sale_price < pp.preco_ideal THEN 'Preço Baixo'
        WHEN p.sale_price >= pp.preco_ideal AND p.sale_price <= pp.preco_maximo THEN 'Preço Ideal'
        WHEN p.sale_price > pp.preco_maximo THEN 'Preço Alto'
        ELSE 'Sem Política Definida'
    END as situacao_preco,
    
    -- Último custo registrado
    (SELECT custo_novo 
     FROM produtos_custos_historico pch 
     WHERE pch.product_id = p.id 
     ORDER BY data_alteracao DESC 
     LIMIT 1) as ultimo_custo_registrado,
    
    -- Variação de custo recente (últimos 30 dias)
    (SELECT AVG(variacao_percentual)
     FROM produtos_custos_historico pch
     WHERE pch.product_id = p.id 
     AND data_alteracao >= CURRENT_DATE - INTERVAL '30 days') as variacao_custo_30d
    
FROM products p
LEFT JOIN estoque_atual ea ON p.id = ea.product_id
LEFT JOIN produtos_politicas_precos pp ON p.id = pp.product_id AND pp.ativa = true
WHERE p.id IS NOT NULL;

COMMENT ON TABLE produtos_custos_historico IS 'Histórico completo das alterações de custos dos produtos';
COMMENT ON TABLE produtos_politicas_precos IS 'Políticas de preços e margens por produto';
COMMENT ON VIEW vw_analise_rentabilidade IS 'Análise completa de rentabilidade e políticas de preços por produto';