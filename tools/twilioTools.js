const twilio = require('twilio');

class TwilioTools {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  }

  /**
   * Send SMS to a phone number
   * This is called by the ElevenLabs agent when user requests to send a text
   */
  async sendSMS(toNumber, messageBody) {
    try {
      console.log('📱 Sending SMS via Twilio:', {
        to: toNumber,
        message: messageBody.substring(0, 50) + '...'
      });

      const message = await this.client.messages.create({
        body: messageBody,
        from: this.fromNumber,
        to: toNumber
      });

      console.log('✅ SMS sent successfully:', message.sid);

      return {
        success: true,
        messageSid: message.sid,
        status: message.status
      };
    } catch (error) {
      console.error('❌ Error sending SMS:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute a tool call from ElevenLabs agent
   */
  async executeTool(toolName, parameters, userPhoneNumber) {
    console.log('🔧 Executing tool:', toolName, 'for user:', userPhoneNumber);

    switch (toolName) {
      case 'send_sms':
      case 'send_text':
      case 'send_message':
        // Use the user's phone number as the "to" number
        const toNumber = parameters.to || parameters.phone_number || userPhoneNumber;
        const message = parameters.message || parameters.body || parameters.text;

        if (!message) {
          return {
            success: false,
            error: 'Message body is required'
          };
        }

        return await this.sendSMS(toNumber, message);

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`
        };
    }
  }
}

module.exports = new TwilioTools();
