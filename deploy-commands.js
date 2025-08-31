require('dotenv').config(); // <--- บรรทัดที่หายไป

const { REST, Routes } = require('discord.js');
const config = require('./config/config');

const rest = new REST({ version: '10' }).setToken(config.bot.token);
const clientId = config.bot.clientId;

(async () => {
    try {
        console.log('Started deleting all global commands...');
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: [] }
        );
        console.log('Successfully deleted all global commands!');
    } catch (error) {
        console.error(error);
    }
})();