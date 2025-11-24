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

      const endpoint = `${this.baseUrl}/convai/conversation`;

      const requestData = {
        agent_id: this.agentId,
        text: message
      };

      // If we have an existing conversation, include the conversation_id
      if (conversationId) {
        requestData.conversation_id = conversationId;
      }

      const response = await axios.post(endpoint, requestData, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      // Store conversation ID for future messages
      if (response.data.conversation_id) {
        this.conversationSessions.set(phoneNumber, response.data.conversation_id);
      }

      // Extract the text response from ElevenLabs
      const assistantResponse = response.data.response || response.data.text || 'Sorry, I could not process your message.';

      return assistantResponse;
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
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
