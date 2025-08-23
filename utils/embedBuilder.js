const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = (client) => {
    // Message create event for commands
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        
        console.log(`Message received: "${message.content}" from ${message.author.tag}`);
        
        const prefix = config.bot.prefix;
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Setup tickets command
        if (command === 'setup-tickets') {
            console.log('Setup tickets command detected!');
            
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ คุณต้องมีสิทธิ์ Administrator เพื่อใช้คำสั่งนี้');
            }

            // Create simple embed
            const embed = new EmbedBuilder()
                .setTitle('🎫 ระบบติดต่อทีมงาน - Thai Esports League')
                .setDescription('กรุณาเลือกหมวดหมู่ที่ต้องการติดต่อจากเมนูด้านล่าง\nทีมงานจะตอบกลับโดยเร็วที่สุด!')
                .setColor('#00ff00')
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_category_select')
                .setPlaceholder('🎯 เลือกหมวดหมู่ที่ต้องการติดต่อ')
                .addOptions(
                    Object.entries(config.ticketCategories).map(([key, category]) => ({
                        label: category.label,
                        description: category.description,
                        value: key,
                        emoji: category.emoji
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await message.channel.send({
                embeds: [embed],
                components: [row]
            });

            console.log('Ticket panel sent successfully!');
            await message.delete().catch(() => {});
        }
        
        // Test command
        if (command === 'test') {
            await message.reply('✅ Commands are working!');
        }
    });

    // Handle dropdown selection
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isStringSelectMenu()) return;

        if (interaction.customId === 'ticket_category_select') {
            console.log('Dropdown selection detected!');
            
            const selectedCategory = interaction.values[0];
            const category = config.ticketCategories[selectedCategory];
            
            await interaction.reply({
                content: `✅ You selected: ${category.label}! (This is just a test - full ticket creation will be added next)`,
                ephemeral: true
            });
        }
    });
};