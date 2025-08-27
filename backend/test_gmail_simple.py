import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def test_gmail():
    try:
        print("Testando credenciais Gmail...")
        
        # Tentar diferentes combinações de credenciais
        configs = [
            # Config 1: Original
            {
                'host': 'smtp.gmail.com',
                'port': 587,
                'username': 'suporte@integrativa.com.br',
                'password': 'ttlg ohrd aoiq itxh',
                'from_email': 'suporte@integrativa.com.br'
            }
        ]
        
        for i, config in enumerate(configs, 1):
            print(f"\nTeste {i}: {config['username']}")
            
            try:
                # Criar mensagem
                msg = MIMEMultipart()
                msg['From'] = config['from_email']
                msg['To'] = 'reginaldo.fiomano@gmail.com'
                msg['Subject'] = f'Teste ERP {i} - Credenciais'
                
                body = f'Teste de credenciais Gmail - Config {i}\n\nFuncionando!'
                msg.attach(MIMEText(body, 'plain'))
                
                # Conectar e enviar
                print(f"   Conectando em {config['host']}:{config['port']}...")
                server = smtplib.SMTP(config['host'], config['port'])
                
                print("   Iniciando STARTTLS...")
                server.starttls()
                
                print(f"   Login com {config['username']}...")
                server.login(config['username'], config['password'])
                
                print("   Enviando email...")
                text = msg.as_string()
                server.sendmail(config['from_email'], ['reginaldo.fiomano@gmail.com'], text)
                
                print("   Fechando conexão...")
                server.quit()
                
                print(f"   SUCESSO! Config {i} funcionou!")
                return True, f"Config {i} funcionou"
                
            except Exception as e:
                print(f"   ERRO Config {i}: {e}")
                continue
        
        print("\nNenhuma config funcionou!")
        return False, "Todas as configs falharam"
        
    except Exception as e:
        print(f"Erro geral: {e}")
        return False, str(e)

if __name__ == "__main__":
    success, message = test_gmail()
    if success:
        print(f"\nRESULTADO: {message}")
    else:
        print(f"\nFALHOU: {message}")