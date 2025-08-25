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
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down...');
    await transcriptServer.stop();
    client.destroy();
    process.exit(0);
});

// Start everything
async function start() {
    await startTranscriptServer();
    await client.login(process.env.BOT_TOKEN);
}

start().catch(console.error);