# Running Node.js Directly on Port 443 (HTTPS)

This guide shows you how to run your WhatsApp Bot directly on port 443 with HTTPS - no IIS, no reverse proxy.

## Overview

```
Internet (HTTPS:443) → Node.js (Port 443) → Response
```

Your Node.js application handles everything: SSL/TLS encryption, HTTPS requests, and responses.

---

## Step-by-Step Setup

### Step 1: Stop IIS (Free Port 443)

```powershell
# Open PowerShell as Administrator

# Stop IIS completely
iisreset /stop

# Disable IIS from auto-starting
Set-Service -Name W3SVC -StartupType Disabled
```

### Step 2: Get SSL Certificates

You need SSL certificates in PEM format. Here are your options:

#### Option A: Use Let's Encrypt with win-acme (Recommended)

1. **Install win-acme:**
   - Download from: https://www.win-acme.com/
   - Extract to `C:\win-acme\`

2. **Generate certificates:**
   ```powershell
   cd C:\win-acme
   .\wacs.exe
   ```

3. **Create certificate:**
   - Choose: `N` (Create certificate with default settings)
   - Choose: `2` (Manual input)
   - Host: `treasurehillwhatsapp.com`
   - Accept TOS and enter email
   - Choose validation: `1` (HTTP validation)
   - Store: `5` (PEM files)
   - Installation: `3` (No additional installation)

4. **Certificate locations:**
   ```
   C:\ProgramData\win-acme\certificates\treasurehillwhatsapp.com\
   ├── treasurehillwhatsapp.com-chain.pem       # Certificate
   ├── treasurehillwhatsapp.com-key.pem          # Private key
   └── treasurehillwhatsapp.com-crt.pem          # Certificate (alternative)
   ```

#### Option B: Use Existing Certificates from GoDaddy

If you have a GoDaddy SSL certificate:

1. Download certificate files from GoDaddy
2. You'll get:
   - Private key (`.key` file)
   - Certificate (`.crt` file)
   - CA bundle (`.crt` file)
3. Place them in: `C:\ssl\`

#### Option C: Convert Existing IIS Certificate

If you already have certificates in IIS:

```powershell
# Install OpenSSL
choco install openssl

# Export certificate from IIS
# IIS Manager → Server Certificates → Right-click cert → Export → Save as cert.pfx

# Convert PFX to PEM format
openssl pkcs12 -in cert.pfx -out certificate.crt -nodes -nokeys
openssl pkcs12 -in cert.pfx -out private.key -nodes -nocerts

# Move to ssl folder
mkdir C:\ssl
move certificate.crt C:\ssl\
move private.key C:\ssl\
```

### Step 3: Configure Environment Variables

Edit your `.env` file in the project root (`C:\WhatsAppBot\.env`):

```env
# Server Configuration
PORT=443
NODE_ENV=production

# HTTPS Configuration - ENABLE DIRECT HTTPS
HTTPS_ENABLED=true
SSL_KEY_PATH=C:/ProgramData/win-acme/certificates/treasurehillwhatsapp.com/treasurehillwhatsapp.com-key.pem
SSL_CERT_PATH=C:/ProgramData/win-acme/certificates/treasurehillwhatsapp.com/treasurehillwhatsapp.com-chain.pem

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/whatsapp-bot
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp-bot

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id

# Admin Dashboard Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourStrongPassword123!
SESSION_SECRET=your_random_secret_key_here_min_32_chars
```

**Important:**
- Use forward slashes (`/`) in paths, not backslashes (`\`)
- Make sure the certificate files exist at those paths

### Step 4: Verify Certificates

```powershell
# Check if certificate files exist
Test-Path "C:\ProgramData\win-acme\certificates\treasurehillwhatsapp.com\treasurehillwhatsapp.com-key.pem"
Test-Path "C:\ProgramData\win-acme\certificates\treasurehillwhatsapp.com\treasurehillwhatsapp.com-chain.pem"

# Should both return: True
```

### Step 5: Configure Windows Firewall

```powershell
# Open PowerShell as Administrator

# Allow port 443 (HTTPS)
New-NetFirewallRule -DisplayName "WhatsApp Bot HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow

# Allow port 80 (HTTP redirect)
New-NetFirewallRule -DisplayName "WhatsApp Bot HTTP Redirect" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
```

### Step 6: Start Application with PM2 (As Administrator)

```powershell
# IMPORTANT: Open PowerShell as Administrator
# (Right-click PowerShell → Run as Administrator)

# Navigate to your project
cd C:\WhatsAppBot

# Delete existing PM2 process if any
pm2 delete whatsapp-bot

# Start application on port 443
pm2 start server.js --name whatsapp-bot

# Save PM2 configuration
pm2 save

# View logs
pm2 logs whatsapp-bot
```

You should see:
```
============================================================
Server is running on port 443
Mode: HTTPS (Direct)
Admin dashboard: https://localhost:443/admin
Using SSL certificates from:
  Key: C:/ProgramData/win-acme/certificates/...
  Cert: C:/ProgramData/win-acme/certificates/...
HTTP redirect server running on port 80 → redirecting to HTTPS
============================================================
```

### Step 7: Configure PM2 to Run on Startup with Admin Rights

```powershell
# As Administrator, run:
pm2-startup install

# This creates a Windows service that runs PM2 with admin privileges
# The service starts automatically on boot
```

### Step 8: Verify It's Working

**Test locally:**
```powershell
# Test HTTPS
curl https://localhost/health

# Should return:
# {"status":"ok","https":true,"port":443,"timestamp":"..."}

# Test HTTP redirect
curl http://localhost
# Should redirect to HTTPS
```

**Test from internet:**
```powershell
# From any device on the internet
curl https://treasurehillwhatsapp.com/health
```

**Test admin dashboard:**
- Open browser
- Go to: `https://treasurehillwhatsapp.com/admin`
- Login with your credentials

---

## Certificate Auto-Renewal

### For win-acme Certificates:

win-acme automatically creates a scheduled task for renewal:

1. **Verify scheduled task exists:**
   ```powershell
   Get-ScheduledTask -TaskName "win-acme*"
   ```

2. **The task runs daily and auto-renews certificates when needed**

3. **After renewal, restart your app:**

   Create a post-renewal script: `C:\win-acme\Scripts\restart-app.ps1`
   ```powershell
   # restart-app.ps1
   pm2 restart whatsapp-bot
   ```

4. **Configure win-acme to run the script:**
   - Run `wacs.exe` again
   - Choose: `M` (Manage renewals)
   - Select your certificate
   - Add script installation step
   - Point to: `C:\win-acme\Scripts\restart-app.ps1`

---

## Twilio Webhook Configuration

Now that your server runs on HTTPS port 443:

1. **Go to Twilio Console:**
   - https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox

2. **Set webhook URL:**
   - When a message comes in: `https://treasurehillwhatsapp.com/webhook/whatsapp`
   - Method: **POST**
   - When a message status changes: `https://treasurehillwhatsapp.com/webhook/status`
   - Method: **POST**

3. **Save configuration**

---

## Troubleshooting

### Issue: "Port 443 already in use"

```powershell
# Check what's using port 443
netstat -ano | findstr :443

# If it's IIS (PID in System process), stop it:
iisreset /stop
Set-Service -Name W3SVC -StartupType Disabled
```

### Issue: "Permission denied" on port 443

```powershell
# Make sure you're running PowerShell as Administrator
# Close PowerShell and right-click → "Run as Administrator"

# Then restart PM2:
pm2 delete whatsapp-bot
pm2 start server.js --name whatsapp-bot
pm2 save
```

### Issue: "Error loading SSL certificates"

```powershell
# Verify paths in .env file
cat .env | Select-String "SSL"

# Check files exist
Test-Path $env:SSL_KEY_PATH
Test-Path $env:SSL_CERT_PATH

# Check file permissions
icacls "C:\ProgramData\win-acme\certificates\treasurehillwhatsapp.com\"

# Grant read permissions if needed
icacls "C:\ProgramData\win-acme\certificates\treasurehillwhatsapp.com\" /grant "Users:(OI)(CI)R"
```

### Issue: "Certificate not trusted" error

```powershell
# Make sure you're using Let's Encrypt or valid CA certificate
# Check certificate validity:
openssl x509 -in C:\ProgramData\win-acme\certificates\treasurehillwhatsapp.com\treasurehillwhatsapp.com-crt.pem -text -noout

# Verify issuer is Let's Encrypt or your CA
```

### Issue: PM2 not starting on reboot

```powershell
# Reinstall PM2 startup service
pm2 unstartup
pm2-startup install

# Save current configuration
pm2 save

# Verify service is running
Get-Service -Name "PM2*"
```

### Issue: Twilio webhook fails with SSL error

- Test your SSL with: https://www.ssllabs.com/ssltest/
- Enter: `treasurehillwhatsapp.com`
- You should get an "A" rating
- Twilio requires valid, trusted SSL certificates

---

## Quick Commands Reference

```powershell
# Start app
pm2 start server.js --name whatsapp-bot

# Stop app
pm2 stop whatsapp-bot

# Restart app
pm2 restart whatsapp-bot

# View logs
pm2 logs whatsapp-bot

# View status
pm2 status

# Save configuration
pm2 save

# Check if port 443 is listening
netstat -ano | findstr :443

# Test HTTPS locally
curl https://localhost/health

# Test from internet
curl https://treasurehillwhatsapp.com/health
```

---

## Security Checklist

- [x] Node.js running on port 443 with valid SSL certificate
- [x] IIS stopped and disabled
- [x] Windows Firewall configured (ports 80, 443)
- [x] PM2 configured to start on boot with admin rights
- [x] Strong admin password set in `.env`
- [x] SSL certificates auto-renew
- [x] MongoDB secured
- [x] `.env` file has correct permissions (not publicly accessible)

---

## Summary

Your setup is now:

1. ✅ Node.js runs directly on port 443
2. ✅ HTTPS handled by Node.js (no IIS)
3. ✅ SSL certificates from Let's Encrypt
4. ✅ Auto-renewal configured
5. ✅ PM2 ensures app stays running
6. ✅ Starts automatically on server reboot
7. ✅ Twilio webhooks work with HTTPS

**Access your bot:**
- Admin Dashboard: `https://treasurehillwhatsapp.com/admin`
- Health Check: `https://treasurehillwhatsapp.com/health`
- Twilio Webhook: `https://treasurehillwhatsapp.com/webhook/whatsapp`

**Your WhatsApp chatbot is now live on HTTPS port 443!** 🚀
