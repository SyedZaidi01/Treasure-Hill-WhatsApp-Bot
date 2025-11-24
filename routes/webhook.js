const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Twilio WhatsApp webhook endpoint
router.post('/whatsapp', webhookController.handleIncomingMessage);

// Message status callback
router.post('/status', webhookController.handleStatus);

module.exports = router;
