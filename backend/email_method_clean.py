    async def send_order_by_email(self, order_id: UUID, email: str) -> APIResponse:
        """Enviar pedido por email usando SMTP real"""
        from app.config import settings
        
        logger.error(f"📧 INICIANDO ENVIO EMAIL para {email}")
        
        if not EMAIL_AVAILABLE:
            logger.error("❌ Bibliotecas de email não disponíveis")
            return APIResponse(
                success=True,
                message=f"Email simulado (bibliotecas não disponíveis): {email}",
                data={"email": email, "simulated": True}
            )
        
        try:
            # Buscar dados do pedido
            order_response = await self.get_purchase_order_details(order_id)
            if not order_response.success:
                return APIResponse(success=False, message="Pedido não encontrado")
            
            order_data = order_response.data
            order_number = order_data.get('order_number', 'N/A')
            supplier_info = order_data.get('supplier', {})
            supplier_name = supplier_info.get('name', 'N/A')
            values = order_data.get('values', {})
            total = values.get('total', 0)
            items = order_data.get('items', [])
            
            # Criar HTML dos itens
            items_html = ""
            for item in items:
                product_name = item.get('product', {}).get('name', 'Item')
                quantity = item.get('quantities', {}).get('ordered', 0)
                unit_price = item.get('prices', {}).get('unit_price', 0)
                subtotal = item.get('prices', {}).get('subtotal', 0)
                
                items_html += f"""
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">{product_name}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{quantity}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">R$ {unit_price:.2f}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">R$ {subtotal:.2f}</td>
                </tr>
                """
            
            # Corpo HTML do email
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; margin: 20px;">
                <h2 style="color: #2196F3;">Pedido de Compra #{order_number}</h2>
                
                <p>Prezado(a) <strong>{supplier_name}</strong>,</p>
                
                <p>Segue anexo o pedido de compra para sua análise e confirmação.</p>
                
                <h3>Resumo do Pedido:</h3>
                <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Produto</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Quantidade</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Valor Unit.</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #f9f9f9; font-weight: bold;">
                            <td colspan="3" style="padding: 12px; border: 1px solid #ddd; text-align: right;">Total Geral:</td>
                            <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">R$ {total:.2f}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <p>Por favor, confirme o recebimento deste pedido e nos informe sobre a disponibilidade dos itens e prazo de entrega.</p>
                
                <hr style="margin: 30px 0;">
                <p style="font-size: 12px; color: #666;">
                    Este email foi enviado automaticamente pelo Sistema ERP.<br>
                    Em caso de dúvidas, entre em contato conosco.
                </p>
            </body>
            </html>
            """
            
            # Criar mensagem
            msg = MIMEMultipart()
            msg['From'] = settings.smtp_from
            msg['To'] = email
            msg['Subject'] = f"Pedido de Compra #{order_number} - {supplier_name}"
            
            # Anexar corpo HTML
            msg.attach(MIMEText(html_body, 'html', 'utf-8'))
            
            # Gerar e anexar PDF
            try:
                pdf_content = await self._generate_order_pdf(order_data)
                if pdf_content:
                    pdf_attachment = MIMEApplication(pdf_content, _subtype='pdf')
                    pdf_attachment.add_header(
                        'Content-Disposition', 
                        'attachment', 
                        filename=f'pedido-compra-{order_number}.pdf'
                    )
                    msg.attach(pdf_attachment)
                    logger.error("📎 PDF anexado ao email!")
            except Exception as pdf_error:
                logger.error(f"⚠️ Erro ao anexar PDF: {pdf_error}")
            
            # Configurações SMTP
            smtp_kwargs = {
                'hostname': settings.smtp_host,
                'port': settings.smtp_port,
                'start_tls': True,
                'username': settings.smtp_username,
                'password': settings.smtp_password,
                'timeout': 30
            }
            
            logger.error(f"📤 Enviando email via SMTP: {settings.smtp_host}:{settings.smtp_port}")
            logger.error(f"🔑 Usuario SMTP: {settings.smtp_username}")
            
            # Enviar email
            await aiosmtplib.send(msg, **smtp_kwargs)
            
            logger.error(f"✅ EMAIL REAL enviado com sucesso para {email}")
            return APIResponse(
                success=True, 
                message=f"Email enviado com sucesso para {email}",
                data={
                    "email": email, 
                    "order_number": order_number,
                    "pdf_attached": True,
                    "real_email": True
                }
            )
            
        except Exception as e:
            logger.error(f"💥 ERRO ao enviar email: {str(e)}", exc_info=True)
            return APIResponse(success=False, message=f"Erro no serviço de email: {str(e)}")