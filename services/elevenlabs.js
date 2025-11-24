const WebSocket = require('ws');

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.agentId = process.env.ELEVENLABS_AGENT_ID;
    this.wsBaseUrl = 'wss://api.elevenlabs.io';

    // Store WebSocket connections for each phone number
    this.connections = new Map();

    // Store pending responses
    this.pendingResponses = new Map();

    // Connection timeout (close after 1 minute of inactivity to reset context)
    this.connectionTimeout = 60 * 1000; // 1 minute
  }

  async sendMessage(phoneNumber, message) {
    return new Promise((resolve, reject) => {
      try {
        // Get or create WebSocket connection for this phone number
        let wsConnection = this.connections.get(phoneNumber);

        if (!wsConnection || wsConnection.ws.readyState !== WebSocket.OPEN) {
          console.log('Creating new WebSocket connection for:', phoneNumber);
          wsConnection = this.createConnection(phoneNumber);
          this.connections.set(phoneNumber, wsConnection);
        } else {
          console.log('Reusing existing WebSocket connection for:', phoneNumber);
          // Clear existing timeout
          if (wsConnection.timeout) {
            clearTimeout(wsConnection.timeout);
          }
        }

        // Store this pending response
        const responseId = Date.now();
        this.pendingResponses.set(responseId, {
          resolve,
          reject,
          response: '',
          phoneNumber
        });

        // Set timeout for this specific message
        const messageTimeout = setTimeout(() => {
          const pending = this.pendingResponses.get(responseId);
          if (pending) {
            this.pendingResponses.delete(responseId);
            reject(new Error('Response timeout from ElevenLabs'));
          }
        }, 30000);

        // Function to send the message
        const sendUserMessage = () => {
          const userMessage = {
            type: 'user_message',
            text: message
          };

          wsConnection.ws.send(JSON.stringify(userMessage));
          console.log('Sent message to ElevenLabs:', message);

          // Set connection timeout to close if inactive (1 minute)
          wsConnection.timeout = setTimeout(() => {
            console.log('⏱️  1 minute inactivity - Closing WebSocket and resetting context for:', phoneNumber);
            this.closeConnection(phoneNumber);
          }, this.connectionTimeout);
        };

        // Send message if connection is already open, otherwise queue it
        if (wsConnection.ws.readyState === WebSocket.OPEN) {
          sendUserMessage();
        } else {
          // Queue the message to be sent when connection opens
          wsConnection.ws.once('open', sendUserMessage);
        }

      } catch (error) {
        console.error('ElevenLabs service error:', error);
        reject(error);
      }
    });
  }

  createConnection(phoneNumber) {
    const wsUrl = `${this.wsBaseUrl}/v1/convai/conversation?agent_id=${this.agentId}`;

    console.log('Connecting to ElevenLabs WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl, {
      headers: {
        'xi-api-key': this.apiKey
      }
    });

    const connection = {
      ws,
      phoneNumber,
      conversationId: null,
      timeout: null
    };

    ws.on('open', () => {
      console.log('WebSocket connected for:', phoneNumber);

      // Send initiation message
      const initiationMessage = {
        type: 'conversation_initiation_client_data'
      };

      ws.send(JSON.stringify(initiationMessage));
      console.log('Sent initiation message');
    });

    ws.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        console.log('Received from ElevenLabs:', response.type);

        // Handle different message types
        switch (response.type) {
          case 'conversation_initiation_metadata':
            connection.conversationId = response.conversation_initiation_metadata_event?.conversation_id;
            if (connection.conversationId) {
              console.log('Got conversation ID:', connection.conversationId);
            }
            break;

          case 'agent_chat_response_part':
          case 'agent_response':
            // Handle both streaming parts and complete responses
            const text = response.agent_response_event?.agent_response
              || response.agent_chat_response_part_event?.text
              || response.text;

            if (text) {
              console.log('Agent response chunk:', text.substring(0, 100));

              // Find the most recent pending response for this phone number
              let latestPending = null;
              let latestId = null;
              for (const [id, pending] of this.pendingResponses.entries()) {
                if (pending.phoneNumber === phoneNumber) {
                  if (!latestId || id > latestId) {
                    latestId = id;
                    latestPending = pending;
                  }
                }
              }

              if (latestPending) {
                latestPending.response += text;

                // For agent_response (complete), resolve immediately
                // For agent_chat_response_part (streaming), accumulate
                if (response.type === 'agent_response') {
                  this.pendingResponses.delete(latestId);
                  latestPending.resolve(latestPending.response);
                  console.log('Complete response received, length:', latestPending.response.length);
                }
              }
            }
            break;

          case 'agent_response_correction':
            const corrected = response.agent_response_correction_event?.corrected_agent_response;
            if (corrected) {
              console.log('Agent response corrected:', corrected.substring(0, 100));

              // Update the most recent pending response
              let latestPending = null;
              let latestId = null;
              for (const [id, pending] of this.pendingResponses.entries()) {
                if (pending.phoneNumber === phoneNumber) {
                  if (!latestId || id > latestId) {
                    latestId = id;
                    latestPending = pending;
                  }
                }
              }

              if (latestPending) {
                latestPending.response = corrected;
              }
            }
            break;

          case 'ping':
            // Respond to ping with pong
            ws.send(JSON.stringify({
              type: 'pong',
              event_id: response.ping_event?.event_id
            }));
            break;

          case 'interruption':
            console.log('Interruption event received');
            break;

          case 'audio':
            // Audio response (we're only using text, so ignore)
            break;

          default:
            console.log('Unknown message type:', response.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error for', phoneNumber, ':', error.message);

      // Reject all pending responses for this connection
      for (const [id, pending] of this.pendingResponses.entries()) {
        if (pending.phoneNumber === phoneNumber) {
          pending.reject(new Error(`WebSocket error: ${error.message}`));
          this.pendingResponses.delete(id);
        }
      }

      this.closeConnection(phoneNumber);
    });

    ws.on('close', () => {
      console.log('WebSocket closed for:', phoneNumber);

      // Clean up pending responses
      for (const [id, pending] of this.pendingResponses.entries()) {
        if (pending.phoneNumber === phoneNumber) {
          if (pending.response) {
            pending.resolve(pending.response);
          } else {
            pending.reject(new Error('WebSocket closed without response'));
          }
          this.pendingResponses.delete(id);
        }
      }

      this.connections.delete(phoneNumber);
    });

    return connection;
  }

  closeConnection(phoneNumber) {
    const connection = this.connections.get(phoneNumber);
    if (connection) {
      if (connection.timeout) {
        clearTimeout(connection.timeout);
      }
      if (connection.ws.readyState === WebSocket.OPEN) {
        console.log('Closing WebSocket connection for:', phoneNumber);
        connection.ws.close();
      }
      this.connections.delete(phoneNumber);
      console.log('✅ Context reset for:', phoneNumber);
    }
  }

  // Clear conversation session (useful for resetting context)
  clearSession(phoneNumber) {
    this.closeConnection(phoneNumber);
  }

  // Get active session count
  getActiveSessionCount() {
    return this.connections.size;
  }
}

module.exports = new ElevenLabsService();
