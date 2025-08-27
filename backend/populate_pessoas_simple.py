#!/usr/bin/env python3

import psycopg2
import uuid
from datetime import datetime
import random

# Configurações do banco
DB_CONFIG = {
    'host': 'db',
    'port': 5432,
    'database': 'erp_db', 
    'user': 'erp_user',
    'password': 'erp_password'
}

def generate_cnpj():
    """Gera um CNPJ fictício válido"""
    return f"{random.randint(10, 99)}.{random.randint(100, 999)}.{random.randint(100, 999)}/0001-{random.randint(10, 99)}"

def generate_cpf():
    """Gera um CPF fictício válido"""
    return f"{random.randint(100, 999)}.{random.randint(100, 999)}.{random.randint(100, 999)}-{random.randint(10, 99)}"

def main():
    """Função principal - versão simples"""
    try:
        print("🚀 Populando tabela pessoas (versão simples)...")
        
        # Conectar ao banco
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Pessoas Jurídicas
        pessoas_pj = [
            ('Empresa Alpha Tecnologia Ltda', 'Fornecedor de equipamentos de TI'),
            ('Beta Comércio e Serviços S.A.', 'Distribuidora de materiais diversos'),
            ('Gamma Indústria Alimentícia', 'Fabricante de produtos alimentícios'),
            ('Delta Construção Civil', 'Empresa de construção e reformas'),
            ('Epsilon Marketing Digital', 'Agência de marketing e publicidade'),
            ('Zeta Transporte e Logística', 'Empresa de transporte rodoviário'),
            ('Eta Consultoria Empresarial', 'Consultoria em gestão empresarial'),
            ('Theta Desenvolvimento Imobiliário', 'Incorporadora e construtora'),
            ('Iota Soluções em TI', 'Desenvolvimento de software personalizado'),
            ('Kappa Comércio Exterior', 'Importação e exportação de produtos')
        ]
        
        # Pessoas Físicas
        pessoas_pf = [
            ('Alberto Santos Silva', 'Consultor independente em vendas'),
            ('Beatriz Oliveira Costa', 'Professora e palestrante'),
            ('Carlos Eduardo Mendes', 'Engenheiro civil autônomo'),
            ('Diana Ferreira Rocha', 'Designer gráfica freelancer'),
            ('Eduardo Alves Lima', 'Desenvolvedor de sistemas'),
            ('Fernanda Silva Santos', 'Advogada especialista em direito empresarial'),
            ('Gabriel Rodrigues Costa', 'Arquiteto e urbanista'),
            ('Helena Martins Oliveira', 'Contadora e consultora fiscal'),
            ('Igor Pereira Souza', 'Médico veterinário'),
            ('Juliana Costa Ferreira', 'Psicóloga organizacional'),
            ('Kleber Almeida Santos', 'Mecânico especializado'),
            ('Larissa Barbosa Lima', 'Nutricionista clínica'),
            ('Marcos Vinicius Silva', 'Personal trainer e educador físico'),
            ('Natália Gonçalves Costa', 'Jornalista e redatora'),
            ('Otávio Ribeiro Santos', 'Chef de cozinha e consultor gastronômico')
        ]
        
        print("👤 Inserindo pessoas...")
        
        # Inserir Pessoas Jurídicas
        for nome, observacao in pessoas_pj:
            pessoa_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO pessoas (id, nome, pessoa_tipo, documento, ie, email, observacoes,
                                   is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (pessoa_id, nome, 'PJ', generate_cnpj(), 
                  f'{random.randint(100, 999)}.{random.randint(100, 999)}.{random.randint(100, 999)}.{random.randint(100, 999)}',
                  nome.lower().replace(' ', '.').replace('ltda', '').replace('s.a.', '') + '@empresa.com.br',
                  observacao, True, datetime.now(), datetime.now()))
        
        print(f"✅ {len(pessoas_pj)} pessoas jurídicas inseridas")
        
        # Inserir Pessoas Físicas
        for nome, observacao in pessoas_pf:
            pessoa_id = str(uuid.uuid4())
            rg = f"{random.randint(10, 99)}.{random.randint(100, 999)}.{random.randint(100, 999)}-{random.choice(['X', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])}"
            
            cur.execute("""
                INSERT INTO pessoas (id, nome, pessoa_tipo, documento, rg, email, observacoes,
                                   is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (pessoa_id, nome, 'PF', generate_cpf(), rg,
                  nome.lower().replace(' ', '.') + '@email.com.br',
                  observacao, True, datetime.now(), datetime.now()))
        
        print(f"✅ {len(pessoas_pf)} pessoas físicas inseridas")
        
        # Confirmar transação
        conn.commit()
        
        print("\n🎉 População concluída com sucesso!")
        print(f"📊 Total: {len(pessoas_pj + pessoas_pf)} pessoas cadastradas")
        
        # Verificar dados inseridos
        cur.execute("SELECT COUNT(*) FROM pessoas WHERE pessoa_tipo = 'PJ'")
        pj_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM pessoas WHERE pessoa_tipo = 'PF'")
        pf_count = cur.fetchone()[0]
        
        print(f"   👔 Pessoas Jurídicas: {pj_count}")
        print(f"   👤 Pessoas Físicas: {pf_count}")
        
    except psycopg2.Error as e:
        print(f"❌ Erro no banco de dados: {e}")
    except Exception as e:
        print(f"❌ Erro geral: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()