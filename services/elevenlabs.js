const WebSocket = require('ws');

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.agentId = process.env.ELEVENLABS_AGENT_ID;
    this.wsBaseUrl = 'wss://api.elevenlabs.io';

    // Store conversation sessions for each phone number
    this.conversationSessions = new Map();
  }

  async sendMessage(phoneNumber, message) {
    return new Promise((resolve, reject) => {
      try {
        // WebSocket URL with agent_id query parameter
        const wsUrl = `${this.wsBaseUrl}/v1/convai/conversation?agent_id=${this.agentId}`;

        console.log('Connecting to ElevenLabs WebSocket:', {
          url: wsUrl,
          agentId: this.agentId,
          message: message.substring(0, 50)
        });

        // Create WebSocket connection
        const ws = new WebSocket(wsUrl, {
          headers: {
            'xi-api-key': this.apiKey
          }
        });

        let agentResponse = '';
        let conversationId = null;
        let responseTimeout;

        // Set timeout for response (30 seconds)
        responseTimeout = setTimeout(() => {
          ws.close();
          reject(new Error('Response timeout from ElevenLabs'));
        }, 30000);

        ws.on('open', () => {
          console.log('WebSocket connected to ElevenLabs');

          // Get existing conversation ID if any
          const existingConversationId = this.conversationSessions.get(phoneNumber);

          // Send initiation message
          const initiationMessage = {
            type: 'conversation_initiation_client_data'
          };

          // If we have an existing conversation, we could add it here
          // but ElevenLabs manages conversation via agent memory

          ws.send(JSON.stringify(initiationMessage));
          console.log('Sent initiation message');

          // Send user message
          const userMessage = {
            type: 'user_message',
            text: message
          };

          ws.send(JSON.stringify(userMessage));
          console.log('Sent user message:', message);
        });

        ws.on('message', (data) => {
          try {
            const response = JSON.parse(data.toString());
            console.log('Received from ElevenLabs:', response.type);

            // Handle different message types
            switch (response.type) {
              case 'conversation_initiation_metadata':
                conversationId = response.conversation_initiation_metadata_event?.conversation_id;
                if (conversationId) {
                  console.log('Got conversation ID:', conversationId);
                  this.conversationSessions.set(phoneNumber, conversationId);
                }
                break;

              case 'agent_response':
                const text = response.agent_response_event?.agent_response;
                if (text) {
                  agentResponse += text;
                  console.log('Agent response chunk:', text.substring(0, 50));
                }
                break;

              case 'agent_response_correction':
                // Handle response corrections
                const corrected = response.agent_response_correction_event?.corrected_agent_response;
                if (corrected) {
                  agentResponse = corrected;
                  console.log('Agent response corrected');
                }
                break;

              case 'audio':
                // Audio response (we're only using text, so we can ignore)
                break;

              case 'ping':
                // Respond to ping with pong
                ws.send(JSON.stringify({
                  type: 'pong',
                  event_id: response.ping_event?.event_id
                }));
                break;

              case 'interruption':
                // Handle interruption
                console.log('Interruption event received');
                break;

              default:
                console.log('Unknown message type:', response.type);
            }

            // If we have a response and the agent is done talking, close connection
            if (agentResponse && response.type === 'agent_response') {
              clearTimeout(responseTimeout);
              ws.close();
              resolve(agentResponse || 'Sorry, I could not process your message.');
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });

        ws.on('error', (error) => {
          clearTimeout(responseTimeout);
          console.error('WebSocket error:', error.message);
          reject(new Error(`WebSocket error: ${error.message}`));
        });

        ws.on('close', () => {
          clearTimeout(responseTimeout);
          console.log('WebSocket closed');

          // If we have a response, resolve; otherwise reject
          if (agentResponse) {
            resolve(agentResponse);
          } else if (!responseTimeout) {
            // Already resolved or rejected
            return;
          } else {
            reject(new Error('WebSocket closed without response'));
          }
        });

      } catch (error) {
        console.error('ElevenLabs service error:', error);
        reject(error);
      }
    });
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
