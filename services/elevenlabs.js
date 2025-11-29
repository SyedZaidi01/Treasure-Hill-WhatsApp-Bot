const WebSocket = require('ws');
const twilioTools = require('../tools/twilioTools');

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.agentId = process.env.ELEVENLABS_AGENT_ID;
    this.wsBaseUrl = 'wss://api.elevenlabs.io';
    this.connections = new Map();
    this.pendingResponses = new Map();
    this.connectionTimeout = 60 * 1000; // 1 minute
  }

  async sendMessage(phoneNumber, message) {
    return new Promise((resolve, reject) => {
      try {
        let wsConnection = this.connections.get(phoneNumber);

        if (!wsConnection || wsConnection.ws.readyState !== WebSocket.OPEN) {
          console.log('Creating new WebSocket connection for:', phoneNumber);
          wsConnection = this.createConnection(phoneNumber);
          this.connections.set(phoneNumber, wsConnection);
        } else {
          console.log('Reusing existing WebSocket connection for:', phoneNumber);
          if (wsConnection.timeout) {
            clearTimeout(wsConnection.timeout);
          }
        }

        const responseId = Date.now();
        this.pendingResponses.set(responseId, {
          resolve,
          reject,
          response: '',
          phoneNumber
        });

        const messageTimeout = setTimeout(() => {
          const pending = this.pendingResponses.get(responseId);
          if (pending) {
            this.pendingResponses.delete(responseId);
            reject(new Error('Response timeout from ElevenLabs'));
          }
        }, 30000);

        const sendUserMessage = () => {
          const userMessage = {
            type: 'user_message',
            text: message
          };

          wsConnection.ws.send(JSON.stringify(userMessage));
          console.log('Sent message to ElevenLabs:', message);

          wsConnection.timeout = setTimeout(() => {
            console.log('⏱️  1 minute inactivity - Closing WebSocket for:', phoneNumber);
            this.closeConnection(phoneNumber);
          }, this.connectionTimeout);
        };

        if (wsConnection.ws.readyState === WebSocket.OPEN) {
          sendUserMessage();
        } else {
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

        switch (response.type) {
          case 'conversation_initiation_metadata':
            connection.conversationId = response.conversation_initiation_metadata_event?.conversation_id;
            if (connection.conversationId) {
              console.log('Got conversation ID:', connection.conversationId);
            }
            break;

          case 'agent_chat_response_part':
          case 'agent_response':
            const text = response.agent_response_event?.agent_response
              || response.agent_chat_response_part_event?.text
              || response.text;

            if (text) {
              console.log('Agent response chunk:', text.substring(0, 100));

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

          case 'client_tool_call':
            const toolCall = response.client_tool_call;
            console.log('🔧 Tool call received:', toolCall.tool_name);

            twilioTools.executeTool(
              toolCall.tool_name,
              toolCall.parameters,
              phoneNumber
            ).then(result => {
              const toolResult = {
                type: 'client_tool_result',
                tool_call_id: toolCall.tool_call_id,
                result: JSON.stringify(result),
                is_error: !result.success
              };

              ws.send(JSON.stringify(toolResult));
              console.log('✅ Tool result sent:', result.success ? 'success' : 'failed');
            }).catch(error => {
              console.error('❌ Tool execution error:', error);
              ws.send(JSON.stringify({
                type: 'client_tool_result',
                tool_call_id: toolCall.tool_call_id,
                result: JSON.stringify({ success: false, error: error.message }),
                is_error: true
              }));
            });
            break;

          case 'ping':
            ws.send(JSON.stringify({
              type: 'pong',
              event_id: response.ping_event?.event_id
            }));
            break;

          case 'interruption':
            console.log('Interruption event received');
            break;

          case 'audio':
            // Audio response - we only use text
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

  clearSession(phoneNumber) {
    this.closeConnection(phoneNumber);
  }

  getActiveSessionCount() {
    return this.connections.size;
  }
}

module.exports = new ElevenLabsService();
