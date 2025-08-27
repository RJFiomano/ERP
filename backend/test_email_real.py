import asyncio
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

async def test_email():
    try:
        print("Testando envio de email real...")
        
        # Configurações
        smtp_host = "smtp.gmail.com"
        smtp_port = 587
        username = "suporte@integrativa.com.br"
        password = "ttlg ohrd aoiq itxh"
        from_email = "suporte@integrativa.com.br"
        to_email = "reginaldo.fiomano@gmail.com"  # Enviar para teste
        
        # Criar mensagem
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = to_email
        msg['Subject'] = "Teste ERP - Sistema de Pedidos"
        
        body = """
        Este é um teste do sistema de envio de emails do ERP.
        
        ✅ Sistema funcionando corretamente!
        
        Enviado automaticamente pelo Sistema ERP
        """
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        # Enviar email
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            start_tls=True,
            username=username,
            password=password
        )
        
        print("Email enviado com sucesso!")
        return True
        
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_email())
    if result:
        print("Teste de email concluído com sucesso!")
    else:
        print("Teste de email falhou!")