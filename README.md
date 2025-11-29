# Treasure Hill WhatsApp Bot

A WhatsApp chatbot that connects Twilio WhatsApp Business API with ElevenLabs conversational AI. Integrates with HubSpot via Zapier webhooks for lead management.

## Features

- 🤖 **AI-Powered Conversations**: ElevenLabs conversational AI
- 💬 **WhatsApp Integration**: Twilio WhatsApp Business API
- 📊 **Admin Dashboard**: Monitor conversations and leads
- 🔗 **HubSpot Integration**: Receive leads via Zapier webhooks
- 💾 **MongoDB Storage**: Persistent conversation and lead history

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start the server**
   ```bash
   npm start
   ```

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (443 for HTTPS) |
| `MONGODB_URI` | MongoDB connection string |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp number (format: whatsapp:+1...) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `ELEVENLABS_AGENT_ID` | ElevenLabs agent ID |
| `ADMIN_USERNAME` | Admin dashboard username |
| `ADMIN_PASSWORD` | Admin dashboard password |

### HTTPS Configuration (Direct Mode)

Set these for direct HTTPS on port 443:

```env
HTTPS_ENABLED=true
SSL_KEY_PATH=C:/ssl/private.key
SSL_CERT_PATH=C:/ssl/certificate.crt
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/admin` | Admin dashboard |
| `/admin/leads` | HubSpot leads dashboard |
| `/webhook/whatsapp` | Twilio WhatsApp webhook |
| `/webhook/hubspot` | Zapier/HubSpot webhook |
| `/health` | Health check |

## Zapier Integration

Configure your Zapier zap to POST to:
```
https://your-domain.com/webhook/hubspot
```

With the following fields:
- `email`
- `firstname`
- `lastname`
- `phone`
- `mobile_phone`
- `objectId`
- `project_name`

## License

MIT License - See [LICENSE](LICENSE) for details.
