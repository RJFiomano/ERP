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

def populate_pessoas(cur):
    """Popula a tabela pessoas com dados diversos"""
    print("👤 Criando pessoas...")
    
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
    
    pessoa_ids = []
    
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
        pessoa_ids.append(pessoa_id)
    
    # Inserir Pessoas Físicas
    for nome, observacao in pessoas_pf:
        pessoa_id = str(uuid.uuid4())
        # Gerar RG
        rg = f"{random.randint(10, 99)}.{random.randint(100, 999)}.{random.randint(100, 999)}-{random.choice(['X', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])}"
        
        cur.execute("""
            INSERT INTO pessoas (id, nome, pessoa_tipo, documento, rg, email, observacoes,
                               is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (pessoa_id, nome, 'PF', generate_cpf(), rg,
              nome.lower().replace(' ', '.') + '@email.com.br',
              observacao, True, datetime.now(), datetime.now()))
        pessoa_ids.append(pessoa_id)
    
    print(f"✅ {len(pessoas_pj)} pessoas jurídicas criadas")
    print(f"✅ {len(pessoas_pf)} pessoas físicas criadas")
    print(f"✅ Total: {len(pessoa_ids)} pessoas")
    
    return pessoa_ids

def populate_phones_addresses(cur, pessoa_ids):
    """Popula telefones e endereços para as pessoas"""
    print("📞 Criando contatos...")
    
    # Verificar se tabelas de contato existem
    try:
        cur.execute("SELECT COUNT(*) FROM phones")
        phones_exist = True
    except:
        phones_exist = False
        
    try:
        cur.execute("SELECT COUNT(*) FROM addresses") 
        addresses_exist = True
    except:
        addresses_exist = False
    
    if not phones_exist and not addresses_exist:
        print("⚠️  Tabelas de contatos (phones/addresses) não encontradas")
        return
    
    # Gerar telefones para algumas pessoas
    phone_count = 0
    address_count = 0
    
    for pessoa_id in pessoa_ids[:10]:  # Apenas primeiras 10 pessoas
        # Telefone
        if phones_exist and random.choice([True, False]):
            try:
                ddd = random.choice(['11', '21', '31', '41', '51'])
                phone = f"({ddd}) 9{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"
                cur.execute("""
                    INSERT INTO phones (id, pessoa_id, phone, type, is_primary, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (str(uuid.uuid4()), pessoa_id, phone, 'mobile', True, datetime.now(), datetime.now()))
                phone_count += 1
            except Exception as e:
                print(f"⚠️  Erro ao criar telefone: {e}")
        
        # Endereço  
        if addresses_exist and random.choice([True, False]):
            try:
                neighborhoods = ['Centro', 'Jardins', 'Vila Madalena', 'Pinheiros', 'Moema']
                streets = ['Rua das Flores', 'Av. Paulista', 'Rua Augusta', 'Rua Oscar Freire']
                
                cur.execute("""
                    INSERT INTO addresses (id, pessoa_id, street, number, neighborhood, 
                                         city, state, zip_code, is_primary, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (str(uuid.uuid4()), pessoa_id, random.choice(streets), str(random.randint(100, 9999)),
                      random.choice(neighborhoods), 'São Paulo', 'SP',
                      f'{random.randint(10000, 99999)}-{random.randint(100, 999)}',
                      True, datetime.now(), datetime.now()))
                address_count += 1
            except Exception as e:
                print(f"⚠️  Erro ao criar endereço: {e}")
    
    if phone_count > 0:
        print(f"✅ {phone_count} telefones criados")
    if address_count > 0:
        print(f"✅ {address_count} endereços criados")

def main():
    """Função principal"""
    try:
        print("🚀 Populando tabela pessoas...")
        
        # Conectar ao banco
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Verificar se já existem dados
        cur.execute("SELECT COUNT(*) FROM pessoas")
        existing_count = cur.fetchone()[0]
        
        if existing_count > 0:
            print(f"⚠️  Já existem {existing_count} pessoas cadastradas")
            response = input("Deseja adicionar mais pessoas? (sim/não): ")
            if response.lower() not in ['sim', 's']:
                print("❌ Operação cancelada")
                return
        
        # Popular pessoas
        pessoa_ids = populate_pessoas(cur)
        
        # Popular contatos relacionados
        populate_phones_addresses(cur, pessoa_ids)
        
        # Confirmar transação
        conn.commit()
        
        print("\n🎉 População da tabela pessoas concluída!")
        print(f"\n📊 Total de pessoas cadastradas: {len(pessoa_ids)}")
        print("   - 10 Pessoas Jurídicas (empresas)")
        print("   - 15 Pessoas Físicas (profissionais)")
        
        print("\n🌐 Acesse o sistema:")
        print("   Frontend: http://localhost:3000")
        print("   Login: admin@localhost.com") 
        print("   Senha: Admin!123")
        
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