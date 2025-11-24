# Complete Deployment Guide - Windows Server 2025 + GoDaddy Domain

This guide walks you through deploying the WhatsApp chatbot on Windows Server 2025 with your GoDaddy domain `treasurehillwhatsapp.com` and setting up Twilio WhatsApp integration.

## Table of Contents

1. [Windows Server 2025 Setup](#windows-server-2025-setup)
2. [GoDaddy Domain Configuration](#godaddy-domain-configuration)
3. [SSL Certificate Setup](#ssl-certificate-setup)
4. [Detailed Twilio WhatsApp Setup](#detailed-twilio-whatsapp-setup)
5. [Application Deployment](#application-deployment)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Windows Server 2025 Setup

### Step 1: Install Node.js on Windows Server

1. **Download Node.js**
   - Visit: https://nodejs.org/
   - Download the **LTS version** (recommended for production)
   - Choose the **Windows Installer (.msi)** for 64-bit

2. **Install Node.js**
   - Run the installer as Administrator
   - Accept the license agreement
   - Keep default installation path: `C:\Program Files\nodejs\`
   - ✅ Check "Automatically install the necessary tools" (includes npm)
   - Complete the installation
   - Restart your server if prompted

3. **Verify Installation**
   - Open **PowerShell** as Administrator
   - Run:
     ```powershell
     node --version
     npm --version
     ```
   - You should see version numbers (e.g., v20.x.x)

### Step 2: Install MongoDB on Windows Server

**Option A: Local MongoDB Installation**

1. **Download MongoDB**
   - Visit: https://www.mongodb.com/try/download/community
   - Select: Windows, MSI package
   - Download the latest version

2. **Install MongoDB**
   - Run installer as Administrator
   - Choose "Complete" installation
   - Install MongoDB as a Windows Service ✅
   - Set Service Name: `MongoDB`
   - Set Data Directory: `C:\Program Files\MongoDB\Server\7.0\data\`
   - Set Log Directory: `C:\Program Files\MongoDB\Server\7.0\log\`
   - Install MongoDB Compass (GUI tool) - Optional but recommended

3. **Verify MongoDB is Running**
   - Open Services (Win + R, type `services.msc`)
   - Find "MongoDB" service - should be "Running"
   - Open PowerShell and run:
     ```powershell
     mongo --version
     ```

**Option B: MongoDB Atlas (Cloud - Recommended for Production)**

1. Visit https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster (M0 Free tier available)
4. Wait for cluster creation (5-10 minutes)
5. Click "Connect" → "Connect your application"
6. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
7. Save this for your `.env` file

### Step 3: Install Git (Optional but Recommended)

1. Download Git for Windows: https://git-scm.com/download/win
2. Run installer with default options
3. Verify: `git --version` in PowerShell

### Step 4: Configure Windows Firewall

1. **Open Windows Defender Firewall**
   - Press Win + R, type `wf.msc`, press Enter

2. **Create Inbound Rule for Port 3000** (or your chosen port)
   - Click "Inbound Rules" → "New Rule"
   - Rule Type: **Port**
   - Protocol: **TCP**
   - Specific local ports: **3000**
   - Action: **Allow the connection**
   - Profile: Check all (Domain, Private, Public)
   - Name: `WhatsApp Bot - Node.js`
   - Description: `Allows incoming connections to WhatsApp chatbot`
   - Click Finish

3. **Create Inbound Rule for Port 80 (HTTP)**
   - Repeat above for Port **80**
   - Name: `HTTP Traffic`

4. **Create Inbound Rule for Port 443 (HTTPS)**
   - Repeat above for Port **443**
   - Name: `HTTPS Traffic`

### Step 5: Install IIS (Internet Information Services) with Reverse Proxy

IIS will act as a reverse proxy to forward traffic from port 80/443 to your Node.js app on port 3000.

1. **Install IIS**
   - Open **Server Manager**
   - Click "Add roles and features"
   - Server Roles → Check **Web Server (IIS)**
   - Click through and install

2. **Install URL Rewrite Module**
   - Download from: https://www.iis.net/downloads/microsoft/url-rewrite
   - Install the module
   - Restart IIS

3. **Install Application Request Routing (ARR)**
   - Download from: https://www.iis.net/downloads/microsoft/application-request-routing
   - Install ARR
   - Restart IIS

4. **Configure ARR**
   - Open **IIS Manager** (Win + R, type `inetmgr`)
   - Select your server in the left panel
   - Double-click "Application Request Routing Cache"
   - Click "Server Proxy Settings" in the right panel
   - Check "Enable proxy" ✅
   - Click Apply

### Step 6: Install PM2 (Process Manager)

PM2 keeps your Node.js application running, restarts it on crashes, and starts it on server reboot.

1. **Install PM2 globally**
   ```powershell
   npm install -g pm2
   npm install -g pm2-windows-startup
   ```

2. **Configure PM2 to start on Windows boot**
   ```powershell
   pm2-startup install
   ```

---

## GoDaddy Domain Configuration

### Step 1: Get Your Server's Public IP Address

On your Windows Server, run:
```powershell
Invoke-RestMethod -Uri https://api.ipify.org?format=json | Select-Object -ExpandProperty ip
```

Note down this IP address (e.g., `203.0.113.45`)

### Step 2: Configure DNS Records in GoDaddy

1. **Log in to GoDaddy**
   - Visit: https://www.godaddy.com
   - Sign in to your account
   - Go to "My Products"

2. **Access DNS Management**
   - Find `treasurehillwhatsapp.com` in your domains list
   - Click the three dots (⋮) or "Manage" button
   - Click "Manage DNS"

3. **Add/Update A Record for Root Domain**
   - Find the **A** record for `@` (root domain)
   - If it exists, click "Edit" (pencil icon)
   - If not, click "Add" → Select "A" record

   Set the following:
   - **Type**: A
   - **Name**: @ (this represents your root domain)
   - **Value**: Your Windows Server IP (e.g., `203.0.113.45`)
   - **TTL**: 600 seconds (10 minutes) - or default

   Click Save

4. **Add A Record for www Subdomain**
   - Click "Add" → Select "A" record

   Set the following:
   - **Type**: A
   - **Name**: www
   - **Value**: Your Windows Server IP (same as above)
   - **TTL**: 600 seconds

   Click Save

5. **Verify DNS Records**

   Your DNS records should look like this:
   ```
   Type    Name    Value               TTL
   ----    ----    -----               ---
   A       @       203.0.113.45        600
   A       www     203.0.113.45        600
   ```

6. **Wait for DNS Propagation**
   - DNS changes can take 1-48 hours to propagate worldwide
   - Usually happens within 15 minutes to 2 hours
   - Check propagation status: https://www.whatsmydns.net/

### Step 3: Verify Domain Resolution

After DNS propagation, verify your domain points to your server:

```powershell
# Check if domain resolves to your IP
nslookup treasurehillwhatsapp.com

# Should return your server's IP address
```

---

## SSL Certificate Setup

### Option 1: Let's Encrypt with win-acme (Free SSL - Recommended)

1. **Download win-acme**
   - Visit: https://www.win-acme.com/
   - Download the latest release
   - Extract to `C:\win-acme\`

2. **Run win-acme**
   - Open PowerShell as Administrator
   - Navigate to: `cd C:\win-acme\`
   - Run: `.\wacs.exe`

3. **Create Certificate**
   - Choose option: `N: Create certificate (default settings)`
   - Binding type: `1: IIS`
   - Select your website
   - Enter email address for Let's Encrypt notifications
   - Accept terms of service

4. **Certificate Auto-Renewal**
   - win-acme automatically creates a scheduled task to renew certificates
   - Verify in Task Scheduler: Look for "win-acme renew"

### Option 2: Use GoDaddy SSL Certificate (Paid)

1. Purchase SSL certificate from GoDaddy
2. Download and install certificate
3. Bind certificate to IIS website
4. Configure in IIS Manager → Sites → Bindings → Add HTTPS

---

## Detailed Twilio WhatsApp Setup

### Step 1: Create Twilio Account

1. **Sign Up**
   - Visit: https://www.twilio.com/try-twilio
   - Click "Sign up"
   - Fill in your information:
     - First Name
     - Last Name
     - Email address
     - Password (must be strong)
   - Check the reCAPTCHA
   - Click "Start your free trial"

2. **Verify Your Email**
   - Check your email inbox
   - Click the verification link from Twilio

3. **Verify Your Phone Number**
   - Enter your phone number
   - Choose verification method (SMS or Call)
   - Enter the verification code received

4. **Complete Onboarding**
   - Answer a few questions about your use case:
     - "Which Twilio product are you here to use?" → **Messaging**
     - "What do you plan to build?" → **Chatbot** or **Customer notifications**
     - "How do you want to build?" → **With code**
     - Programming language → **Node.js**
   - Click "Get Started"

### Step 2: Get Your Twilio Credentials

1. **Access Console Dashboard**
   - After login, you'll be on the Console Dashboard
   - URL: https://console.twilio.com/

2. **Find Your Account SID and Auth Token**
   - On the dashboard, you'll see a section called "Account Info"
   - **Account SID**: Starts with "AC..." (e.g., `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
     - Click the copy icon to copy it
   - **Auth Token**: Click "View" to reveal, then copy
     - Keep this SECRET - never share publicly!

   Save both values - you'll need them for your `.env` file.

### Step 3: Set Up WhatsApp Sandbox (For Development/Testing)

Twilio provides a WhatsApp Sandbox for testing without approval. Later, you'll need to request WhatsApp Business API access for production.

1. **Access WhatsApp Sandbox**
   - In Twilio Console: Click "Messaging" in left sidebar
   - Click "Try it out" → "Send a WhatsApp message"
   - Or directly visit: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

2. **Join the Sandbox**
   - You'll see instructions like: "Send 'join [your-code]' to +1 415 523 8886"
   - **Your sandbox code** is unique (e.g., `join shadow-window`)
   - Open WhatsApp on your phone
   - Add the number: **+1 (415) 523-8886** to your contacts (optional)
   - Send the message: `join your-code` (replace with your actual code)
   - You'll receive a confirmation: "Twilio Sandbox: ✅ You are now in the sandbox!"

3. **Get Your WhatsApp Sandbox Number**
   - In the sandbox page, you'll see:
     - **From number**: `+1 415 523 8886`
     - Format for code: `whatsapp:+14155238886`

   This is your `TWILIO_WHATSAPP_NUMBER` for `.env` file.

### Step 4: Configure Webhook URL

You need to tell Twilio where to send incoming WhatsApp messages. This is your server's webhook endpoint.

**Important**: Twilio requires HTTPS (secure connection). You cannot use HTTP or local addresses.

1. **Access Sandbox Settings**
   - Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
   - Or: Messaging → Try it out → WhatsApp Sandbox Settings

2. **Configure Webhook**

   In the "Sandbox Configuration" section:

   - **WHEN A MESSAGE COMES IN**:
     - URL: `https://treasurehillwhatsapp.com/webhook/whatsapp`
     - HTTP Method: **POST**

   - **WHEN A MESSAGE STATUS CHANGES** (optional but recommended):
     - URL: `https://treasurehillwhatsapp.com/webhook/status`
     - HTTP Method: **POST**

3. **Save Configuration**
   - Click "Save" at the bottom

### Step 5: Request WhatsApp Business API Access (For Production)

The sandbox is for testing only. For production use with real customers:

1. **Access WhatsApp Senders**
   - In Twilio Console: Messaging → Senders → WhatsApp Senders
   - Click "Request Access" or "New WhatsApp Sender"

2. **Prepare Required Information**
   - **Business Name**: Treasure Hill
   - **Business Website**: https://treasurehillwhatsapp.com
   - **Business Type**: Select your category
   - **Business Address**
   - **Business Description**: Explain what your bot does
   - **Facebook Business Manager ID**: You'll need to create one at https://business.facebook.com
   - **Phone Number**: A dedicated business phone number

3. **Complete WhatsApp Business Profile**
   - Upload business logo (square image, min 192x192px)
   - Business description (max 256 characters)
   - Business category
   - Contact information

4. **Approval Process**
   - Submit your application
   - WhatsApp/Facebook will review (typically 1-3 business days)
   - You'll receive email notification when approved
   - Once approved, you'll get a dedicated WhatsApp number

5. **Configure Production Webhook**
   - Once approved, go to your WhatsApp sender
   - Configure the same webhook URLs as in sandbox:
     - Incoming: `https://treasurehillwhatsapp.com/webhook/whatsapp`
     - Status: `https://treasurehillwhatsapp.com/webhook/status`

### Step 6: Understanding Twilio WhatsApp Messaging

**Message Flow:**
1. User sends WhatsApp message → Twilio receives it
2. Twilio sends HTTP POST to your webhook (`/webhook/whatsapp`)
3. Your server processes message with ElevenLabs AI
4. Your server responds with TwiML (Twilio Markup Language)
5. Twilio sends response back to user via WhatsApp

**Webhook Payload Example:**

When someone messages your WhatsApp number, Twilio sends:
```json
{
  "From": "whatsapp:+1234567890",
  "To": "whatsapp:+14155238886",
  "Body": "Hello, I need help",
  "ProfileName": "John Doe",
  "MessageSid": "SMxxxxxxxxxx"
}
```

Your app processes this and responds with TwiML:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    <Body>Hi John! How can I help you today?</Body>
  </Message>
</Response>
```

### Step 7: Testing Webhooks

**While Developing (Before Domain Setup):**

Use ngrok to test locally:
```powershell
# Install ngrok
choco install ngrok
# Or download from https://ngrok.com/download

# Run ngrok
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this in Twilio webhook: https://abc123.ngrok.io/webhook/whatsapp
```

**After Domain Setup:**

Use your actual domain:
- Webhook URL: `https://treasurehillwhatsapp.com/webhook/whatsapp`

---

## Application Deployment

### Step 1: Clone/Upload Your Code to Windows Server

**Option A: Using Git**
```powershell
cd C:\
git clone https://github.com/SyedZaidi01/Treasure-Hill-WhatsApp-Bot.git
cd Treasure-Hill-WhatsApp-Bot
```

**Option B: Manual Upload**
- Use Remote Desktop to copy files
- Or use FileZilla/WinSCP
- Place in: `C:\WhatsAppBot\`

### Step 2: Install Dependencies

```powershell
cd C:\WhatsAppBot  # or wherever you placed your code
npm install
```

### Step 3: Configure Environment Variables

1. **Create `.env` file**
   ```powershell
   copy .env.example .env
   notepad .env
   ```

2. **Fill in your credentials**
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=production

   # MongoDB Configuration
   # For local MongoDB:
   MONGODB_URI=mongodb://localhost:27017/whatsapp-bot
   # For MongoDB Atlas:
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

3. **Save and close**

### Step 4: Start Application with PM2

```powershell
# Start the app
pm2 start server.js --name whatsapp-bot

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup windows

# View app status
pm2 status

# View logs
pm2 logs whatsapp-bot

# Restart app
pm2 restart whatsapp-bot

# Stop app
pm2 stop whatsapp-bot
```

### Step 5: Configure IIS Reverse Proxy

1. **Create web.config file**

   In your application root (`C:\WhatsAppBot\`), create `web.config`:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <configuration>
     <system.webServer>
       <rewrite>
         <rules>
           <rule name="ReverseProxyInboundRule1" stopProcessing="true">
             <match url="(.*)" />
             <action type="Rewrite" url="http://localhost:3000/{R:1}" />
           </rule>
         </rules>
       </rewrite>
       <security>
         <requestFiltering>
           <requestLimits maxAllowedContentLength="52428800" />
         </requestFiltering>
       </security>
     </system.webServer>
   </configuration>
   ```

2. **Create Website in IIS**
   - Open IIS Manager
   - Right-click "Sites" → "Add Website"
   - **Site name**: `WhatsAppBot`
   - **Physical path**: `C:\WhatsAppBot`
   - **Binding**:
     - Type: **http**
     - IP address: **All Unassigned**
     - Port: **80**
     - Host name: `treasurehillwhatsapp.com`
   - Click OK

3. **Add HTTPS Binding** (after SSL certificate is installed)
   - Right-click your website → "Edit Bindings"
   - Click "Add"
   - Type: **https**
   - Port: **443**
   - Host name: `treasurehillwhatsapp.com`
   - SSL certificate: Select your certificate
   - Click OK

---

## Testing

### Test 1: Server Accessibility

```powershell
# Test if Node.js app is running
curl http://localhost:3000

# Test if IIS reverse proxy works
curl http://localhost

# Test domain (after DNS propagation)
curl http://treasurehillwhatsapp.com
```

### Test 2: Admin Dashboard Access

1. Open browser
2. Navigate to: `https://treasurehillwhatsapp.com/admin`
3. Login with credentials from `.env`
4. You should see the dashboard

### Test 3: WhatsApp Integration

1. Open WhatsApp on your phone
2. Send a message to your Twilio WhatsApp number
3. You should receive an AI-generated response
4. Check admin dashboard - the conversation should appear

### Test 4: Webhook Connectivity

Check Twilio debugger:
- Go to: https://console.twilio.com/us1/monitor/logs/debugger
- Look for recent webhook calls
- Green check = success
- Red X = error (check error message)

---

## Troubleshooting

### Issue: Domain not resolving

**Solution:**
- Wait for DNS propagation (up to 48 hours)
- Check DNS settings in GoDaddy
- Verify A records are correct
- Use `nslookup treasurehillwhatsapp.com` to check

### Issue: "502 Bad Gateway" error

**Solution:**
- Ensure Node.js app is running: `pm2 status`
- Check if app is listening on port 3000: `netstat -ano | findstr :3000`
- Restart app: `pm2 restart whatsapp-bot`
- Check logs: `pm2 logs whatsapp-bot`

### Issue: Twilio webhook failing

**Solution:**
- Verify URL is HTTPS (not HTTP)
- Check Windows Firewall allows port 80/443
- Test webhook URL in browser: `https://treasurehillwhatsapp.com/webhook/whatsapp`
- Check Twilio debugger for specific error
- Ensure SSL certificate is valid

### Issue: MongoDB connection error

**Solution:**
- Verify MongoDB service is running (Services panel)
- Check connection string in `.env`
- For Atlas: Whitelist your server IP in Atlas dashboard
- Test connection: `mongo` in PowerShell (for local)

### Issue: ElevenLabs API errors

**Solution:**
- Verify API key is correct
- Check Agent ID is valid
- Ensure you have API credits
- Check ElevenLabs status: https://status.elevenlabs.io/

### Issue: PM2 not starting on reboot

**Solution:**
```powershell
pm2 unstartup windows
pm2-startup install
pm2 save
```

### Issue: App crashes repeatedly

**Solution:**
```powershell
# View detailed logs
pm2 logs whatsapp-bot --lines 100

# Check for errors in code
# Common issues:
# - Missing environment variables
# - Port already in use
# - Database connection issues
```

---

## Security Checklist

- [ ] Changed default admin password
- [ ] SSL certificate installed and working
- [ ] MongoDB authentication enabled (if local)
- [ ] Firewall rules configured correctly
- [ ] Windows updates installed
- [ ] PM2 running as Windows service
- [ ] `.env` file not publicly accessible
- [ ] Regular backups configured
- [ ] Server monitoring set up

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor PM2 logs: `pm2 logs`
- Check admin dashboard for conversation issues

**Weekly:**
- Review Twilio logs/usage
- Check ElevenLabs API usage/costs
- Backup MongoDB database

**Monthly:**
- Windows Server updates
- npm package updates: `npm audit` and `npm update`
- Review SSL certificate expiration (auto-renews with win-acme)

### Backup MongoDB

```powershell
# Create backup
mongodump --db whatsapp-bot --out C:\Backups\mongodb\

# Restore backup
mongorestore --db whatsapp-bot C:\Backups\mongodb\whatsapp-bot\
```

---

## Support Resources

- **Twilio Console**: https://console.twilio.com/
- **Twilio Support**: https://support.twilio.com/
- **ElevenLabs Dashboard**: https://elevenlabs.io/
- **GoDaddy Support**: https://www.godaddy.com/help
- **Windows Server Docs**: https://docs.microsoft.com/en-us/windows-server/

---

## Next Steps

1. ✅ Complete Windows Server setup
2. ✅ Configure GoDaddy domain
3. ✅ Install SSL certificate
4. ✅ Set up Twilio WhatsApp sandbox
5. ✅ Deploy application
6. ✅ Test end-to-end
7. 🔄 Request WhatsApp Business API access for production
8. 📈 Monitor and maintain

Your WhatsApp chatbot is now live at `https://treasurehillwhatsapp.com`!
