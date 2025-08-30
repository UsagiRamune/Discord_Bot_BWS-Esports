require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// Check if handlers exist before requiring
let ticketHandler, eventHandler;
try {
    ticketHandler = require('./handlers/ticketHandler');
    eventHandler = require('./handlers/eventHandler');
} catch (error) {
    console.error('Error loading handlers:', error.message);
    console.log('Make sure you have created the handlers folder with ticketHandler.js and eventHandler.js');
    process.exit(1);
}

// Initialize transcript server (singleton instance)
const transcriptServer = require('./utils/transcriptServer');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Initialize event handlers
eventHandler(client);
ticketHandler(client);

// Start transcript server
async function startTranscriptServer() {
    try {
        await transcriptServer.start();
        console.log('✅ Transcript server started successfully');
    } catch (error) {
        console.error('❌ Failed to start transcript server:', error);
        console.log('⚠️  Bot will continue without transcript web server');
    }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit immediately, let graceful shutdown handle it
});

// Graceful shutdown
async function gracefulShutdown(signal) {
    console.log(`🛑 Received ${signal}, shutting down gracefully...`);
    
    try {
        console.log('📄 Stopping transcript server...');
        await transcriptServer.stop();
        
        console.log('🤖 Destroying Discord client...');
        if (client) {
            client.destroy();
        }
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
}

// Handle various shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle specific Windows signals
if (process.platform === 'win32') {
    require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    }).on('SIGINT', () => {
        process.emit('SIGINT');
    });
}

// Start everything
async function start() {
    // Validate required environment variables
    const requiredEnvVars = ['BOT_TOKEN'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
        console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
        console.log('Please set the following environment variables:');
        console.log('BOT_TOKEN - Your Discord bot token');
        console.log('GUILD_ID - Your Discord server ID (optional)');
        console.log('STAFF_ROLE_ID - Staff role ID (optional)');
        console.log('TICKET_CATEGORY_ID - Category for ticket channels (optional)');
        console.log('LOG_CHANNEL_ID - Log channel ID (optional)');
        console.log('For Firebase integration, also set:');
        console.log('FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, etc.');
        process.exit(1);
    }

    console.log('🚀 Starting Thai Esports League Ticket Bot...');
    console.log('📋 Environment:', process.env.NODE_ENV || 'development');
    
    // Start transcript server first
    await startTranscriptServer();
    
    try {
        console.log('🤖 Connecting to Discord...');
        await client.login(process.env.BOT_TOKEN);
    } catch (error) {
        console.error('❌ Failed to login to Discord:', error.message);
        
        if (error.message.includes('TOKEN_INVALID')) {
            console.log('Please check your BOT_TOKEN environment variable');
        }
        
        process.exit(1);
    }
}

// Initialize and start the bot
start().catch(error => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
});