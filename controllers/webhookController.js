const twilio = require('twilio');
const Conversation = require('../models/Conversation');
const elevenLabsService = require('../services/elevenlabs');

const MessagingResponse = twilio.twiml.MessagingResponse;

exports.handleIncomingMessage = async (req, res) => {
  try {
    const { From, Body, ProfileName } = req.body;

    console.log(`Incoming message from ${From}: ${Body}`);

    // Create TwiML response
    const twiml = new MessagingResponse();

    // Get or create conversation
    let conversation = await Conversation.findOne({ phoneNumber: From });

    if (!conversation) {
      conversation = new Conversation({
        phoneNumber: From,
        userName: ProfileName || 'Unknown User',
        messages: []
      });
    } else if (ProfileName && conversation.userName === 'Unknown User') {
      conversation.userName = ProfileName;
    }

    // Add user message to conversation
    conversation.messages.push({
      role: 'user',
      content: Body,
      timestamp: new Date()
    });

    // Get response from ElevenLabs
    let assistantResponse;
    try {
      assistantResponse = await elevenLabsService.sendMessage(From, Body);
    } catch (error) {
      console.error('Error getting ElevenLabs response:', error);
      assistantResponse = 'Sorry, I am having trouble processing your message right now. Please try again later.';
    }

    // Add assistant response to conversation
    conversation.messages.push({
      role: 'assistant',
      content: assistantResponse,
      timestamp: new Date()
    });

    // Save conversation
    await conversation.save();

    // Send response via Twilio
    twiml.message(assistantResponse);

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('Webhook error:', error);
    const twiml = new MessagingResponse();
    twiml.message('Sorry, an error occurred. Please try again.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
};

exports.handleStatus = (req, res) => {
  // Handle message status callbacks
  console.log('Message status:', req.body);
  res.sendStatus(200);
};
