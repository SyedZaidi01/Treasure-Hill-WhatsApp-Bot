# Treasure Hill WhatsApp Bot

A WhatsApp chatbot that connects Twilio WhatsApp Business API with ElevenLabs conversational AI, featuring a comprehensive admin dashboard to monitor conversations and chat history.

## Features

- 🤖 **AI-Powered Conversations**: Integrates with ElevenLabs conversational AI agents
- 💬 **WhatsApp Integration**: Uses Twilio WhatsApp Business API for messaging
- 📊 **Admin Dashboard**: Beautiful web interface to view all conversations and chat history
- 💾 **Persistent Storage**: MongoDB database to store all conversation history
- 🔐 **Secure Admin Access**: Password-protected admin dashboard
- 📱 **Responsive Design**: Mobile-friendly admin interface

## Prerequisites

Before you begin, ensure you have the following:

- Node.js (v14 or higher)
- MongoDB (local or cloud instance like MongoDB Atlas)
- Twilio Account with WhatsApp enabled
- ElevenLabs API account with a conversational AI agent

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Treasure-Hill-WhatsApp-Bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your credentials:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/whatsapp-bot

   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

   # ElevenLabs Configuration
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id

   # Admin Dashboard Configuration
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=changeme
   SESSION_SECRET=your_session_secret_key_here
   ```

## Configuration Guide

### 1. MongoDB Setup

**Local MongoDB:**
- Install MongoDB from [mongodb.com](https://www.mongodb.com/try/download/community)
- Start MongoDB service
- Use connection string: `mongodb://localhost:27017/whatsapp-bot`

**MongoDB Atlas (Cloud):**
- Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Get your connection string and replace in `.env`
- Example: `mongodb+srv://username:password@cluster.mongodb.net/whatsapp-bot`

### 2. Twilio Setup

1. Sign up at [twilio.com](https://www.twilio.com)
2. Navigate to Console Dashboard
3. Get your **Account SID** and **Auth Token**
4. Enable WhatsApp in your Twilio console:
   - Go to Messaging > Try it out > Send a WhatsApp message
   - Follow the sandbox setup instructions
5. Set up webhook URL (see Deployment section)

### 3. ElevenLabs Setup

1. Sign up at [elevenlabs.io](https://elevenlabs.io)
2. Navigate to the Conversational AI section
3. Create a new conversational AI agent
4. Get your **API Key** from the profile settings
5. Copy your **Agent ID** from the agent settings

### 4. Twilio Webhook Configuration

Once your server is running and accessible via a public URL:

1. Go to Twilio Console > Messaging > Settings > WhatsApp Sandbox Settings
2. Set the **When a message comes in** webhook to:
   ```
   https://your-domain.com/webhook/whatsapp
   ```
3. Set HTTP method to **POST**
4. Save the configuration

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on the port specified in your `.env` file (default: 3000).

## Accessing the Admin Dashboard

1. Open your browser and navigate to:
   ```
   http://localhost:3000/admin
   ```

2. Log in with the credentials you set in `.env`:
   - Username: `admin` (or your custom username)
   - Password: `changeme` (or your custom password)

3. The dashboard shows:
   - Total conversations count
   - Active conversations
   - Total messages exchanged
   - List of all conversations with preview
   - Detailed view of each conversation with full chat history

## Deployment

### Using ngrok (for testing)

1. Install ngrok: [ngrok.com/download](https://ngrok.com/download)
2. Run your server locally:
   ```bash
   npm start
   ```
3. In another terminal, run:
   ```bash
   ngrok http 3000
   ```
4. Copy the HTTPS URL provided by ngrok
5. Update Twilio webhook with the ngrok URL:
   ```
   https://your-ngrok-url.ngrok.io/webhook/whatsapp
   ```

### Production Deployment

Deploy to platforms like:
- **Heroku**
- **Railway**
- **DigitalOcean**
- **AWS EC2**
- **Google Cloud Platform**

Make sure to:
1. Set all environment variables in your hosting platform
2. Use a production MongoDB instance (MongoDB Atlas recommended)
3. Configure your Twilio webhook to point to your production URL
4. Use strong passwords for admin access
5. Enable HTTPS for security

## Project Structure

```
Treasure-Hill-WhatsApp-Bot/
├── config/
│   └── database.js          # MongoDB connection configuration
├── controllers/
│   ├── adminController.js   # Admin dashboard logic
│   └── webhookController.js # Twilio webhook handlers
├── models/
│   └── Conversation.js      # MongoDB conversation schema
├── routes/
│   ├── admin.js            # Admin dashboard routes
│   └── webhook.js          # Twilio webhook routes
├── services/
│   └── elevenlabs.js       # ElevenLabs API integration
├── views/
│   ├── header.ejs          # Header template
│   ├── footer.ejs          # Footer template
│   ├── login.ejs           # Login page
│   ├── dashboard.ejs       # Main dashboard
│   └── conversation.ejs    # Conversation details page
├── public/
│   └── css/
│       └── style.css       # Stylesheet
├── .env.example            # Environment variables template
├── .gitignore             # Git ignore file
├── package.json           # Dependencies
├── server.js              # Main application file
└── README.md              # This file
```

## API Endpoints

### Webhook Endpoints
- `POST /webhook/whatsapp` - Receives incoming WhatsApp messages from Twilio
- `POST /webhook/status` - Receives message status updates from Twilio

### Admin Endpoints
- `GET /admin/login` - Admin login page
- `POST /admin/login` - Handle login
- `GET /admin/logout` - Logout
- `GET /admin/dashboard` - Main dashboard
- `GET /admin/conversation/:id` - View conversation details
- `POST /admin/conversation/:id/delete` - Delete a conversation

## How It Works

1. **User sends WhatsApp message** → Twilio receives it
2. **Twilio forwards message** → Your server's webhook endpoint (`/webhook/whatsapp`)
3. **Server processes message** → Sends to ElevenLabs conversational AI
4. **ElevenLabs responds** → AI-generated response
5. **Server saves conversation** → Stores in MongoDB
6. **Server sends response** → Back to user via Twilio WhatsApp
7. **Admin views dashboard** → See all conversations and chat history

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify network access (for MongoDB Atlas, whitelist your IP)

### Twilio Webhook Not Working
- Verify your server is publicly accessible
- Check webhook URL in Twilio console
- Ensure webhook URL uses HTTPS (required by Twilio)
- Check Twilio debugger for error logs

### ElevenLabs API Errors
- Verify API key is correct
- Check Agent ID is valid
- Ensure you have sufficient API credits

### Admin Dashboard Login Issues
- Double-check username and password in `.env`
- Clear browser cookies/cache
- Check server logs for errors

## Security Considerations

- Change default admin credentials immediately
- Use strong, unique passwords
- Use environment variables for all sensitive data
- Enable HTTPS in production
- Keep dependencies updated
- Implement rate limiting for production use

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Create an issue in the repository
- Check Twilio documentation: [twilio.com/docs](https://www.twilio.com/docs)
- Check ElevenLabs documentation: [elevenlabs.io/docs](https://elevenlabs.io/docs)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
