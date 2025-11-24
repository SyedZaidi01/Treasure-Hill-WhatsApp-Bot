# HTTPS Configuration Guide

This guide shows you how to configure your WhatsApp Bot to run on HTTPS (port 443) on Windows Server 2025.

## Two Approaches

### **Approach 1: IIS Reverse Proxy (RECOMMENDED)** ✅
- Node.js runs on port 3000
- IIS handles HTTPS on port 443
- IIS forwards traffic to Node.js
- Easier SSL certificate management
- Better for Windows Server

### **Approach 2: Direct Node.js HTTPS**
- Node.js runs directly on port 443
- Handles SSL/TLS certificates in code
- Requires administrator privileges
- More complex certificate management

---

## Approach 1: IIS Reverse Proxy (Recommended)

This is already configured in your `DEPLOYMENT_GUIDE.md`. Here's a quick summary:

### Current Setup:
```
Internet (HTTPS:443) → IIS → Node.js (HTTP:3000) → Response
```

### Benefits:
- ✅ IIS handles SSL certificates automatically
- ✅ Let's Encrypt (win-acme) auto-renewal works seamlessly
- ✅ Node.js app runs without admin privileges
- ✅ Easy to manage multiple sites
- ✅ IIS provides additional security features

### Verification:

1. **Check IIS is listening on port 443:**
   ```powershell
   netstat -ano | findstr :443
   ```

2. **Verify SSL binding in IIS:**
   - Open IIS Manager
   - Select your website
   - Right-click → Edit Bindings
   - You should see:
     - Type: https, Port: 443, SSL Certificate: [Your certificate]

3. **Test HTTPS access:**
   ```powershell
   curl https://treasurehillwhatsapp.com/admin
   ```

### Your `.env` file should have:
```env
PORT=3000
NODE_ENV=production
```

**You're done!** IIS handles HTTPS, and your app runs on port 3000.

---

## Approach 2: Direct Node.js HTTPS (Alternative)

If you prefer Node.js to handle HTTPS directly on port 443:

### Step 1: Update Environment Variables

Edit your `.env` file:
```env
PORT=443
NODE_ENV=production
HTTPS_ENABLED=true
SSL_KEY_PATH=C:/ssl/private.key
SSL_CERT_PATH=C:/ssl/certificate.crt
```

### Step 2: Create HTTPS Server Configuration

I'll create an updated `server.js` file for you that supports both HTTP and HTTPS modes.

### Step 3: Get SSL Certificates

**Option A: Export from IIS (if using Let's Encrypt/win-acme)**

1. Open IIS Manager
2. Select your server
3. Double-click "Server Certificates"
4. Find your certificate
5. Right-click → Export
6. Save as PFX file with password
7. Convert PFX to PEM format:

```powershell
# Install OpenSSL (via Chocolatey)
choco install openssl

# Convert PFX to PEM
openssl pkcs12 -in certificate.pfx -out certificate.crt -nodes
openssl pkcs12 -in certificate.pfx -nocerts -out private.key -nodes
```

**Option B: Use existing Let's Encrypt certificates**

win-acme stores certificates in:
```
C:\ProgramData\win-acme\certificates\
```

### Step 4: Stop IIS (to free port 443)

```powershell
# Stop IIS
iisreset /stop

# Or stop specific site
Stop-Website -Name "WhatsAppBot"
```

### Step 5: Run Node.js with Admin Privileges

```powershell
# PM2 needs admin rights to bind to port 443
pm2 delete whatsapp-bot
pm2 start server.js --name whatsapp-bot

# Save configuration
pm2 save
```

---

## Updated server.js for HTTPS Support

Here's an enhanced `server.js` that supports both HTTP and HTTPS:

```javascript
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_ENABLED = process.env.HTTPS_ENABLED === 'true';

// Connect to MongoDB
connectDB();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: HTTPS_ENABLED // Use secure cookies with HTTPS
  }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Redirect HTTP to HTTPS (when HTTPS is enabled)
if (HTTPS_ENABLED && PORT === 443) {
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      return next();
    }
    res.redirect('https://' + req.headers.host + req.url);
  });
}

// Routes
app.use('/webhook', require('./routes/webhook'));
app.use('/admin', require('./routes/admin'));

// Home route
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', https: HTTPS_ENABLED });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Create server (HTTP or HTTPS)
let server;

if (HTTPS_ENABLED) {
  // HTTPS Mode
  try {
    const privateKey = fs.readFileSync(process.env.SSL_KEY_PATH, 'utf8');
    const certificate = fs.readFileSync(process.env.SSL_CERT_PATH, 'utf8');
    const ca = process.env.SSL_CA_PATH ? fs.readFileSync(process.env.SSL_CA_PATH, 'utf8') : null;

    const credentials = {
      key: privateKey,
      cert: certificate,
      ...(ca && { ca: ca })
    };

    server = https.createServer(credentials, app);

    // Also run HTTP server on port 80 to redirect to HTTPS
    if (PORT === 443) {
      const httpApp = express();
      httpApp.use('*', (req, res) => {
        res.redirect('https://' + req.headers.host + req.url);
      });
      http.createServer(httpApp).listen(80, () => {
        console.log('HTTP redirect server running on port 80');
      });
    }
  } catch (error) {
    console.error('Error loading SSL certificates:', error.message);
    console.log('Falling back to HTTP mode');
    server = http.createServer(app);
  }
} else {
  // HTTP Mode
  server = http.createServer(app);
}

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Mode: ${HTTPS_ENABLED ? 'HTTPS' : 'HTTP'}`);
  console.log(`Admin dashboard: ${HTTPS_ENABLED ? 'https' : 'http'}://localhost:${PORT}/admin`);
  if (HTTPS_ENABLED) {
    console.log(`Using SSL certificates from:`);
    console.log(`  Key: ${process.env.SSL_KEY_PATH}`);
    console.log(`  Cert: ${process.env.SSL_CERT_PATH}`);
  }
});

module.exports = server;
```

---

## Recommendation: Which Approach to Use?

### Use **Approach 1 (IIS Reverse Proxy)** if:
- ✅ You want easier SSL certificate management
- ✅ You want automatic certificate renewal
- ✅ You plan to host multiple sites/services
- ✅ You want better security and logging features
- ✅ You're comfortable with Windows Server/IIS

### Use **Approach 2 (Direct Node.js HTTPS)** if:
- You want Node.js to handle everything
- You're familiar with SSL certificate management
- You want maximum control over the HTTPS configuration
- You're deploying to a Linux-like environment later

---

## Quick Setup for Approach 1 (Current Setup)

Your application is **already configured** to work with HTTPS through IIS. Just ensure:

1. **IIS is running and configured** (from DEPLOYMENT_GUIDE.md)
2. **SSL certificate is installed** (via win-acme)
3. **HTTPS binding exists** in IIS
4. **Node.js app runs on port 3000**

Test it:
```powershell
# Start your app
pm2 start server.js --name whatsapp-bot

# Test HTTP (should redirect to HTTPS)
curl http://treasurehillwhatsapp.com

# Test HTTPS
curl https://treasurehillwhatsapp.com
```

---

## Troubleshooting

### Port 443 already in use
```powershell
# Check what's using port 443
netstat -ano | findstr :443

# If it's IIS and you want Node.js to use it:
iisreset /stop
```

### Certificate errors
```powershell
# Verify certificate is valid
# In PowerShell:
$cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object {$_.Subject -like "*treasurehillwhatsapp.com*"}
$cert | Format-List
```

### Permission denied on port 443
```powershell
# Run PM2 as administrator
# Or use IIS reverse proxy instead
```

### HTTPS not working with Twilio webhook
- Ensure your certificate is valid and trusted
- Test with: https://www.ssllabs.com/ssltest/
- Twilio requires valid SSL certificates (no self-signed)

---

## Summary

**For Windows Server 2025 + GoDaddy domain, I recommend Approach 1:**

1. Keep Node.js on port 3000
2. Let IIS handle HTTPS on port 443
3. Use win-acme for automatic certificate management
4. Your current setup from DEPLOYMENT_GUIDE.md is optimal

**Your setup should be:**
```
User → https://treasurehillwhatsapp.com:443 (IIS) → http://localhost:3000 (Node.js)
```

This is the most reliable and maintainable solution for Windows Server!
