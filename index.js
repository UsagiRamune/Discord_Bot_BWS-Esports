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

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

client.login(process.env.BOT_TOKEN);