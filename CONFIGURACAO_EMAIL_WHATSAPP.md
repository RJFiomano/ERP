# 📧📱 Guia de Configuração - Email e WhatsApp

## 📧 Configuração de Email SMTP

### 1. **Editar arquivo .env**
Localização: `C:\ERP\backend\.env`

```env
# ===========================================
# CONFIGURAÇÕES DE EMAIL SMTP
# ===========================================

# Gmail (recomendado)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app-gmail
SMTP_FROM=seu-email@gmail.com
```

### 2. **Configurações por Provedor**

#### **Gmail:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=seu-email@gmail.com
SMTP_PASSWORD=senha-de-app-16-caracteres
SMTP_FROM=seu-email@gmail.com
```

**Como obter senha de app do Gmail:**
1. Acesse https://myaccount.google.com/security
2. Ative "Verificação em 2 etapas"
3. Vá em "Senhas de app"
4. Selecione "Email" e "Computador Windows"
5. Use a senha de 16 caracteres gerada

#### **Outlook/Hotmail:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=seu-email@outlook.com
SMTP_PASSWORD=sua-senha-normal
SMTP_FROM=seu-email@outlook.com
```

#### **Servidor SMTP Personalizado:**
```env
SMTP_HOST=mail.seudominio.com.br
SMTP_PORT=587
SMTP_USERNAME=sistema@seudominio.com.br
SMTP_PASSWORD=sua-senha-smtp
SMTP_FROM=sistema@seudominio.com.br
```

### 3. **Testar Configuração**
Após configurar, reinicie o backend:
```bash
cd C:\ERP\backend
# Parar o servidor (Ctrl+C)
# Reiniciar
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📱 Configuração WhatsApp com Baileys

### 1. **Método 1: Baileys Local (Recomendado para desenvolvimento)**

#### Instalar Baileys:
```bash
# Em um diretório separado (ex: C:\baileys-api)
mkdir C:\baileys-api
cd C:\baileys-api
npm init -y
npm install @whiskeysockets/baileys qrcode-terminal express
```

#### Criar servidor Baileys simples:
Arquivo: `C:\baileys-api\server.js`
```javascript
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const express = require('express')
const qrcode = require('qrcode-terminal')

const app = express()
app.use(express.json())

let sock

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    })

    sock.ev.on('creds.update', saveCreds)
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
            if(shouldReconnect) {
                connectToWhatsApp()
            }
        } else if(connection === 'open') {
            console.log('✅ WhatsApp conectado!')
        }
    })
}

// Endpoint para enviar mensagem
app.post('/send-message', async (req, res) => {
    try {
        const { phone, message } = req.body
        
        // Formatar número (adicionar @s.whatsapp.net se necessário)
        const formattedPhone = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
        
        await sock.sendMessage(formattedPhone, { text: message })
        
        res.json({ success: true, message: 'Mensagem enviada!' })
    } catch (error) {
        console.error('Erro ao enviar:', error)
        res.status(500).json({ success: false, error: error.message })
    }
})

app.listen(3001, () => {
    console.log('🚀 Baileys API rodando na porta 3001')
    connectToWhatsApp()
})
```

#### Executar Baileys:
```bash
cd C:\baileys-api
node server.js
```

**Escaneie o QR Code** que aparece no terminal com seu WhatsApp!

### 2. **Configurar no .env do ERP:**
```env
# ===========================================
# CONFIGURAÇÕES WHATSAPP BAILEYS
# ===========================================

BAILEYS_API_URL=http://localhost:3001
BAILEYS_API_TOKEN=opcional-seu-token
WHATSAPP_ENABLED=true
```

### 3. **Método 2: Baileys como Serviço (Produção)**

Para produção, recomenda-se usar um serviço como:
- **WhatsApp Business API** oficial
- **Twilio WhatsApp API** (pago)
- **Evolution API** (open source, mais robusto)

#### Evolution API:
```bash
# Instalar Evolution API
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api
npm install
cp .env.example .env
# Configurar .env conforme documentação
npm run start:prod
```

## 🔧 Verificação de Funcionamento

### 1. **Testar Email:**
- Configure as variáveis SMTP no .env
- Reinicie o backend
- Crie um pedido de compra marcando "Enviar por Email"
- Verifique os logs do backend para confirmação

### 2. **Testar WhatsApp:**
- Execute o servidor Baileys (porta 3001)
- Escaneie o QR Code
- Configure BAILEYS_API_URL no .env
- Reinicie o backend
- Crie um pedido marcando "Enviar por WhatsApp"
- Verifique se a mensagem chegou no WhatsApp

## 🚨 Resolução de Problemas

### **Email não está enviando:**
1. Verifique credenciais no .env
2. Para Gmail, use senha de app (não senha normal)
3. Verifique logs do backend para erros
4. Teste conectividade: `telnet smtp.gmail.com 587`

### **WhatsApp não está enviando:**
1. Verifique se Baileys está rodando na porta 3001
2. Verifique se QR Code foi escaneado
3. Teste endpoint: `curl -X POST http://localhost:3001/send-message -H "Content-Type: application/json" -d '{"phone":"5511999999999","message":"teste"}'`

### **Ambos em modo simulado:**
- Isso é normal quando as configurações não estão completas
- O sistema funciona perfeitamente, apenas mostra mensagem de simulação
- Quando configurado corretamente, enviará automaticamente

## 📝 Logs Importantes

Verifique sempre os logs do backend para mensagens como:
- `✅ EMAIL REAL enviado com sucesso`
- `✅ WHATSAPP REAL enviado via Baileys`
- `❌ SMTP não configurado - enviando simulado`
- `❌ Baileys API não disponível - enviando simulado`

## 🎯 Status de Configuração

| Componente | Status | Observação |
|------------|--------|------------|
| ✅ Interface | Pronta | Checkboxes e campos funcionando |
| ✅ Backend | Pronto | Endpoints e lógica implementados |
| ⚠️ Email SMTP | Configurar | Editar .env com suas credenciais |
| ⚠️ WhatsApp | Configurar | Instalar e configurar Baileys |

**Após a configuração, o sistema enviará emails e WhatsApp reais automaticamente!**