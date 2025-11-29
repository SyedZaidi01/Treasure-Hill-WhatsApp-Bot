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

// Make request available in views
app.use((req, res, next) => {
  res.locals.req = req;
  next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Trust proxy when behind IIS or other reverse proxy
app.set('trust proxy', 1);

// Routes
app.use('/webhook', require('./routes/webhook'));
app.use('/webhook/hubspot', require('./routes/hubspotWebhook'));
app.use('/admin', require('./routes/admin'));
app.use('/admin/leads', require('./routes/leads'));

// Home route
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Health check endpoint
app.get('/health', (req, res) => {
  const hubspotPoller = require('./services/hubspotPoller');
  
  res.json({
    status: 'ok',
    https: HTTPS_ENABLED,
    port: PORT,
    timestamp: new Date().toISOString(),
    hubspotPoller: hubspotPoller.getStatus()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Create server (HTTP or HTTPS)
let server;

if (HTTPS_ENABLED) {
  // HTTPS Mode - Node.js handles SSL directly
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
    console.log('HTTPS mode enabled');

    // Also run HTTP server on port 80 to redirect to HTTPS (if running on port 443)
    if (PORT === 443) {
      const httpApp = express();
      httpApp.use('*', (req, res) => {
        res.redirect('https://' + req.headers.host + req.url);
      });
      http.createServer(httpApp).listen(80, () => {
        console.log('HTTP redirect server running on port 80 → redirecting to HTTPS');
      });
    }
  } catch (error) {
    console.error('Error loading SSL certificates:', error.message);
    console.log('Falling back to HTTP mode');
    server = http.createServer(app);
  }
} else {
  // HTTP Mode (default) - typically used with IIS reverse proxy
  server = http.createServer(app);
}

// Start server
server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`Server is running on port ${PORT}`);
  console.log(`Mode: ${HTTPS_ENABLED ? 'HTTPS (Direct)' : 'HTTP (Reverse Proxy)'}`);
  console.log(`Admin dashboard: ${HTTPS_ENABLED ? 'https' : 'http'}://localhost:${PORT}/admin`);
  console.log(`Leads dashboard: ${HTTPS_ENABLED ? 'https' : 'http'}://localhost:${PORT}/admin/leads`);
  
  if (HTTPS_ENABLED) {
    console.log(`Using SSL certificates from:`);
    console.log(`  Key: ${process.env.SSL_KEY_PATH}`);
    console.log(`  Cert: ${process.env.SSL_CERT_PATH}`);
  } else {
    console.log('Note: Use IIS/nginx reverse proxy for HTTPS in production');
  }
  console.log('='.repeat(60));

  // Start HubSpot Poller
  const hubspotPoller = require('./services/hubspotPoller');
  hubspotPoller.start();
});

module.exports = server;
