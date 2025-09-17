const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// WhatsApp API Configuration - Hardcoded (no .env needed)
const WHATSAPP_CONFIG = {
    baseURL: 'https://wp.privateinstance.com',
    sessionId: 'b8c7031a-b7e2-44c7-b626-6eded8475135',
    apiKey: '6db5e284-b9e6-4315-b60b-b66faa9ab3c5'
};

// OpenAI API Configuration - Hardcoded (no .env needed)
const OPENAI_CONFIG = {
    baseURL: 'https://longcat-openai-api.onrender.com',
    apiKey: 'pikachu@#25D'
};

// Available AI Models Configuration
const AI_MODELS = {
    // Chat/Text Models
    chat: [
        { id: 'longcat-chat', name: 'LongCat Chat', provider: 'longcat', type: 'chat' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', type: 'chat' },
        { id: 'gemini-2.5-deep', name: 'Gemini 2.5 Deep', provider: 'google', type: 'chat' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', type: 'chat' },
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai', type: 'chat' },
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', type: 'chat' },
        { id: 'gpt-5', name: 'GPT-5', provider: 'openai', type: 'chat' },
        { id: 'o1', name: 'OpenAI O1', provider: 'openai', type: 'reasoning' },
        { id: 'o3', name: 'OpenAI O3', provider: 'openai', type: 'reasoning' },
        { id: 'nano-banana', name: 'Nano Banana', provider: 'nano-banana', type: 'chat' }
    ],
    // Image Generation Models
    image: [
        { id: 'imagen-3', name: 'Imagen 3', provider: 'google', type: 'image' },
        { id: 'imagen-3.1', name: 'Imagen 3.1', provider: 'google', type: 'image' },
        { id: 'imagen-3.5', name: 'Imagen 3.5', provider: 'google', type: 'image' }
    ],
    // Video Generation Models
    video: [
        { id: 'veo3-image-to-video', name: 'Veo3 Image to Video', provider: 'veo3', type: 'video' }
    ]
};

// Bot Configuration
const BOT_CONFIG = {
    name: 'AhamAI',
    description: 'Your intelligent WhatsApp assistant powered by multiple AI models',
    defaultModel: 'gpt-4o', // Default model for conversations
    welcomeMessage: `🤖 Hello! I'm AhamAI, your intelligent WhatsApp assistant.\n\nI have access to multiple AI models:\n• GPT-4, GPT-4o, GPT-5\n• Gemini 2.5 Pro/Deep/Flash\n• OpenAI O1 & O3\n• Image generation with Imagen\n• And more!\n\nJust send me a message and I'll respond with AI-powered assistance!`,
    commands: {
        '/help': 'Show available commands and bot information',
        '/status': 'Check bot status',
        '/about': 'Learn more about AhamAI',
        '/models': 'List all available AI models',
        '/model [name]': 'Switch to a specific AI model',
        '/image [prompt]': 'Generate an image using AI'
    }
};

class AhamAIBot {
    constructor() {
        this.isRunning = false;
        this.messageQueue = [];
        this.processingMessage = false;
        this.userPreferences = new Map(); // Store user model preferences
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
                    model: BOT_CONFIG.defaultModel,
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

    // Get user's preferred model or default
    getUserModel(userId) {
        return this.userPreferences.get(userId) || BOT_CONFIG.defaultModel;
    }

    // Set user's preferred model
    setUserModel(userId, modelId) {
        const allModels = [...AI_MODELS.chat, ...AI_MODELS.image, ...AI_MODELS.video];
        const model = allModels.find(m => m.id === modelId);
        if (model) {
            this.userPreferences.set(userId, modelId);
            return model;
        }
        return null;
    }

    // Generate AI response
    async generateAIResponse(message, userInfo = {}) {
        try {
            const userId = userInfo.wid || 'default';
            const selectedModel = this.getUserModel(userId);
            
            const systemPrompt = `You are ${BOT_CONFIG.name}, an intelligent and helpful WhatsApp assistant with access to multiple AI models.

Current model: ${selectedModel}
            
Key traits:
- Friendly, professional, and concise
- Provide helpful and accurate information
- Use emojis appropriately to make conversations engaging
- Keep responses under 1000 characters when possible
- Be conversational and natural
- Mention your current AI model when relevant

User context:
- Platform: WhatsApp
- User Name: ${userInfo.pushname || 'User'}
- Current AI Model: ${selectedModel}
- Message: "${message}"

Respond helpfully and naturally.`;

            const response = await axios.post(
                `${OPENAI_CONFIG.baseURL}/v1/chat/completions`,
                {
                    model: selectedModel,
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

    // Generate image using AI
    async generateImage(prompt, userInfo = {}) {
        try {
            const response = await axios.post(
                `${OPENAI_CONFIG.baseURL}/v1/images/generations`,
                {
                    model: 'imagen-3.5',
                    prompt: prompt,
                    n: 1,
                    size: '1024x1024'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.data[0].url;
        } catch (error) {
            console.error('Image Generation Error:', error.message);
            return null;
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
                response = await this.handleCommand(body, userInfo, from);
            } else if (body.toLowerCase().startsWith('generate image:') || body.toLowerCase().startsWith('/image ')) {
                // Handle image generation
                const prompt = body.replace(/^(generate image:|\/image )/i, '').trim();
                if (prompt) {
                    const imageUrl = await this.generateImage(prompt, userInfo);
                    if (imageUrl) {
                        // Send image (this would require additional WhatsApp API implementation)
                        response = `🎨 I've generated an image for: "${prompt}"\n\n🖼️ Image URL: ${imageUrl}\n\n(Note: Direct image sending will be implemented in a future update)`;
                    } else {
                        response = `❌ Sorry, I couldn't generate an image for: "${prompt}". Please try a different prompt.`;
                    }
                } else {
                    response = `🎨 Please provide a prompt for image generation.\n\nExample: /image a beautiful sunset over mountains`;
                }
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
    async handleCommand(command, userInfo, userId) {
        const cmd = command.toLowerCase().split(' ')[0];
        const args = command.split(' ').slice(1);

        switch (cmd) {
            case '/help':
                return `🤖 *${BOT_CONFIG.name} - Help*\n\n*Available Commands:*\n${Object.entries(BOT_CONFIG.commands).map(([cmd, desc]) => `${cmd} - ${desc}`).join('\n')}\n\n*Current Model:* ${this.getUserModel(userId)}\n\n*How to use:*\nJust send me any message and I'll respond with AI assistance!`;
            
            case '/status':
                const status = await this.checkSessionStatus();
                const currentModel = this.getUserModel(userId);
                return `🔄 *Bot Status*\n\n✅ Bot: Running\n📱 WhatsApp: ${status.state}\n🤖 Current AI Model: ${currentModel}\n👥 Active Users: ${this.userPreferences.size}\n⏰ Last Activity: ${new Date().toLocaleString()}`;
            
            case '/about':
                return `🤖 *About ${BOT_CONFIG.name}*\n\n${BOT_CONFIG.description}\n\n*Available AI Models:*\n🧠 Chat: GPT-4, GPT-4o, GPT-5, Gemini 2.5, O1, O3\n🎨 Images: Imagen 3, 3.1, 3.5\n🎥 Video: Veo3\n\n*Features:*\n• Multiple AI model support\n• Real-time responses\n• Image generation\n• Model switching\n• 24/7 availability`;
            
            case '/models':
                let modelsList = `🤖 *Available AI Models*\n\n`;
                modelsList += `*💬 Chat Models:*\n${AI_MODELS.chat.map(m => `• ${m.name} (${m.id})`).join('\n')}\n\n`;
                modelsList += `*🎨 Image Models:*\n${AI_MODELS.image.map(m => `• ${m.name} (${m.id})`).join('\n')}\n\n`;
                modelsList += `*🎥 Video Models:*\n${AI_MODELS.video.map(m => `• ${m.name} (${m.id})`).join('\n')}\n\n`;
                modelsList += `*Current:* ${this.getUserModel(userId)}\n\nUse /model [id] to switch models`;
                return modelsList;
            
            case '/model':
                if (args.length === 0) {
                    return `🤖 Current model: *${this.getUserModel(userId)}*\n\nUse /model [id] to switch models\nUse /models to see all available models`;
                }
                
                const modelId = args[0];
                const model = this.setUserModel(userId, modelId);
                if (model) {
                    return `✅ Switched to *${model.name}* (${model.id})\n\n🏷️ Provider: ${model.provider}\n📝 Type: ${model.type}`;
                } else {
                    return `❌ Model "${modelId}" not found.\n\nUse /models to see available models`;
                }
            
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