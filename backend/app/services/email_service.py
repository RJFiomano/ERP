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
        subject = "Redefinir senha - ERP Sistema"
        
        html_content = f"""
        <html>
        <body>
            <h2>Redefinir senha</h2>
            <p>Você solicitou a redefinição de sua senha.</p>
            <p>Clique no link abaixo para definir uma nova senha:</p>
            <p><a href="{reset_link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Redefinir Senha</a></p>
            <p>Este link expira em 1 hora.</p>
            <p>Se você não solicitou esta redefinição, ignore este email.</p>
            <br>
            <p>Atenciosamente,<br>Equipe ERP Sistema</p>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)


email_service = EmailService()