require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

console.log('Starting bot...');
console.log('Node.js version:', process.version);
console.log('Discord.js version:', require('discord.js').version);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    
    if (message.content === '!ping') {
        message.reply('Pong! Bot is working! 🏓');
    }
});

client.on('error', (error) => {
    console.error('Bot error:', error);
});

// Check if token exists
if (!process.env.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN not found in .env file!');
    console.log('Make sure your .env file contains:');
    console.log('BOT_TOKEN=your_actual_bot_token_here');
    process.exit(1);
}

client.login(process.env.BOT_TOKEN).catch(error => {
    console.error('❌ Failed to login:', error.message);
    if (error.message.includes('TOKEN_INVALID')) {
        console.log('Your bot token is invalid. Please check your .env file.');
    }
});