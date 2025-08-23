const config = require('../config/config');

module.exports = (client) => {
    // Bot ready event
    client.once('ready', () => {
        console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
        console.log(`👥 Bot is in ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} servers`);
        
        // Set bot activity
        client.user.setActivity('Thai Esports League | !setup-tickets', { type: 'WATCHING' });
    });

    // Guild join event
    client.on('guildCreate', (guild) => {
        console.log(`➕ Joined new guild: ${guild.name} (${guild.id})`);
    });

    // Guild leave event
    client.on('guildDelete', (guild) => {
        console.log(`➖ Left guild: ${guild.name} (${guild.id})`);
    });

    // Error handling
    client.on('error', (error) => {
        console.error('Discord client error:', error);
    });

    client.on('warn', (warning) => {
        console.warn('Discord client warning:', warning);
    });

    // Rate limit handling
    client.rest.on('rateLimited', (info) => {
        console.warn('Rate limited:', info);
    });
};