# Quick Setup Checklist

Use this checklist to ensure you complete all steps. Refer to `DEPLOYMENT_GUIDE.md` for detailed instructions.

## Phase 1: Windows Server Preparation ⚙️

- [ ] Install Node.js (LTS version)
- [ ] Install MongoDB (Local or setup MongoDB Atlas)
- [ ] Install Git (optional)
- [ ] Configure Windows Firewall (ports 80, 443, 3000)
- [ ] Install IIS with URL Rewrite and ARR modules
- [ ] Enable IIS proxy settings
- [ ] Install PM2 globally (`npm install -g pm2 pm2-windows-startup`)
- [ ] Configure PM2 startup (`pm2-startup install`)

## Phase 2: Domain Configuration 🌐

- [ ] Get your Windows Server public IP address
- [ ] Log in to GoDaddy account
- [ ] Navigate to DNS Management for `treasurehillwhatsapp.com`
- [ ] Add/Update A record: `@` → Your Server IP
- [ ] Add A record: `www` → Your Server IP
- [ ] Wait for DNS propagation (15 min - 48 hours)
- [ ] Verify with `nslookup treasurehillwhatsapp.com`

## Phase 3: SSL Certificate 🔒

- [ ] Download win-acme from https://www.win-acme.com/
- [ ] Extract to `C:\win-acme\`
- [ ] Run `wacs.exe` as Administrator
- [ ] Create certificate for `treasurehillwhatsapp.com`
- [ ] Verify certificate is bound to IIS website
- [ ] Verify auto-renewal task is created

## Phase 4: Twilio Account Setup 📱

- [ ] Sign up at https://www.twilio.com/try-twilio
- [ ] Verify email address
- [ ] Verify phone number
- [ ] Complete onboarding questionnaire
- [ ] Copy Account SID (starts with AC...)
- [ ] Copy Auth Token (click "View" to reveal)
- [ ] Save both credentials securely

## Phase 5: Twilio WhatsApp Sandbox 💬

- [ ] Navigate to: Messaging → Try it out → WhatsApp
- [ ] Note your sandbox code (e.g., "join shadow-window")
- [ ] Send sandbox join message from your WhatsApp:
  - To: `+1 (415) 523-8886`
  - Message: `join your-code`
- [ ] Confirm you received success message
- [ ] Copy WhatsApp number format: `whatsapp:+14155238886`

## Phase 6: Webhook Configuration 🔗

- [ ] Go to WhatsApp Sandbox Settings
- [ ] Set "When a message comes in":
  - URL: `https://treasurehillwhatsapp.com/webhook/whatsapp`
  - Method: POST
- [ ] Set "When a message status changes":
  - URL: `https://treasurehillwhatsapp.com/webhook/status`
  - Method: POST
- [ ] Click Save

## Phase 7: ElevenLabs Setup 🤖

- [ ] Sign up at https://elevenlabs.io
- [ ] Navigate to Conversational AI section
- [ ] Create a new conversational AI agent
- [ ] Configure agent personality and responses
- [ ] Copy API Key (from profile settings)
- [ ] Copy Agent ID (from agent settings)
- [ ] Save both credentials

## Phase 8: Application Deployment 🚀

- [ ] Clone/upload code to Windows Server (`C:\WhatsAppBot\`)
- [ ] Navigate to project directory
- [ ] Run `npm install`
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in all environment variables:
  - [ ] PORT=3000
  - [ ] NODE_ENV=production
  - [ ] MONGODB_URI
  - [ ] TWILIO_ACCOUNT_SID
  - [ ] TWILIO_AUTH_TOKEN
  - [ ] TWILIO_WHATSAPP_NUMBER
  - [ ] ELEVENLABS_API_KEY
  - [ ] ELEVENLABS_AGENT_ID
  - [ ] ADMIN_USERNAME
  - [ ] ADMIN_PASSWORD (change from default!)
  - [ ] SESSION_SECRET (random string, min 32 chars)

## Phase 9: IIS Configuration 🌍

- [ ] Create `web.config` file in project root
- [ ] Open IIS Manager
- [ ] Add new website:
  - Name: WhatsAppBot
  - Path: `C:\WhatsAppBot`
  - Binding: HTTP, Port 80, Host: `treasurehillwhatsapp.com`
- [ ] Add HTTPS binding:
  - Type: HTTPS, Port 443
  - Host: `treasurehillwhatsapp.com`
  - Certificate: Select your Let's Encrypt certificate

## Phase 10: Start Application ▶️

- [ ] Open PowerShell as Administrator
- [ ] Navigate to: `cd C:\WhatsAppBot`
- [ ] Start with PM2: `pm2 start server.js --name whatsapp-bot`
- [ ] Save PM2 config: `pm2 save`
- [ ] Check status: `pm2 status`
- [ ] Verify app is running: `curl http://localhost:3000`

## Phase 11: Testing ✅

- [ ] Test HTTP access: `http://treasurehillwhatsapp.com`
- [ ] Test HTTPS access: `https://treasurehillwhatsapp.com`
- [ ] Test admin dashboard: `https://treasurehillwhatsapp.com/admin`
- [ ] Login with admin credentials
- [ ] Send test WhatsApp message to your Twilio number
- [ ] Verify you receive AI response
- [ ] Check conversation appears in admin dashboard
- [ ] Check Twilio debugger for webhook success

## Phase 12: Production Readiness (Optional) 🏭

- [ ] Request WhatsApp Business API access from Twilio
- [ ] Complete business verification
- [ ] Submit business profile to WhatsApp
- [ ] Wait for approval (1-3 business days)
- [ ] Update webhook URLs for production number
- [ ] Test with production WhatsApp number

## Post-Deployment 📋

- [ ] Set up MongoDB backups
- [ ] Configure monitoring/alerting
- [ ] Document any custom configurations
- [ ] Train team on admin dashboard usage
- [ ] Schedule regular maintenance windows

---

## Quick Reference: Important URLs

| Service | URL |
|---------|-----|
| **Your Website** | https://treasurehillwhatsapp.com |
| **Admin Dashboard** | https://treasurehillwhatsapp.com/admin |
| **Twilio Console** | https://console.twilio.com/ |
| **Twilio WhatsApp Sandbox** | https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn |
| **Twilio Debugger** | https://console.twilio.com/us1/monitor/logs/debugger |
| **ElevenLabs Dashboard** | https://elevenlabs.io/ |
| **GoDaddy DNS** | https://dcc.godaddy.com/domains |
| **MongoDB Atlas** | https://cloud.mongodb.com/ |

---

## Quick Reference: Common Commands

```powershell
# Check app status
pm2 status

# View logs
pm2 logs whatsapp-bot

# Restart app
pm2 restart whatsapp-bot

# Stop app
pm2 stop whatsapp-bot

# Delete app from PM2
pm2 delete whatsapp-bot

# Test if app is running
curl http://localhost:3000

# Check DNS resolution
nslookup treasurehillwhatsapp.com

# Get public IP
Invoke-RestMethod -Uri https://api.ipify.org?format=json | Select-Object -ExpandProperty ip

# Test MongoDB connection (local)
mongo

# Check open ports
netstat -ano | findstr :3000
netstat -ano | findstr :80
netstat -ano | findstr :443
```

---

## Need Help?

Refer to `DEPLOYMENT_GUIDE.md` for detailed step-by-step instructions for each phase.
