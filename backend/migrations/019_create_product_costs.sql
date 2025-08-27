-- Migration: Criação da tabela de custos de produtos
-- Tabela: custos_produtos (histórico de custos e preços por produto)

-- Tabela de histórico de custos
CREATE TABLE IF NOT EXISTS custos_produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Custos
    custo_compra DECIMAL(12,2) NOT NULL, -- custo de aquisição
    custo_adicional DECIMAL(12,2) DEFAULT 0.00, -- frete, seguro, etc.
    custo_total DECIMAL(12,2) NOT NULL, -- custo_compra + custo_adicional
    
    -- Impostos
    icms_recuperavel DECIMAL(12,2) DEFAULT 0.00, -- ICMS que pode ser recuperado
    ipi_valor DECIMAL(12,2) DEFAULT 0.00,
    pis_valor DECIMAL(12,2) DEFAULT 0.00,
    cofins_valor DECIMAL(12,2) DEFAULT 0.00,
    outros_impostos DECIMAL(12,2) DEFAULT 0.00,
    
    -- Custo final
    custo_liquido DECIMAL(12,2) NOT NULL, -- custo_total - impostos_recuperaveis
    
    -- Preços sugeridos (baseado no custo)
    margem_minima DECIMAL(5,2) DEFAULT 0.00, -- % margem mínima desejada
    margem_ideal DECIMAL(5,2) DEFAULT 30.00, -- % margem ideal
    preco_sugerido_minimo DECIMAL(12,2), -- baseado na margem mínima
    preco_sugerido_ideal DECIMAL(12,2), -- baseado na margem ideal
    
    -- Origem do custo
    tipo_custo VARCHAR(20) DEFAULT 'compra' CHECK (tipo_custo IN (
        'compra', 'importacao', 'producao', 'ajuste', 'reavaliacao'
    )),
    
    -- Referências
    entrada_estoque_id UUID REFERENCES entradas_estoque(id) ON DELETE SET NULL,
    entrada_item_id UUID REFERENCES entradas_estoque_itens(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    
    -- Informações da compra
    quantidade_comprada DECIMAL(12,3) NOT NULL DEFAULT 1.000,
    valor_total_compra DECIMAL(15,2) NOT NULL, -- custo_total * quantidade
    numero_nfe VARCHAR(20),
    data_compra DATE NOT NULL,
    
    -- Informações de moeda (para importações)
    moeda VARCHAR(3) DEFAULT 'BRL',
    taxa_cambio DECIMAL(10,4) DEFAULT 1.0000,
    custo_moeda_original DECIMAL(12,2),
    
    -- Status
    ativo BOOLEAN DEFAULT true, -- se este custo está ativo para cálculos
    motivo_inativacao VARCHAR(100),
    
    -- Validade do custo
    data_validade_inicio DATE DEFAULT CURRENT_DATE,
    data_validade_fim DATE,
    
    -- Controle
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (custo_compra >= 0),
    CHECK (custo_adicional >= 0),
    CHECK (custo_total >= custo_compra),
    CHECK (quantidade_comprada > 0),
    CHECK (margem_minima >= 0 AND margem_minima <= 1000),
    CHECK (margem_ideal >= 0 AND margem_ideal <= 1000)
);

-- Tabela para política de preços
CREATE TABLE IF NOT EXISTS politicas_precos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Configurações de margem
    margem_minima DECIMAL(5,2) DEFAULT 10.00, -- % margem mínima
    margem_padrao DECIMAL(5,2) DEFAULT 30.00, -- % margem padrão
    margem_maxima DECIMAL(5,2) DEFAULT 100.00, -- % margem máxima
    
    -- Preços calculados automaticamente
    preco_custo DECIMAL(12,2) NOT NULL, -- último custo conhecido
    preco_minimo DECIMAL(12,2) NOT NULL, -- baseado na margem mínima
    preco_padrao DECIMAL(12,2) NOT NULL, -- baseado na margem padrão
    preco_maximo DECIMAL(12,2) NOT NULL, -- baseado na margem máxima
    
    -- Preços manuais (override dos calculados)
    preco_manual_minimo DECIMAL(12,2),
    preco_manual_padrao DECIMAL(12,2),
    preco_manual_maximo DECIMAL(12,2),
    
    -- Configurações específicas
    permite_venda_abaixo_custo BOOLEAN DEFAULT false,
    permite_desconto_maximo DECIMAL(5,2) DEFAULT 10.00, -- % desconto máximo permitido
    
    -- Preço de promoção
    preco_promocional DECIMAL(12,2),
    data_promocao_inicio DATE,
    data_promocao_fim DATE,
    promocao_ativa BOOLEAN DEFAULT false,
    
    -- Preços por categoria de cliente (futuro)
    preco_atacado DECIMAL(12,2),
    preco_varejo DECIMAL(12,2),
    preco_distribuidor DECIMAL(12,2),
    
    -- Controle
    ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(product_id),
    CHECK (margem_minima >= 0),
    CHECK (margem_padrao >= margem_minima),
    CHECK (margem_maxima >= margem_padrao),
    CHECK (preco_minimo <= preco_padrao),
    CHECK (preco_padrao <= preco_maximo)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_custos_produtos_product ON custos_produtos(product_id);
CREATE INDEX IF NOT EXISTS idx_custos_produtos_data ON custos_produtos(data_compra);
CREATE INDEX IF NOT EXISTS idx_custos_produtos_supplier ON custos_produtos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_custos_produtos_entrada ON custos_produtos(entrada_estoque_id);
CREATE INDEX IF NOT EXISTS idx_custos_produtos_ativo ON custos_produtos(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_custos_produtos_tipo ON custos_produtos(tipo_custo);

CREATE INDEX IF NOT EXISTS idx_politicas_precos_product ON politicas_precos(product_id);
CREATE INDEX IF NOT EXISTS idx_politicas_precos_promocao ON politicas_precos(promocao_ativa) WHERE promocao_ativa = true;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_custos_produtos_updated_at
    BEFORE UPDATE ON custos_produtos
    FOR EACH ROW
    EXECUTE FUNCTION update_estoque_updated_at();

-- Trigger para calcular preços sugeridos automaticamente
CREATE OR REPLACE FUNCTION calcular_precos_sugeridos()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular preço sugerido mínimo
    IF NEW.margem_minima > 0 THEN
        NEW.preco_sugerido_minimo := NEW.custo_liquido * (1 + NEW.margem_minima / 100);
    ELSE
        NEW.preco_sugerido_minimo := NEW.custo_liquido;
    END IF;
    
    -- Calcular preço sugerido ideal
    IF NEW.margem_ideal > 0 THEN
        NEW.preco_sugerido_ideal := NEW.custo_liquido * (1 + NEW.margem_ideal / 100);
    ELSE
        NEW.preco_sugerido_ideal := NEW.custo_liquido;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_precos_sugeridos
    BEFORE INSERT OR UPDATE ON custos_produtos
    FOR EACH ROW
    EXECUTE FUNCTION calcular_precos_sugeridos();

-- Trigger para atualizar política de preços quando novo custo é inserido
CREATE OR REPLACE FUNCTION atualizar_politica_precos()
RETURNS TRIGGER AS $$
DECLARE
    politica_row politicas_precos%ROWTYPE;
BEGIN
    -- Buscar política existente
    SELECT * INTO politica_row FROM politicas_precos WHERE product_id = NEW.product_id;
    
    -- Se não existe, criar com valores padrão
    IF NOT FOUND THEN
        INSERT INTO politicas_precos (
            product_id,
            preco_custo,
            preco_minimo,
            preco_padrao,
            preco_maximo
        ) VALUES (
            NEW.product_id,
            NEW.custo_liquido,
            NEW.custo_liquido * 1.10, -- 10% margem mínima
            NEW.custo_liquido * 1.30, -- 30% margem padrão
            NEW.custo_liquido * 2.00  -- 100% margem máxima
        );
    ELSE
        -- Atualizar política existente apenas se o novo custo for mais recente
        IF NEW.ativo = true THEN
            UPDATE politicas_precos SET
                preco_custo = NEW.custo_liquido,
                preco_minimo = NEW.custo_liquido * (1 + margem_minima / 100),
                preco_padrao = NEW.custo_liquido * (1 + margem_padrao / 100),
                preco_maximo = NEW.custo_liquido * (1 + margem_maxima / 100),
                ultima_atualizacao = CURRENT_TIMESTAMP
            WHERE product_id = NEW.product_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_politica_precos
    AFTER INSERT OR UPDATE ON custos_produtos
    FOR EACH ROW
    WHEN (NEW.ativo = true)
    EXECUTE FUNCTION atualizar_politica_precos();

-- Função para obter custo atual do produto
CREATE OR REPLACE FUNCTION get_custo_atual_produto(p_product_id UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    custo_atual DECIMAL(12,2);
BEGIN
    SELECT custo_liquido INTO custo_atual
    FROM custos_produtos
    WHERE product_id = p_product_id 
        AND ativo = true
        AND (data_validade_fim IS NULL OR data_validade_fim >= CURRENT_DATE)
    ORDER BY data_compra DESC, created_at DESC
    LIMIT 1;
    
    RETURN COALESCE(custo_atual, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Função para calcular margem de lucro
CREATE OR REPLACE FUNCTION calcular_margem_lucro(
    p_preco_venda DECIMAL(12,2),
    p_custo DECIMAL(12,2)
) RETURNS DECIMAL(5,2) AS $$
BEGIN
    IF p_custo <= 0 THEN
        RETURN 0.00;
    END IF;
    
    RETURN ROUND(((p_preco_venda - p_custo) / p_custo * 100), 2);
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security)
ALTER TABLE custos_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE politicas_precos ENABLE ROW LEVEL SECURITY;

-- View para análise de custos e margens
CREATE OR REPLACE VIEW vw_analise_custos_produtos AS
SELECT 
    p.id,
    p.name,
    p.barcode,
    p.sale_price as preco_venda_atual,
    
    -- Custo atual
    cp.custo_liquido as custo_atual,
    cp.data_compra as data_ultimo_custo,
    cp.supplier_id,
    c.name as fornecedor,
    
    -- Margens
    calcular_margem_lucro(p.sale_price, cp.custo_liquido) as margem_atual,
    
    -- Política de preços
    pp.preco_minimo,
    pp.preco_padrao,
    pp.preco_maximo,
    pp.margem_minima,
    pp.margem_padrao,
    pp.margem_maxima,
    
    -- Promoção
    pp.promocao_ativa,
    pp.preco_promocional,
    pp.data_promocao_inicio,
    pp.data_promocao_fim,
    
    -- Status
    CASE 
        WHEN p.sale_price < cp.custo_liquido THEN 'PREJUIZO'
        WHEN p.sale_price < pp.preco_minimo THEN 'ABAIXO_MINIMO'
        WHEN p.sale_price > pp.preco_maximo THEN 'ACIMA_MAXIMO'
        ELSE 'OK'
    END as status_preco
    
FROM products p
LEFT JOIN custos_produtos cp ON p.id = cp.product_id 
    AND cp.ativo = true
    AND (cp.data_validade_fim IS NULL OR cp.data_validade_fim >= CURRENT_DATE)
LEFT JOIN politicas_precos pp ON p.id = pp.product_id
LEFT JOIN contacts c ON cp.supplier_id = c.id
WHERE cp.id IS NOT NULL 
    OR EXISTS (SELECT 1 FROM custos_produtos WHERE product_id = p.id)
ORDER BY p.name;

-- Comentários para documentação
COMMENT ON TABLE custos_produtos IS 'Histórico de custos de produtos com informações fiscais';
COMMENT ON TABLE politicas_precos IS 'Políticas de preços e margens por produto';

COMMENT ON COLUMN custos_produtos.custo_liquido IS 'Custo final após descontar impostos recuperáveis';
COMMENT ON COLUMN custos_produtos.tipo_custo IS 'Origem do custo: compra, importacao, producao, ajuste, reavaliacao';
COMMENT ON COLUMN custos_produtos.ativo IS 'Se este custo está ativo para cálculos de preço';

COMMENT ON VIEW vw_analise_custos_produtos IS 'View para análise de custos, margens e política de preços';