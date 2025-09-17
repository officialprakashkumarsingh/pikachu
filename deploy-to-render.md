# 🚀 One-Click Deploy AhamAI WhatsApp Bot to Render

## Quick Deploy Button

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR_USERNAME/ahamai-whatsapp-bot)

## Manual Deployment Steps

### 1. Prerequisites
- GitHub account
- Render account (free tier available)
- Your WhatsApp Web API credentials

### 2. Deploy to Render

1. **Fork/Upload this repository to GitHub**
2. **Go to [Render Dashboard](https://dashboard.render.com/)**
3. **Click "New +" → "Web Service"**
4. **Connect your GitHub repository**
5. **Configure the service:**
   - **Name:** `ahamai-whatsapp-bot`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free` (or upgrade as needed)

### 3. Set Environment Variables

In the Render dashboard, add these environment variables:

```
WHATSAPP_API_URL=https://wp.privateinstance.com
WHATSAPP_SESSION_ID=b8c7031a-b7e2-44c7-b626-6eded8475135
WHATSAPP_API_KEY=6db5e284-b9e6-4315-b60b-b66faa9ab3c5
OPENAI_API_URL=https://longcat-openai-api.onrender.com
OPENAI_API_KEY=pikachu@#25D
BOT_NAME=AhamAI
BOT_DESCRIPTION=Your intelligent WhatsApp assistant powered by AI
NODE_ENV=production
```

### 4. Deploy

1. **Click "Create Web Service"**
2. **Wait for deployment to complete** (usually 2-3 minutes)
3. **Your bot will be available at:** `https://your-service-name.onrender.com`

### 5. Set Up WhatsApp Webhook

Once deployed, configure the webhook in your WhatsApp API:

```bash
curl -X POST "https://wp.privateinstance.com/sessions/b8c7031a-b7e2-44c7-b626-6eded8475135/webhook" \
  -H "X-API-KEY: 6db5e284-b9e6-4315-b60b-b66faa9ab3c5" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": "https://your-service-name.onrender.com/webhook",
    "events": ["message"]
  }'
```

### 6. Test Your Bot

1. **Check health:** `https://your-service-name.onrender.com/health`
2. **Check status:** `https://your-service-name.onrender.com/status`
3. **Send a WhatsApp message** to your connected number

## 🎉 Your AhamAI WhatsApp Bot is Live!

### Available Endpoints

- **Health Check:** `/health` - Monitor bot health
- **Status:** `/status` - Check bot and WhatsApp status
- **Webhook:** `/webhook` - Receives WhatsApp messages
- **Root:** `/` - Bot information

### Bot Commands

- `/help` - Show available commands
- `/status` - Check bot status
- `/about` - Learn about AhamAI

### Features

✅ **AI-Powered Responses** - Uses advanced AI for natural conversations
✅ **Real-time Processing** - Instant message handling
✅ **Command System** - Built-in commands for bot management
✅ **Health Monitoring** - Built-in health checks and status monitoring
✅ **Error Handling** - Robust error handling and recovery
✅ **Queue Management** - Message queue to handle multiple conversations
✅ **Secure** - Environment-based configuration

## Troubleshooting

### Common Issues

1. **Bot not responding:**
   - Check `/health` endpoint
   - Verify WhatsApp session is READY
   - Check environment variables

2. **AI responses failing:**
   - Verify OpenAI API key is correct
   - Check API endpoint availability

3. **Webhook not working:**
   - Ensure webhook URL is set correctly
   - Check Render service is running

### Support

For issues or questions:
1. Check the logs in Render dashboard
2. Test endpoints manually
3. Verify all environment variables are set

## 🔧 Advanced Configuration

### Custom AI Prompts
Edit the `systemPrompt` in `server.js` to customize AI behavior.

### Add More Commands
Extend the `handleCommand` method to add new bot commands.

### Scaling
Upgrade your Render plan for higher performance and uptime.

---

**🤖 AhamAI - Your Intelligent WhatsApp Assistant**