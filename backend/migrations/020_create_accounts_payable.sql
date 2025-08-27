-- Migration: Criação das tabelas de contas a pagar
-- Tabelas: contas_pagar e contas_pagar_parcelas

-- Tabela principal de contas a pagar
CREATE TABLE IF NOT EXISTS contas_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_conta VARCHAR(20) UNIQUE NOT NULL, -- CP000001, CP000002, etc.
    
    -- Relações
    supplier_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    entrada_estoque_id UUID REFERENCES entradas_estoque(id) ON DELETE SET NULL,
    pedido_id UUID REFERENCES pedidos_compra(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Documento origem
    documento_tipo VARCHAR(20) DEFAULT 'nfe' CHECK (documento_tipo IN (
        'nfe', 'nota_fiscal', 'recibo', 'fatura', 'boleto', 'contrato', 'outros'
    )),
    documento_numero VARCHAR(50),
    documento_serie VARCHAR(10),
    documento_chave VARCHAR(44), -- chave NFe
    documento_valor DECIMAL(15,2) NOT NULL,
    
    -- Datas importantes
    data_emissao DATE NOT NULL,
    data_vencimento_original DATE NOT NULL,
    data_competencia DATE, -- mês de referência contábil
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Valores
    valor_original DECIMAL(15,2) NOT NULL CHECK (valor_original > 0),
    valor_desconto DECIMAL(15,2) DEFAULT 0.00,
    valor_acrescimo DECIMAL(15,2) DEFAULT 0.00,
    valor_liquido DECIMAL(15,2) NOT NULL, -- valor_original - desconto + acrescimo
    valor_pago DECIMAL(15,2) DEFAULT 0.00,
    valor_em_aberto DECIMAL(15,2) NOT NULL, -- valor_liquido - valor_pago
    
    -- Impostos retidos
    irrf_percentual DECIMAL(5,2) DEFAULT 0.00,
    irrf_valor DECIMAL(12,2) DEFAULT 0.00,
    inss_percentual DECIMAL(5,2) DEFAULT 0.00,
    inss_valor DECIMAL(12,2) DEFAULT 0.00,
    iss_percentual DECIMAL(5,2) DEFAULT 0.00,
    iss_valor DECIMAL(12,2) DEFAULT 0.00,
    pis_percentual DECIMAL(5,4) DEFAULT 0.00,
    pis_valor DECIMAL(12,2) DEFAULT 0.00,
    cofins_percentual DECIMAL(5,4) DEFAULT 0.00,
    cofins_valor DECIMAL(12,2) DEFAULT 0.00,
    csll_percentual DECIMAL(5,2) DEFAULT 0.00,
    csll_valor DECIMAL(12,2) DEFAULT 0.00,
    
    -- Status
    status VARCHAR(20) DEFAULT 'em_aberto' CHECK (status IN (
        'em_aberto', 'vencido', 'pago_parcial', 'pago_total', 'cancelado', 'renegociado'
    )),
    situacao VARCHAR(20) DEFAULT 'normal' CHECK (situacao IN (
        'normal', 'em_atraso', 'protestado', 'parcelado', 'renegociado'
    )),
    
    -- Condições de pagamento
    forma_pagamento VARCHAR(30) DEFAULT 'boleto' CHECK (forma_pagamento IN (
        'dinheiro', 'transferencia', 'boleto', 'cheque', 'cartao', 'pix', 'debito_automatico'
    )),
    condicoes_pagamento VARCHAR(50), -- 30/60/90 dias, à vista, etc.
    numero_parcelas INTEGER DEFAULT 1 CHECK (numero_parcelas > 0),
    intervalo_parcelas INTEGER DEFAULT 30, -- dias entre parcelas
    
    -- Informações bancárias
    banco_codigo VARCHAR(10),
    banco_agencia VARCHAR(10),
    banco_conta VARCHAR(20),
    banco_nosso_numero VARCHAR(50),
    codigo_barras TEXT,
    linha_digitavel TEXT,
    
    -- Centro de custo
    centro_custo VARCHAR(50),
    categoria_conta VARCHAR(30), -- materia_prima, servicos, impostos, etc.
    conta_contabil VARCHAR(20),
    
    -- Observações
    descricao TEXT NOT NULL,
    observacoes TEXT,
    observacoes_internas TEXT,
    
    -- Controle de aprovação
    requer_aprovacao BOOLEAN DEFAULT false,
    aprovado BOOLEAN DEFAULT true,
    aprovado_por UUID REFERENCES auth.users(id),
    data_aprovacao TIMESTAMP,
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Tabela de parcelas das contas a pagar
CREATE TABLE IF NOT EXISTS contas_pagar_parcelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_pagar_id UUID NOT NULL REFERENCES contas_pagar(id) ON DELETE CASCADE,
    
    -- Identificação da parcela
    numero_parcela INTEGER NOT NULL CHECK (numero_parcela > 0),
    descricao_parcela VARCHAR(100),
    
    -- Valores
    valor_parcela DECIMAL(15,2) NOT NULL CHECK (valor_parcela > 0),
    valor_desconto DECIMAL(12,2) DEFAULT 0.00,
    valor_juros DECIMAL(12,2) DEFAULT 0.00,
    valor_multa DECIMAL(12,2) DEFAULT 0.00,
    valor_correcao DECIMAL(12,2) DEFAULT 0.00,
    valor_final DECIMAL(15,2) NOT NULL, -- valor com juros/multa/correção
    valor_pago DECIMAL(15,2) DEFAULT 0.00,
    
    -- Datas
    data_vencimento DATE NOT NULL,
    data_vencimento_original DATE NOT NULL,
    data_pagamento TIMESTAMP,
    
    -- Status
    status VARCHAR(20) DEFAULT 'em_aberto' CHECK (status IN (
        'em_aberto', 'vencido', 'pago', 'pago_parcial', 'cancelado'
    )),
    dias_atraso INTEGER DEFAULT 0,
    
    -- Pagamento
    forma_pagamento VARCHAR(30),
    banco_codigo VARCHAR(10),
    banco_agencia VARCHAR(10),
    banco_conta VARCHAR(20),
    numero_documento_pagamento VARCHAR(50), -- número do cheque, transferência, etc.
    comprovante_pagamento TEXT, -- path para arquivo ou base64
    
    -- Controle
    pago_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(conta_pagar_id, numero_parcela)
);

-- Tabela de histórico de pagamentos
CREATE TABLE IF NOT EXISTS contas_pagar_pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcela_id UUID NOT NULL REFERENCES contas_pagar_parcelas(id) ON DELETE CASCADE,
    
    -- Dados do pagamento
    valor_pago DECIMAL(15,2) NOT NULL CHECK (valor_pago > 0),
    data_pagamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    forma_pagamento VARCHAR(30) NOT NULL,
    
    -- Informações bancárias/documento
    banco_codigo VARCHAR(10),
    numero_documento VARCHAR(50),
    observacoes_pagamento TEXT,
    comprovante_path VARCHAR(500),
    
    -- Usuário responsável
    pago_por UUID NOT NULL REFERENCES auth.users(id),
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_contas_pagar_supplier ON contas_pagar(supplier_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento_original);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_emissao ON contas_pagar(data_emissao);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_entrada ON contas_pagar(entrada_estoque_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_documento ON contas_pagar(documento_numero);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_categoria ON contas_pagar(categoria_conta);

CREATE INDEX IF NOT EXISTS idx_contas_pagar_parcelas_conta ON contas_pagar_parcelas(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_parcelas_vencimento ON contas_pagar_parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_parcelas_status ON contas_pagar_parcelas(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_parcelas_atraso ON contas_pagar_parcelas(dias_atraso) WHERE dias_atraso > 0;

CREATE INDEX IF NOT EXISTS idx_contas_pagar_pagamentos_parcela ON contas_pagar_pagamentos(parcela_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_pagamentos_data ON contas_pagar_pagamentos(data_pagamento);

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_contas_pagar_updated_at
    BEFORE UPDATE ON contas_pagar
    FOR EACH ROW
    EXECUTE FUNCTION update_estoque_updated_at();

CREATE TRIGGER trigger_contas_pagar_parcelas_updated_at
    BEFORE UPDATE ON contas_pagar_parcelas
    FOR EACH ROW
    EXECUTE FUNCTION update_estoque_updated_at();

-- Função para gerar número da conta automaticamente
CREATE OR REPLACE FUNCTION generate_numero_conta()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    new_numero VARCHAR(20);
BEGIN
    IF NEW.numero_conta IS NULL THEN
        -- Buscar próximo número
        SELECT COALESCE(
            MAX(CAST(SUBSTRING(numero_conta FROM 3) AS INTEGER)) + 1, 
            1
        ) INTO next_number
        FROM contas_pagar 
        WHERE numero_conta ~ '^CP[0-9]+$';
        
        -- Formatar número com zeros à esquerda
        new_numero := 'CP' || LPAD(next_number::TEXT, 6, '0');
        NEW.numero_conta := new_numero;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_numero_conta
    BEFORE INSERT ON contas_pagar
    FOR EACH ROW
    EXECUTE FUNCTION generate_numero_conta();

-- Função para calcular valor líquido automaticamente
CREATE OR REPLACE FUNCTION calcular_valor_liquido_conta()
RETURNS TRIGGER AS $$
BEGIN
    NEW.valor_liquido := NEW.valor_original - COALESCE(NEW.valor_desconto, 0) + COALESCE(NEW.valor_acrescimo, 0);
    NEW.valor_em_aberto := NEW.valor_liquido - COALESCE(NEW.valor_pago, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_valor_liquido
    BEFORE INSERT OR UPDATE ON contas_pagar
    FOR EACH ROW
    EXECUTE FUNCTION calcular_valor_liquido_conta();

-- Função para calcular dias de atraso nas parcelas
CREATE OR REPLACE FUNCTION calcular_dias_atraso()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular dias de atraso
    IF NEW.status IN ('em_aberto', 'vencido', 'pago_parcial') AND NEW.data_vencimento < CURRENT_DATE THEN
        NEW.dias_atraso := CURRENT_DATE - NEW.data_vencimento;
        NEW.status := 'vencido';
    ELSE
        NEW.dias_atraso := 0;
    END IF;
    
    -- Calcular valor final com juros/multa se em atraso
    IF NEW.dias_atraso > 0 THEN
        -- Aplicar juros de 1% ao mês (0.033% ao dia)
        NEW.valor_juros := NEW.valor_parcela * 0.0033 * NEW.dias_atraso;
        
        -- Aplicar multa de 2% após 30 dias
        IF NEW.dias_atraso > 30 THEN
            NEW.valor_multa := NEW.valor_parcela * 0.02;
        END IF;
    END IF;
    
    NEW.valor_final := NEW.valor_parcela + COALESCE(NEW.valor_juros, 0) + COALESCE(NEW.valor_multa, 0) + COALESCE(NEW.valor_correcao, 0) - COALESCE(NEW.valor_desconto, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_dias_atraso
    BEFORE INSERT OR UPDATE ON contas_pagar_parcelas
    FOR EACH ROW
    EXECUTE FUNCTION calcular_dias_atraso();

-- Função para criar parcelas automaticamente
CREATE OR REPLACE FUNCTION criar_parcelas_automaticamente()
RETURNS TRIGGER AS $$
DECLARE
    i INTEGER;
    valor_parcela DECIMAL(15,2);
    data_venc DATE;
BEGIN
    -- Só criar parcelas se não existirem
    IF NOT EXISTS (SELECT 1 FROM contas_pagar_parcelas WHERE conta_pagar_id = NEW.id) THEN
        valor_parcela := NEW.valor_liquido / NEW.numero_parcelas;
        
        FOR i IN 1..NEW.numero_parcelas LOOP
            data_venc := NEW.data_vencimento_original + ((i - 1) * NEW.intervalo_parcelas);
            
            INSERT INTO contas_pagar_parcelas (
                conta_pagar_id,
                numero_parcela,
                descricao_parcela,
                valor_parcela,
                valor_final,
                data_vencimento,
                data_vencimento_original
            ) VALUES (
                NEW.id,
                i,
                'Parcela ' || i || ' de ' || NEW.numero_parcelas,
                valor_parcela,
                valor_parcela,
                data_venc,
                data_venc
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_criar_parcelas
    AFTER INSERT ON contas_pagar
    FOR EACH ROW
    EXECUTE FUNCTION criar_parcelas_automaticamente();

-- Função para atualizar status da conta principal quando parcelas são pagas
CREATE OR REPLACE FUNCTION atualizar_status_conta_principal()
RETURNS TRIGGER AS $$
DECLARE
    total_parcelas INTEGER;
    parcelas_pagas INTEGER;
    valor_total_conta DECIMAL(15,2);
    valor_total_pago DECIMAL(15,2);
BEGIN
    -- Buscar informações da conta principal
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'pago'),
        SUM(valor_final),
        SUM(valor_pago)
    INTO total_parcelas, parcelas_pagas, valor_total_conta, valor_total_pago
    FROM contas_pagar_parcelas 
    WHERE conta_pagar_id = COALESCE(NEW.conta_pagar_id, OLD.conta_pagar_id);
    
    -- Atualizar status da conta principal
    UPDATE contas_pagar SET
        valor_pago = COALESCE(valor_total_pago, 0),
        valor_em_aberto = valor_liquido - COALESCE(valor_total_pago, 0),
        status = CASE 
            WHEN parcelas_pagas = 0 THEN 'em_aberto'
            WHEN parcelas_pagas = total_parcelas THEN 'pago_total'
            ELSE 'pago_parcial'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.conta_pagar_id, OLD.conta_pagar_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_status_conta
    AFTER INSERT OR UPDATE OR DELETE ON contas_pagar_parcelas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_status_conta_principal();

-- RLS (Row Level Security)
ALTER TABLE contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_pagar_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_pagar_pagamentos ENABLE ROW LEVEL SECURITY;

-- Views úteis para relatórios
CREATE OR REPLACE VIEW vw_contas_pagar_resumo AS
SELECT 
    cp.id,
    cp.numero_conta,
    cp.supplier_id,
    c.name as fornecedor,
    cp.documento_numero,
    cp.data_emissao,
    cp.data_vencimento_original,
    cp.valor_original,
    cp.valor_liquido,
    cp.valor_pago,
    cp.valor_em_aberto,
    cp.status,
    cp.categoria_conta,
    -- Próximo vencimento
    (SELECT MIN(data_vencimento) 
     FROM contas_pagar_parcelas 
     WHERE conta_pagar_id = cp.id AND status IN ('em_aberto', 'vencido')
    ) as proximo_vencimento,
    -- Dias para vencimento
    (SELECT MIN(data_vencimento) - CURRENT_DATE
     FROM contas_pagar_parcelas 
     WHERE conta_pagar_id = cp.id AND status IN ('em_aberto', 'vencido')
    ) as dias_para_vencimento
FROM contas_pagar cp
JOIN contacts c ON cp.supplier_id = c.id
WHERE cp.status != 'cancelado';

-- Comentários para documentação
COMMENT ON TABLE contas_pagar IS 'Contas a pagar - obrigações financeiras com fornecedores';
COMMENT ON TABLE contas_pagar_parcelas IS 'Parcelas das contas a pagar';
COMMENT ON TABLE contas_pagar_pagamentos IS 'Histórico de pagamentos realizados';

COMMENT ON COLUMN contas_pagar.numero_conta IS 'Número sequencial da conta (CP000001)';
COMMENT ON COLUMN contas_pagar.valor_liquido IS 'Valor original menos desconto mais acréscimo';
COMMENT ON COLUMN contas_pagar.status IS 'em_aberto, vencido, pago_parcial, pago_total, cancelado, renegociado';

COMMENT ON VIEW vw_contas_pagar_resumo IS 'View resumida das contas a pagar com informações principais';