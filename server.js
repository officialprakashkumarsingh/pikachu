const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// WhatsApp API Configuration
const WHATSAPP_CONFIG = {
    baseURL: process.env.WHATSAPP_API_URL || 'https://wp.privateinstance.com',
    sessionId: process.env.WHATSAPP_SESSION_ID,
    apiKey: process.env.WHATSAPP_API_KEY
};

// OpenAI API Configuration
const OPENAI_CONFIG = {
    baseURL: process.env.OPENAI_API_URL || 'https://longcat-openai-api.onrender.com',
    apiKey: process.env.OPENAI_API_KEY
};

// Bot Configuration
const BOT_CONFIG = {
    name: process.env.BOT_NAME || 'AhamAI',
    description: process.env.BOT_DESCRIPTION || 'Your intelligent WhatsApp assistant powered by AI',
    welcomeMessage: `🤖 Hello! I'm ${process.env.BOT_NAME || 'AhamAI'}, your intelligent WhatsApp assistant.\n\nI can help you with:\n• Answering questions\n• General conversations\n• Information lookup\n• Creative tasks\n\nJust send me a message and I'll respond with AI-powered assistance!`,
    commands: {
        '/help': 'Show available commands and bot information',
        '/status': 'Check bot status',
        '/about': 'Learn more about AhamAI'
    }
};

class AhamAIBot {
    constructor() {
        this.isRunning = false;
        this.messageQueue = [];
        this.processingMessage = false;
    }

    // Initialize the bot
    async initialize() {
        try {
            console.log('🚀 Initializing AhamAI WhatsApp Bot...');
            
            // Check WhatsApp session status
            const sessionStatus = await this.checkSessionStatus();
            if (sessionStatus.state !== 'READY') {
                throw new Error(`WhatsApp session not ready. Status: ${sessionStatus.state}`);
            }

            // Test AI API
            await this.testAIAPI();
            
            this.isRunning = true;
            console.log('✅ AhamAI Bot initialized successfully!');
            console.log(`📱 Connected WhatsApp Number: ${sessionStatus.info?.wid?.user}`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize bot:', error.message);
            return false;
        }
    }

    // Check WhatsApp session status
    async checkSessionStatus() {
        try {
            const response = await axios.get(
                `${WHATSAPP_CONFIG.baseURL}/sessions/${WHATSAPP_CONFIG.sessionId}`,
                {
                    headers: {
                        'X-API-KEY': WHATSAPP_CONFIG.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            throw new Error(`Failed to check session status: ${error.message}`);
        }
    }

    // Test AI API connectivity
    async testAIAPI() {
        try {
            const response = await axios.post(
                `${OPENAI_CONFIG.baseURL}/v1/chat/completions`,
                {
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: 'Test connection' }],
                    max_tokens: 10
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log('✅ AI API connection successful');
            return true;
        } catch (error) {
            throw new Error(`AI API test failed: ${error.message}`);
        }
    }

    // Generate AI response
    async generateAIResponse(message, userInfo = {}) {
        try {
            const systemPrompt = `You are ${BOT_CONFIG.name}, an intelligent and helpful WhatsApp assistant. 
            
Key traits:
- Friendly, professional, and concise
- Provide helpful and accurate information
- Use emojis appropriately to make conversations engaging
- Keep responses under 1000 characters when possible
- Be conversational and natural

User context:
- Platform: WhatsApp
- User Name: ${userInfo.pushname || 'User'}
- Message: "${message}"

Respond helpfully and naturally.`;

            const response = await axios.post(
                `${OPENAI_CONFIG.baseURL}/v1/chat/completions`,
                {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error('AI Response Error:', error.message);
            return `🤖 I'm having trouble generating a response right now. Please try again in a moment.\n\nError: ${error.message}`;
        }
    }

    // Send WhatsApp message
    async sendMessage(to, message) {
        try {
            const response = await axios.post(
                `${WHATSAPP_CONFIG.baseURL}/sessions/${WHATSAPP_CONFIG.sessionId}/messages/text`,
                {
                    to: to,
                    text: message
                },
                {
                    headers: {
                        'X-API-KEY': WHATSAPP_CONFIG.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log(`✅ Message sent to ${to}`);
            return response.data;
        } catch (error) {
            console.error(`❌ Failed to send message to ${to}:`, error.message);
            throw error;
        }
    }

    // Handle incoming messages
    async handleMessage(messageData) {
        if (this.processingMessage) {
            this.messageQueue.push(messageData);
            return;
        }

        this.processingMessage = true;

        try {
            const { from, body, fromMe, author } = messageData;
            
            // Ignore messages from the bot itself
            if (fromMe) {
                this.processingMessage = false;
                return;
            }

            console.log(`📨 Received message from ${from}: ${body}`);

            let response;
            const userInfo = messageData.contact || {};

            // Handle special commands
            if (body.startsWith('/')) {
                response = await this.handleCommand(body.toLowerCase(), userInfo);
            } else {
                // Generate AI response
                response = await this.generateAIResponse(body, userInfo);
            }

            // Send response
            await this.sendMessage(from, response);

        } catch (error) {
            console.error('Error handling message:', error.message);
            try {
                await this.sendMessage(messageData.from, '🤖 Sorry, I encountered an error processing your message. Please try again.');
            } catch (sendError) {
                console.error('Failed to send error message:', sendError.message);
            }
        }

        this.processingMessage = false;

        // Process queued messages
        if (this.messageQueue.length > 0) {
            const nextMessage = this.messageQueue.shift();
            setImmediate(() => this.handleMessage(nextMessage));
        }
    }

    // Handle bot commands
    async handleCommand(command, userInfo) {
        switch (command) {
            case '/help':
                return `🤖 *${BOT_CONFIG.name} - Help*\n\n*Available Commands:*\n${Object.entries(BOT_CONFIG.commands).map(([cmd, desc]) => `${cmd} - ${desc}`).join('\n')}\n\n*How to use:*\nJust send me any message and I'll respond with AI assistance! No special commands needed for regular conversations.`;
            
            case '/status':
                const status = await this.checkSessionStatus();
                return `🔄 *Bot Status*\n\n✅ Bot: Running\n📱 WhatsApp: ${status.state}\n🤖 AI API: Connected\n⏰ Last Activity: ${new Date().toLocaleString()}`;
            
            case '/about':
                return `🤖 *About ${BOT_CONFIG.name}*\n\n${BOT_CONFIG.description}\n\n*Features:*\n• AI-powered conversations\n• Real-time responses\n• Multi-language support\n• 24/7 availability\n\n*Powered by:*\n• Advanced AI technology\n• WhatsApp Web API\n• Secure cloud hosting`;
            
            default:
                return `❓ Unknown command: ${command}\n\nType /help to see available commands, or just send me a regular message for AI assistance!`;
        }
    }
}

// Initialize bot instance
const bot = new AhamAIBot();

// Routes
app.get('/', (req, res) => {
    res.json({
        success: true,
        bot: BOT_CONFIG.name,
        description: BOT_CONFIG.description,
        status: bot.isRunning ? 'running' : 'stopped',
        timestamp: new Date().toISOString(),
        endpoints: {
            webhook: '/webhook',
            status: '/status',
            health: '/health'
        }
    });
});

app.get('/health', async (req, res) => {
    try {
        const sessionStatus = await bot.checkSessionStatus();
        res.json({
            success: true,
            status: 'healthy',
            bot: {
                running: bot.isRunning,
                processing: bot.processingMessage,
                queueLength: bot.messageQueue.length
            },
            whatsapp: {
                session: sessionStatus.state,
                connected: sessionStatus.info?.connected || false
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/status', async (req, res) => {
    try {
        const sessionStatus = await bot.checkSessionStatus();
        res.json({
            success: true,
            bot: {
                name: BOT_CONFIG.name,
                running: bot.isRunning,
                messageQueue: bot.messageQueue.length
            },
            whatsapp: sessionStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Webhook endpoint for receiving messages
app.post('/webhook', async (req, res) => {
    try {
        const { event, data } = req.body;
        
        console.log('📥 Webhook received:', event);
        
        if (event === 'message' && data) {
            // Process message asynchronously
            setImmediate(() => bot.handleMessage(data));
        }
        
        res.json({ success: true, received: true });
    } catch (error) {
        console.error('Webhook error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 AhamAI WhatsApp Bot server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Status: http://localhost:${PORT}/status`);
    
    // Initialize bot
    const initialized = await bot.initialize();
    if (!initialized) {
        console.error('❌ Bot initialization failed. Check your configuration.');
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    bot.isRunning = false;
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    bot.isRunning = false;
    process.exit(0);
});

module.exports = app;