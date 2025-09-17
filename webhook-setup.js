const axios = require('axios');

// Configuration - Hardcoded (no .env needed)
const WHATSAPP_CONFIG = {
    baseURL: 'https://wp.privateinstance.com',
    sessionId: 'b8c7031a-b7e2-44c7-b626-6eded8475135',
    apiKey: '6db5e284-b9e6-4315-b60b-b66faa9ab3c5'
};

// Your deployed Render URL - UPDATE THIS AFTER DEPLOYMENT
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-service-name.onrender.com/webhook';

async function setupWebhook() {
    try {
        console.log('🔗 Setting up WhatsApp webhook...');
        console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);
        
        const response = await axios.post(
            `${WHATSAPP_CONFIG.baseURL}/sessions/${WHATSAPP_CONFIG.sessionId}/webhook`,
            {
                webhook: WEBHOOK_URL,
                events: ['message', 'message.any']
            },
            {
                headers: {
                    'X-API-KEY': WHATSAPP_CONFIG.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Webhook setup successful!');
        console.log('Response:', response.data);
        
    } catch (error) {
        console.error('❌ Webhook setup failed:', error.response?.data || error.message);
    }
}

async function checkWebhook() {
    try {
        console.log('🔍 Checking current webhook configuration...');
        
        const response = await axios.get(
            `${WHATSAPP_CONFIG.baseURL}/sessions/${WHATSAPP_CONFIG.sessionId}/webhook`,
            {
                headers: {
                    'X-API-KEY': WHATSAPP_CONFIG.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('📋 Current webhook configuration:');
        console.log(response.data);
        
    } catch (error) {
        console.error('❌ Failed to check webhook:', error.response?.data || error.message);
    }
}

// Main execution
async function main() {
    console.log('🤖 AhamAI Webhook Setup Tool\n');
    
    // Check current webhook
    await checkWebhook();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Setup new webhook
    await setupWebhook();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Verify setup
    await checkWebhook();
    
    console.log('\n🎉 Webhook setup complete!');
    console.log('📱 Your AhamAI WhatsApp bot should now receive messages.');
    console.log('\n💡 Test by sending a message to your WhatsApp number.');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { setupWebhook, checkWebhook };