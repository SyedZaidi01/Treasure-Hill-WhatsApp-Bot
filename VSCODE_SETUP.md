# Running WhatsApp Bot on Port 443 from VS Code

Simple guide to run your WhatsApp chatbot directly from VS Code on HTTPS port 443.

---

## Quick Setup (5 Steps)

### Step 1: Stop IIS (Free Port 443)

Open PowerShell **as Administrator**:

```powershell
# Stop IIS
iisreset /stop

# Disable IIS from auto-starting
Set-Service -Name W3SVC -StartupType Disabled

# Verify port 443 is free
netstat -ano | findstr :443
# Should return nothing
```

### Step 2: Get SSL Certificates

**Option A: Use win-acme (Recommended - Free & Auto-Renewing)**

1. Download from: https://www.win-acme.com/
2. Extract to `C:\win-acme\`
3. Open PowerShell **as Administrator**:

```powershell
cd C:\win-acme
.\wacs.exe
```

4. Follow prompts:
   - Choose: **N** (Create certificate with default settings)
   - Choose: **2** (Manual input)
   - Host: `treasurehillwhatsapp.com`
   - Validation: **1** (HTTP validation - requires port 80 open)
   - Store: **5** (PEM files)
   - Installation: **3** (No additional installation)

5. Certificates will be saved to:
   ```
   C:\ProgramData\win-acme\certificates\treasurehillwhatsapp.com\
   ```

**Option B: Use GoDaddy SSL Certificate**

If you purchased SSL from GoDaddy:
1. Download your certificate files
2. Save to: `C:\ssl\`
   - Private key: `private.key`
   - Certificate: `certificate.crt`

### Step 3: Configure Environment Variables

Create `.env` file in your project root:

```env
# Server Configuration
PORT=443
NODE_ENV=production

# HTTPS Configuration
HTTPS_ENABLED=true

# SSL Certificate Paths (use forward slashes)
# For win-acme:
SSL_KEY_PATH=C:/ProgramData/win-acme/certificates/treasurehillwhatsapp.com/treasurehillwhatsapp.com-key.pem
SSL_CERT_PATH=C:/ProgramData/win-acme/certificates/treasurehillwhatsapp.com/treasurehillwhatsapp.com-chain.pem

# For GoDaddy/custom certificates:
# SSL_KEY_PATH=C:/ssl/private.key
# SSL_CERT_PATH=C:/ssl/certificate.crt

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/whatsapp-bot

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
SESSION_SECRET=random-secret-key-min-32-chars-long
```

### Step 4: Configure Windows Firewall

Open PowerShell **as Administrator**:

```powershell
# Allow HTTPS (port 443)
New-NetFirewallRule -DisplayName "WhatsApp Bot HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow

# Allow HTTP (port 80) for certificate validation and redirects
New-NetFirewallRule -DisplayName "WhatsApp Bot HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
```

### Step 5: Run from VS Code

**IMPORTANT: VS Code must run as Administrator to bind to port 443**

1. **Close VS Code if it's open**

2. **Open VS Code as Administrator:**
   - Right-click VS Code icon
   - Select "Run as administrator"

3. **Open your project:**
   - File → Open Folder
   - Select: `C:\WhatsAppBot` (or wherever you cloned the repo)

4. **Run the application:**

   **Method A: Using the integrated terminal**
   ```bash
   npm start
   ```

   **Method B: Using VS Code debugger (Recommended)**
   - Press `F5` or click "Run and Debug" in sidebar
   - Select: "Start WhatsApp Bot (HTTPS:443)"
   - Click the green play button

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

---

## Testing

### Test Locally

In your browser or PowerShell:

```powershell
# Test health endpoint
curl https://localhost/health

# Should return:
# {"status":"ok","https":true,"port":443,"timestamp":"..."}
```

### Test Admin Dashboard

Open browser:
- Go to: `https://localhost/admin`
- Login with your credentials from `.env`

### Test from Internet

From any device:
```bash
curl https://treasurehillwhatsapp.com/health
```

---

## Configure Twilio Webhook

1. Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox

2. Set webhook URL:
   - **When a message comes in:** `https://treasurehillwhatsapp.com/webhook/whatsapp`
   - **Method:** POST

3. Save configuration

4. Test by sending a WhatsApp message to your Twilio number

---

## VS Code Tips

### Always Run as Administrator

Create a shortcut for VS Code that always runs as admin:

1. Right-click VS Code desktop icon → Properties
2. Click "Advanced" button
3. Check ✅ "Run as administrator"
4. Click OK → OK

### Useful VS Code Extensions

- **REST Client** - Test your API endpoints
- **MongoDB for VS Code** - View your database
- **ESLint** - Code quality
- **Prettier** - Code formatting

### Debugging

The launch configuration (`.vscode/launch.json`) is already set up:

- Press `F5` to start debugging
- Set breakpoints by clicking left of line numbers
- Use Debug Console to inspect variables
- Auto-restarts on crashes

### View Logs

In VS Code terminal, you'll see:
- Incoming WhatsApp messages
- ElevenLabs responses
- MongoDB operations
- Any errors or warnings

---

## Keeping VS Code Running

### Option 1: Keep VS Code Open

Just leave VS Code running - your server stays active.

### Option 2: Run in Background with npm

If you close VS Code, the server stops. To keep it running:

```powershell
# In PowerShell as Administrator
cd C:\WhatsAppBot
npm start

# Keep PowerShell window open
```

### Option 3: Use Windows Task Scheduler

Create a scheduled task to run on startup:

1. Open Task Scheduler
2. Create Basic Task
3. Name: "WhatsApp Bot"
4. Trigger: "When the computer starts"
5. Action: "Start a program"
6. Program: `C:\Program Files\nodejs\node.exe`
7. Arguments: `C:\WhatsAppBot\server.js`
8. Start in: `C:\WhatsAppBot`
9. Check ✅ "Run with highest privileges"

---

## Troubleshooting

### "Port 443 already in use"

```powershell
# Check what's using port 443
netstat -ano | findstr :443

# Stop IIS if it's running
iisreset /stop
```

### "Permission denied" on port 443

Make sure VS Code is running as Administrator:
- Right-click VS Code → Run as administrator

### "Error loading SSL certificates"

Check your `.env` file:
- Paths use forward slashes: `C:/path/to/cert`
- Files exist at those paths
- You have read permissions

Verify:
```powershell
# Check if files exist
Test-Path "C:\ProgramData\win-acme\certificates\treasurehillwhatsapp.com\treasurehillwhatsapp.com-key.pem"
Test-Path "C:\ProgramData\win-acme\certificates\treasurehillwhatsapp.com\treasurehillwhatsapp.com-chain.pem"
```

### "Cannot connect to MongoDB"

Start MongoDB service:
```powershell
# Check if MongoDB is running
Get-Service MongoDB

# Start if stopped
Start-Service MongoDB
```

### Domain not resolving

Verify GoDaddy DNS:
```powershell
nslookup treasurehillwhatsapp.com
# Should return your server's public IP
```

### Twilio webhook fails

- Verify SSL certificate is valid: https://www.ssllabs.com/ssltest/
- Check Twilio debugger: https://console.twilio.com/us1/monitor/logs/debugger
- Make sure your server is accessible from internet

---

## Quick Commands

```powershell
# Start server
npm start

# Check if port 443 is listening
netstat -ano | findstr :443

# Test health endpoint
curl https://localhost/health

# Test from internet
curl https://treasurehillwhatsapp.com/health

# View certificate info
openssl x509 -in C:\ProgramData\win-acme\certificates\treasurehillwhatsapp.com\treasurehillwhatsapp.com-crt.pem -text -noout
```

---

## Your Setup

```
Internet → treasurehillwhatsapp.com → Your Server → Node.js (Port 443) → Response
                                                              ↓
                                                        ElevenLabs AI
                                                              ↓
                                                          MongoDB
```

**Simple, direct, no PM2, no IIS - just VS Code and Node.js on port 443!** 🚀

---

## Daily Development Workflow

1. **Morning:**
   - Open VS Code as Administrator
   - Press `F5` to start debugger
   - Server runs on port 443

2. **Make changes:**
   - Edit code in VS Code
   - Save file
   - VS Code auto-restarts (if using debugger)
   - Or manually restart: `Ctrl+Shift+F5`

3. **Test:**
   - Send WhatsApp message
   - Check admin dashboard
   - View logs in VS Code terminal

4. **Evening:**
   - Keep VS Code running if you want 24/7 uptime
   - Or stop server: `Ctrl+C` in terminal

---

## Production Notes

For 24/7 operation:
- Use Task Scheduler (see above)
- Or use PM2 (see `DIRECT_HTTPS_SETUP.md`)
- Or keep VS Code running

For development:
- Run from VS Code is perfect!
- Easy debugging and testing
- See logs in real-time

Your bot is now running on `https://treasurehillwhatsapp.com` directly from VS Code! 🎉
