const axios = require('axios');

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.agentId = process.env.ELEVENLABS_AGENT_ID;
    this.baseUrl = 'https://api.elevenlabs.io/v1';

    // Store conversation sessions for each phone number
    this.conversationSessions = new Map();
  }

  async sendMessage(phoneNumber, message) {
    try {
      // Get or create conversation session for this phone number
      let conversationId = this.conversationSessions.get(phoneNumber);

      // Correct endpoint for conversational AI text chat
      const endpoint = `${this.baseUrl}/convai/conversation/text`;

      const requestData = {
        agent_id: this.agentId,
        text: message
      };

      // If we have an existing conversation, include the conversation_id
      if (conversationId) {
        requestData.conversation_id = conversationId;
      }

      console.log('Sending to ElevenLabs:', {
        endpoint,
        agentId: this.agentId,
        conversationId: conversationId || 'new',
        messageLength: message.length
      });

      const response = await axios.post(endpoint, requestData, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      console.log('ElevenLabs response received:', {
        hasConversationId: !!response.data.conversation_id,
        responseKeys: Object.keys(response.data)
      });

      // Store conversation ID for future messages
      if (response.data.conversation_id) {
        this.conversationSessions.set(phoneNumber, response.data.conversation_id);
        console.log('Stored conversation ID:', response.data.conversation_id);
      }

      // Extract the text response from ElevenLabs
      const assistantResponse = response.data.text
        || response.data.analysis?.text
        || response.data.message
        || response.data.response
        || 'Sorry, I could not process your message.';

      console.log('Assistant response:', assistantResponse.substring(0, 100));

      return assistantResponse;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      console.error('Error status:', error.response?.status);
      console.error('Request details:', {
        endpoint: `${this.baseUrl}/convai/conversation/text`,
        agentId: this.agentId,
        apiKeyPresent: !!this.apiKey,
        apiKeyPrefix: this.apiKey?.substring(0, 8) + '...'
      });
      throw new Error('Failed to get response from ElevenLabs');
    }
  }

  // Clear conversation session (useful for resetting context)
  clearSession(phoneNumber) {
    this.conversationSessions.delete(phoneNumber);
  }

  // Get active session count
  getActiveSessionCount() {
    return this.conversationSessions.size;
  }
}

module.exports = new ElevenLabsService();
