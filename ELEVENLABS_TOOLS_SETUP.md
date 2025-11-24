# ElevenLabs Tools Configuration

This guide shows you how to configure client-side tools in your ElevenLabs Conversational AI agent so it can send SMS messages via Twilio.

## Overview

The bot now supports **client-side tools** that allow your ElevenLabs agent to:
- Send SMS messages to users
- Automatically use the user's WhatsApp number as the recipient
- Execute custom actions based on conversation

## How It Works

```
User: "Can you send me a text with your hours?"
  ↓
ElevenLabs Agent: Calls send_sms tool
  ↓
Your Server: Executes twilioTools.sendSMS()
  ↓
Twilio: Sends SMS to user's number
  ↓
Agent: "I've sent you a text message with our hours!"
```

---

## Step 1: Configure Tool in ElevenLabs Dashboard

1. **Go to your ElevenLabs agent:**
   - Visit: https://elevenlabs.io/app/conversational-ai
   - Click on your agent

2. **Add a Client-Side Tool:**
   - Scroll to "Tools" section
   - Click "Add Tool"
   - Select "Client Tool" (not Server Tool or Built-in Tool)

3. **Configure the Tool:**

   **Tool Name:** `send_sms`

   **Description:**
   ```
   Sends an SMS text message to the user. Use this when the user requests information via text message.
   ```

   **Parameters:**
   ```json
   {
     "type": "object",
     "properties": {
       "message": {
         "type": "string",
         "description": "The message content to send via SMS"
       }
     },
     "required": ["message"]
   }
   ```

   **When to use:**
   ```
   Use this tool when the user asks to:
   - "Send me a text"
   - "Can you text me..."
   - "SMS me the details"
   - "Send that information to my phone"
   ```

4. **Save the tool**

---

## Step 2: Update Agent Prompt (Optional but Recommended)

Add this to your agent's system prompt:

```
You have access to a send_sms tool that can send text messages to users.
When a user asks for information via text/SMS, use the send_sms tool with
the message they requested. The user's phone number is automatically used
as the recipient, so you don't need to ask for it.

Example:
User: "Can you text me your hours?"
You: [Use send_sms tool with message about hours]
Then say: "I've sent you a text message with our hours!"
```

---

## Step 3: Restart Your Server

```powershell
# Stop server (Ctrl+C)
# Start server
npm start
```

---

## Testing the Tool

### Test Conversation:

**You:** "Can you send me a text with your address?"

**Agent:** [Calls send_sms tool internally]

**Server logs:**
```
🔧 Tool call received: send_sms
📱 Sending SMS via Twilio: { to: 'whatsapp:+1234567890', message: 'Our address is...' }
✅ SMS sent successfully: SM123abc...
✅ Tool result sent: success
```

**Agent:** "I've sent you a text message with our address!"

**You receive:** SMS with the address on your phone 📱

---

## Supported Tool Names

The system recognizes these tool names:
- `send_sms`
- `send_text`
- `send_message`

(They all do the same thing - choose whichever you prefer)

---

## Tool Parameters

### Required:
- **message** (string): The text content to send

### Optional:
- **to** (string): Phone number (defaults to user's WhatsApp number)
- **phone_number** (string): Alternative parameter name for recipient
- **body** (string): Alternative parameter name for message
- **text** (string): Alternative parameter name for message

The system is flexible and will find the message content regardless of parameter naming.

---

## Advanced: Adding More Tools

You can add more client-side tools by:

1. **Create a new tool file** in `tools/` directory
2. **Add tool handler** in your tool file
3. **Update** `tools/twilioTools.js` `executeTool()` method to handle new tool
4. **Configure** the tool in ElevenLabs dashboard

### Example: Add a "schedule_appointment" tool

```javascript
// In tools/twilioTools.js
case 'schedule_appointment':
  const date = parameters.date;
  const time = parameters.time;
  // Your scheduling logic here
  return { success: true, appointmentId: '123' };
```

Then configure it in ElevenLabs with appropriate parameters.

---

## Troubleshooting

### Tool not being called:

**Check:**
- Tool is configured in ElevenLabs dashboard
- Tool name matches exactly (case-sensitive)
- Agent prompt mentions when to use the tool
- Required parameters are defined

**Test:**
- Ask explicitly: "Use the send_sms tool to text me hello"
- Check ElevenLabs agent logs

### SMS not sending:

**Check server logs for:**
```
🔧 Tool call received: send_sms
📱 Sending SMS via Twilio: ...
```

If you see:
- `❌ Error sending SMS` - Check Twilio credentials
- No tool call log - Tool not configured correctly in ElevenLabs
- `Unknown tool` - Tool name mismatch

### Wrong phone number:

The system automatically uses the user's WhatsApp number. If you need to send to a different number, the agent should ask the user for it, and you'll need to update the tool to accept that parameter.

---

## Example Tool Configurations

### 1. Send Business Hours
```json
{
  "name": "send_sms",
  "description": "Sends business hours via SMS",
  "parameters": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "description": "Message containing business hours"
      }
    },
    "required": ["message"]
  }
}
```

### 2. Send Location/Directions
```json
{
  "name": "send_location",
  "description": "Sends address and directions via SMS",
  "parameters": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "description": "Address and directions"
      }
    },
    "required": ["message"]
  }
}
```

---

## Security Notes

- ✅ User's phone number is automatically extracted from WhatsApp message
- ✅ No phone number is exposed in agent prompts or logs (beyond server logs)
- ✅ Tool can only send to the user who is chatting (unless explicitly configured otherwise)
- ✅ All SMS sending goes through your Twilio account with your credentials

---

## What's Next?

You can extend this system to add:
- ✅ Send appointment confirmations
- ✅ Send order status updates
- ✅ Send payment links
- ✅ Send booking confirmations
- ✅ Any custom action your business needs!

Just create the tool handler and configure it in ElevenLabs!
