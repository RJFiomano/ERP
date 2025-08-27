-- Migration: Sistema de Contas a Pagar
-- Adaptado para usar a tabela suppliers existente

-- Sequência para numeração automática das contas
CREATE SEQUENCE IF NOT EXISTS seq_conta_pagar_numero START 1;

-- Tabela principal de contas a pagar
CREATE TABLE IF NOT EXISTS contas_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_conta VARCHAR(20) UNIQUE NOT NULL DEFAULT 'CP' || LPAD(nextval('seq_conta_pagar_numero')::TEXT, 6, '0'),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    entrada_estoque_id UUID REFERENCES entradas_estoque(id),
    pedido_id UUID REFERENCES pedidos_compra(id),
    user_id UUID, -- Usuário responsável
    
    -- Dados do documento fiscal
    documento_tipo VARCHAR(30) DEFAULT 'nfe' CHECK (documento_tipo IN ('nfe', 'nota_fiscal', 'recibo', 'fatura', 'boleto', 'contrato', 'outros')),
    documento_numero VARCHAR(50) NOT NULL,
    documento_serie VARCHAR(10),
    documento_chave VARCHAR(44),
    documento_valor DECIMAL(15,2) CHECK (documento_valor >= 0),
    
    -- Datas
    data_emissao DATE NOT NULL,
    data_vencimento_original DATE NOT NULL,
    data_competencia DATE DEFAULT CURRENT_DATE,
    
    -- Valores
    valor_original DECIMAL(15,2) NOT NULL CHECK (valor_original > 0),
    valor_desconto DECIMAL(15,2) DEFAULT 0 CHECK (valor_desconto >= 0),
    valor_acrescimo DECIMAL(15,2) DEFAULT 0 CHECK (valor_acrescimo >= 0),
    valor_liquido DECIMAL(15,2) GENERATED ALWAYS AS (valor_original - valor_desconto + valor_acrescimo) STORED,
    valor_pago DECIMAL(15,2) DEFAULT 0 CHECK (valor_pago >= 0),
    valor_em_aberto DECIMAL(15,2) GENERATED ALWAYS AS (valor_original - valor_desconto + valor_acrescimo - valor_pago) STORED,
    
    -- Impostos retidos
    irrf_percentual DECIMAL(5,2) DEFAULT 0 CHECK (irrf_percentual >= 0 AND irrf_percentual <= 100),
    irrf_valor DECIMAL(15,2) GENERATED ALWAYS AS (valor_original * irrf_percentual / 100) STORED,
    inss_percentual DECIMAL(5,2) DEFAULT 0 CHECK (inss_percentual >= 0 AND inss_percentual <= 100),
    inss_valor DECIMAL(15,2) GENERATED ALWAYS AS (valor_original * inss_percentual / 100) STORED,
    iss_percentual DECIMAL(5,2) DEFAULT 0 CHECK (iss_percentual >= 0 AND iss_percentual <= 100),
    iss_valor DECIMAL(15,2) GENERATED ALWAYS AS (valor_original * iss_percentual / 100) STORED,
    pis_percentual DECIMAL(5,2) DEFAULT 0 CHECK (pis_percentual >= 0 AND pis_percentual <= 100),
    pis_valor DECIMAL(15,2) GENERATED ALWAYS AS (valor_original * pis_percentual / 100) STORED,
    cofins_percentual DECIMAL(5,2) DEFAULT 0 CHECK (cofins_percentual >= 0 AND cofins_percentual <= 100),
    cofins_valor DECIMAL(15,2) GENERATED ALWAYS AS (valor_original * cofins_percentual / 100) STORED,
    csll_percentual DECIMAL(5,2) DEFAULT 0 CHECK (csll_percentual >= 0 AND csll_percentual <= 100),
    csll_valor DECIMAL(15,2) GENERATED ALWAYS AS (valor_original * csll_percentual / 100) STORED,
    
    -- Status e situação
    status VARCHAR(20) DEFAULT 'em_aberto' CHECK (status IN ('em_aberto', 'pago_parcial', 'pago', 'cancelado', 'contestado')),
    situacao VARCHAR(20) DEFAULT 'normal' CHECK (situacao IN ('normal', 'vencido', 'negociado', 'parcelado', 'suspenso')),
    
    -- Condições de pagamento
    forma_pagamento VARCHAR(30) DEFAULT 'boleto' CHECK (forma_pagamento IN ('dinheiro', 'transferencia', 'boleto', 'cheque', 'cartao', 'pix', 'debito_automatico')),
    condicoes_pagamento TEXT,
    numero_parcelas INTEGER DEFAULT 1 CHECK (numero_parcelas >= 1),
    intervalo_parcelas INTEGER DEFAULT 30 CHECK (intervalo_parcelas >= 1),
    
    -- Centro de custo e categoria
    centro_custo VARCHAR(50),
    categoria_conta VARCHAR(50),
    
    -- Observações
    descricao TEXT NOT NULL,
    observacoes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT chk_documento_chave_length CHECK (documento_chave IS NULL OR LENGTH(documento_chave) = 44),
    CONSTRAINT chk_valores_positivos CHECK (valor_original > 0 AND valor_desconto >= 0 AND valor_acrescimo >= 0)
);

-- Tabela de parcelas das contas a pagar
CREATE TABLE IF NOT EXISTS contas_pagar_parcelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_pagar_id UUID NOT NULL REFERENCES contas_pagar(id) ON DELETE CASCADE,
    
    -- Informações da parcela
    numero_parcela INTEGER NOT NULL CHECK (numero_parcela >= 1),
    valor_parcela DECIMAL(15,2) NOT NULL CHECK (valor_parcela > 0),
    valor_juros DECIMAL(15,2) DEFAULT 0 CHECK (valor_juros >= 0),
    valor_multa DECIMAL(15,2) DEFAULT 0 CHECK (valor_multa >= 0),
    valor_desconto DECIMAL(15,2) DEFAULT 0 CHECK (valor_desconto >= 0),
    valor_final DECIMAL(15,2) GENERATED ALWAYS AS (valor_parcela + valor_juros + valor_multa - valor_desconto) STORED,
    valor_pago DECIMAL(15,2) DEFAULT 0 CHECK (valor_pago >= 0),
    
    -- Datas
    data_vencimento DATE NOT NULL,
    data_vencimento_original DATE NOT NULL,
    data_pagamento TIMESTAMP,
    
    -- Status
    status VARCHAR(20) DEFAULT 'em_aberto' CHECK (status IN ('em_aberto', 'pago_parcial', 'pago', 'vencido', 'cancelado')),
    dias_atraso INTEGER GENERATED ALWAYS AS (
        CASE WHEN status IN ('em_aberto', 'vencido', 'pago_parcial') AND data_vencimento < CURRENT_DATE
        THEN EXTRACT(days FROM CURRENT_DATE - data_vencimento)::INTEGER
        ELSE 0 END
    ) STORED,
    
    -- Dados do pagamento
    forma_pagamento VARCHAR(30),
    banco_codigo VARCHAR(10),
    agencia VARCHAR(10),
    conta VARCHAR(20),
    numero_documento VARCHAR(50), -- Número do cheque, comprovante, etc.
    
    -- Informações adicionais
    observacoes_pagamento TEXT,
    pago_por UUID,
    
    -- Auditoria
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(conta_pagar_id, numero_parcela)
);

-- Tabela de pagamentos realizados
CREATE TABLE IF NOT EXISTS contas_pagar_pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcela_id UUID NOT NULL REFERENCES contas_pagar_parcelas(id),
    
    -- Dados do pagamento
    valor_pago DECIMAL(15,2) NOT NULL CHECK (valor_pago > 0),
    data_pagamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    forma_pagamento VARCHAR(30) NOT NULL,
    
    -- Dados bancários
    banco_codigo VARCHAR(10),
    agencia VARCHAR(10),
    conta VARCHAR(20),
    numero_documento VARCHAR(50),
    
    -- Observações e responsável
    observacoes_pagamento TEXT,
    pago_por UUID,
    
    -- Auditoria
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_contas_pagar_supplier ON contas_pagar(supplier_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento_original);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_emissao ON contas_pagar(data_emissao);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_documento ON contas_pagar(documento_numero);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_categoria ON contas_pagar(categoria_conta);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_centro_custo ON contas_pagar(centro_custo);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_entrada ON contas_pagar(entrada_estoque_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_pedido ON contas_pagar(pedido_id);

CREATE INDEX IF NOT EXISTS idx_parcelas_conta ON contas_pagar_parcelas(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON contas_pagar_parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON contas_pagar_parcelas(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_atraso ON contas_pagar_parcelas(dias_atraso) WHERE dias_atraso > 0;
CREATE INDEX IF NOT EXISTS idx_parcelas_pagamento ON contas_pagar_parcelas(data_pagamento);

CREATE INDEX IF NOT EXISTS idx_pagamentos_parcela ON contas_pagar_pagamentos(parcela_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data ON contas_pagar_pagamentos(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_forma ON contas_pagar_pagamentos(forma_pagamento);

-- Função para gerar parcelas automaticamente
CREATE OR REPLACE FUNCTION gerar_parcelas_conta_pagar()
RETURNS TRIGGER AS $$
DECLARE
    i INTEGER;
    valor_parcela DECIMAL(15,2);
    data_vencimento_parcela DATE;
    valor_restante DECIMAL(15,2);
BEGIN
    -- Calcular valor por parcela
    valor_parcela := NEW.valor_liquido / NEW.numero_parcelas;
    valor_restante := NEW.valor_liquido;
    
    -- Gerar as parcelas
    FOR i IN 1..NEW.numero_parcelas LOOP
        -- Última parcela recebe o valor restante (para evitar arredondamentos)
        IF i = NEW.numero_parcelas THEN
            valor_parcela := valor_restante;
        ELSE
            valor_restante := valor_restante - valor_parcela;
        END IF;
        
        -- Calcular data de vencimento
        data_vencimento_parcela := NEW.data_vencimento_original + (i - 1) * NEW.intervalo_parcelas;
        
        -- Inserir parcela
        INSERT INTO contas_pagar_parcelas (
            conta_pagar_id,
            numero_parcela,
            valor_parcela,
            data_vencimento,
            data_vencimento_original,
            forma_pagamento
        ) VALUES (
            NEW.id,
            i,
            valor_parcela,
            data_vencimento_parcela,
            data_vencimento_parcela,
            NEW.forma_pagamento
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar parcelas automaticamente
DROP TRIGGER IF EXISTS trigger_gerar_parcelas ON contas_pagar;
CREATE TRIGGER trigger_gerar_parcelas
    AFTER INSERT ON contas_pagar
    FOR EACH ROW EXECUTE FUNCTION gerar_parcelas_conta_pagar();

-- Função para atualizar status da conta principal baseado nas parcelas
CREATE OR REPLACE FUNCTION atualizar_status_conta_pagar()
RETURNS TRIGGER AS $$
DECLARE
    total_parcelas INTEGER;
    parcelas_pagas INTEGER;
    parcelas_parciais INTEGER;
    conta_id UUID;
BEGIN
    conta_id := COALESCE(NEW.conta_pagar_id, OLD.conta_pagar_id);
    
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN status = 'pago' THEN 1 END),
        COUNT(CASE WHEN status = 'pago_parcial' THEN 1 END)
    INTO total_parcelas, parcelas_pagas, parcelas_parciais
    FROM contas_pagar_parcelas 
    WHERE conta_pagar_id = conta_id;
    
    -- Atualizar valor pago total
    UPDATE contas_pagar SET
        valor_pago = (
            SELECT COALESCE(SUM(valor_pago), 0)
            FROM contas_pagar_parcelas 
            WHERE conta_pagar_id = conta_id
        ),
        status = CASE 
            WHEN parcelas_pagas = total_parcelas THEN 'pago'
            WHEN parcelas_pagas > 0 OR parcelas_parciais > 0 THEN 'pago_parcial'
            ELSE 'em_aberto'
        END,
        situacao = CASE
            WHEN EXISTS(SELECT 1 FROM contas_pagar_parcelas WHERE conta_pagar_id = conta_id AND dias_atraso > 0) THEN 'vencido'
            ELSE situacao
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = conta_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar status da conta
DROP TRIGGER IF EXISTS trigger_atualizar_status_conta ON contas_pagar_parcelas;
CREATE TRIGGER trigger_atualizar_status_conta
    AFTER UPDATE OR DELETE ON contas_pagar_parcelas
    FOR EACH ROW EXECUTE FUNCTION atualizar_status_conta_pagar();

-- Função para registrar pagamento e atualizar parcela
CREATE OR REPLACE FUNCTION processar_pagamento_parcela()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar valor pago na parcela
    UPDATE contas_pagar_parcelas SET
        valor_pago = valor_pago + NEW.valor_pago,
        status = CASE 
            WHEN valor_pago + NEW.valor_pago >= valor_final THEN 'pago'
            WHEN valor_pago + NEW.valor_pago > 0 THEN 'pago_parcial'
            ELSE status
        END,
        data_pagamento = CASE 
            WHEN valor_pago + NEW.valor_pago >= valor_final THEN NEW.data_pagamento
            ELSE data_pagamento
        END,
        pago_por = CASE 
            WHEN valor_pago + NEW.valor_pago >= valor_final THEN NEW.pago_por
            ELSE pago_por
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.parcela_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para processar pagamentos
DROP TRIGGER IF EXISTS trigger_processar_pagamento ON contas_pagar_pagamentos;
CREATE TRIGGER trigger_processar_pagamento
    AFTER INSERT ON contas_pagar_pagamentos
    FOR EACH ROW EXECUTE FUNCTION processar_pagamento_parcela();

-- View para relatórios de contas a pagar
CREATE OR REPLACE VIEW vw_contas_pagar_completa AS
SELECT 
    cp.id,
    cp.numero_conta,
    cp.supplier_id,
    s.name as supplier_name,
    s.document as supplier_document,
    s.phone as supplier_phone,
    s.email as supplier_email,
    
    -- Documento
    cp.documento_tipo,
    cp.documento_numero,
    cp.documento_serie,
    cp.documento_valor,
    
    -- Datas
    cp.data_emissao,
    cp.data_vencimento_original,
    cp.data_competencia,
    
    -- Valores
    cp.valor_original,
    cp.valor_desconto,
    cp.valor_acrescimo,
    cp.valor_liquido,
    cp.valor_pago,
    cp.valor_em_aberto,
    
    -- Status
    cp.status,
    cp.situacao,
    cp.forma_pagamento,
    
    -- Próximo vencimento
    (SELECT MIN(data_vencimento) 
     FROM contas_pagar_parcelas cpp 
     WHERE cpp.conta_pagar_id = cp.id 
     AND cpp.status IN ('em_aberto', 'vencido')) as proximo_vencimento,
     
    -- Dias em atraso (maior atraso entre as parcelas)
    (SELECT MAX(dias_atraso) 
     FROM contas_pagar_parcelas cpp 
     WHERE cpp.conta_pagar_id = cp.id) as dias_atraso_maximo,
    
    -- Quantidade de parcelas
    cp.numero_parcelas,
    (SELECT COUNT(*) FROM contas_pagar_parcelas WHERE conta_pagar_id = cp.id) as parcelas_geradas,
    (SELECT COUNT(*) FROM contas_pagar_parcelas WHERE conta_pagar_id = cp.id AND status = 'pago') as parcelas_pagas,
    
    -- Categoria e centro de custo
    cp.categoria_conta,
    cp.centro_custo,
    cp.descricao,
    
    -- Auditoria
    cp.created_at,
    cp.updated_at
    
FROM contas_pagar cp
JOIN suppliers s ON cp.supplier_id = s.id;

COMMENT ON TABLE contas_pagar IS 'Contas a pagar com geração automática de parcelas';
COMMENT ON TABLE contas_pagar_parcelas IS 'Parcelas das contas a pagar com controle de vencimento e atraso';
COMMENT ON TABLE contas_pagar_pagamentos IS 'Registro detalhado de todos os pagamentos realizados';
COMMENT ON VIEW vw_contas_pagar_completa IS 'Visão completa das contas a pagar com informações do fornecedor';