import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List
from app.config import settings


class EmailService:
    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_username = settings.smtp_username
        self.smtp_password = settings.smtp_password
        self.smtp_from = settings.smtp_from

    def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email - uses mock in development, real SMTP in production"""
        
        if settings.environment == "development":
            # Mock email service for development
            print(f"\n=== EMAIL MOCK ===")
            print(f"To: {to_email}")
            print(f"Subject: {subject}")
            print(f"Content:\n{html_content}")
            print(f"================\n")
            return True
        
        try:
            # Real SMTP for production
            msg = MIMEMultipart()
            msg['From'] = self.smtp_from
            msg['To'] = to_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(html_content, 'html'))
            
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            server.sendmail(self.smtp_from, [to_email], msg.as_string())
            server.quit()
            
            return True
            
        except Exception as e:
            print(f"Erro ao enviar email: {str(e)}")
            return False

    def send_password_reset_email(self, to_email: str, reset_link: str) -> bool:
        """Send password reset email"""
        subject = "🔒 Redefinir senha - ERP Sistema"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redefinir Senha</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 20px auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 16px;">
                
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="background: rgba(255, 255, 255, 0.2); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                        <div style="font-size: 40px;">🔒</div>
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Redefinir Senha</h1>
                </div>
                
                <!-- Content -->
                <div style="background: white; padding: 40px 30px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);">
                    <h2 style="color: #333; margin-top: 0; font-size: 22px; font-weight: 600;">Olá!</h2>
                    
                    <p style="color: #666; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
                        Você solicitou a redefinição da sua senha no <strong>ERP Sistema</strong>. 
                        Para continuar, clique no botão abaixo:
                    </p>
                    
                    <!-- Button -->
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="{reset_link}" 
                           style="display: inline-block; background: linear-gradient(45deg, #667eea 30%, #764ba2 90%); 
                                  color: white; padding: 15px 40px; text-decoration: none; 
                                  border-radius: 8px; font-weight: 600; font-size: 16px;
                                  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                                  transition: all 0.3s ease;">
                            🔐 Redefinir Minha Senha
                        </a>
                    </div>
                    
                    <!-- Info Box -->
                    <div style="background: #f8f9ff; border-left: 4px solid #667eea; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 30px 0;">
                        <p style="margin: 0; color: #555; font-size: 14px;">
                            <strong>⏰ Importante:</strong> Este link expira em <strong>1 hora</strong> por segurança.
                        </p>
                    </div>
                    
                    <p style="color: #666; line-height: 1.6; font-size: 14px; margin-bottom: 20px;">
                        Se você não conseguir clicar no botão, copie e cole este link no seu navegador:
                    </p>
                    <p style="color: #667eea; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">
                        {reset_link}
                    </p>
                    
                    <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
                        <p style="color: #888; font-size: 13px; margin: 0;">
                            ❓ Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.
                        </p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: rgba(255, 255, 255, 0.8); font-size: 14px; margin: 0;">
                        Atenciosamente,<br>
                        <strong>Equipe ERP Sistema</strong>
                    </p>
                    <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin: 10px 0 0;">
                        Este é um email automático, não responda.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)


email_service = EmailService()