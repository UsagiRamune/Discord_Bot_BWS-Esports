const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config = require('../config/config');
const ticketManager = require('../utils/ticketManager');
const scheduleManager = require('../utils/scheduleManager');
const ticketCounter = require('../utils/ticketCounter');
const firebase = require('../utils/firebase');

module.exports = (client) => {
    // === Handle prefix commands ===
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        // Check if message is in a paused ticket channel
        const ticket = ticketManager.getTicketByChannelId(message.channel.id);
        if (ticket && ticket.isPaused && message.author.id === ticket.userId) {
            await message.delete().catch(() => {});
            const warningMsg = await message.channel.send({
                content: `⏸️ ${message.author} ตั๋วนี้ถูกหยุดชั่วคราวโดยทีมงาน คุณไม่สามารถส่งข้อความได้ในขณะนี้`
            });
            setTimeout(async () => { await warningMsg.delete().catch(() => {}); }, 5000);
            return;
        }

        console.log(`Message received: "${message.content}" from ${message.author.tag}`);
        
        const prefix = config.bot.prefix;
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Handle !setup-tickets command
        if (command === 'setup-tickets') {
            console.log('Setup tickets command detected!');
            
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ คุณต้องมีสิทธิ์ Administrator เพื่อใช้คำสั่งนี้');
            }

            // const bannerImage = 'BWS ESPORTS suport tICKET.jpg'; // ลบบรรทัดนี้
            // const file = new AttachmentBuilder(`./additional_files/${bannerImage}`, { name: bannerImage }); // และบรรทัดนี้

            const embed = new EmbedBuilder()
                .setTitle('🎫 ระบบติดต่อทีมงาน - BWS Esports')
                .setDescription(
                    `## ช่องทางช่วยเหลือ Support ผู้เล่น\n\n` +
                    `• เพื่อความรวดเร็วในการช่วยเหลือ กรุณาแจ้งให้ตรงตามหมวดหมู่ที่กำหนด และเตรียมข้อมูลให้ครบถ้วน\n` +
                    `• หากต้องการแจ้งข้อมูลเฉพาะ เช่น รายงานพฤติกรรม หรือ แจ้งเกี่ยวกับเวลานัดการแข่งขัน โปรดระบุภาพหลักฐานแนบมาด้วยทุกครั้ง\n\n` +
                    `กดปุ่ม 'เลือกหมวดหมู่ที่ต้องการติดต่อ' เพื่อสร้าง Ticket`
                )
                .setColor(config.colors.primary)
                .setImage('https://i.postimg.cc/BZHGmxWQ/BWS-ESPORTS-suport-t-ICKET.png') // ใส่ URL รูปภาพตรงนี้เลย
                .setFooter({
                    text: 'BWS Esports - Support • เวลา',
                    iconURL: message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL()
                })
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
        
        // Other prefix commands...
        if (command === 'test') {
            await message.reply('✅ Commands are working!');
        }

        if (command === 'ticket-stats') {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return message.reply('❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้');
            }
            const stats = ticketManager.getStats();
            const embed = new EmbedBuilder()
                .setTitle('📊 สถิติระบบติดต่อ')
                .setColor(config.colors.primary)
                .addFields(
                    { name: '🎫 ตั๋วที่เปิดอยู่', value: stats.activeTickets.toString(), inline: true },
                    { name: '📋 แยกตามหมวดหมู่', value: Object.entries(stats.categoriesBreakdown).map(([cat, count]) => `${config.ticketCategories[cat]?.emoji || '📄'} ${config.ticketCategories[cat]?.label || cat}: ${count}`).join('\n') || 'ไม่มีตั๋วเปิดอยู่' }
                )
                .setTimestamp();
            await message.reply({ embeds: [embed] });
        }
        
        if (command === 'ticket-counters') {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return message.reply('❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้');
            }
            const stats = await ticketCounter.getStats();
            const embed = new EmbedBuilder()
                .setTitle('🔢 สถิติหมายเลขตั๋ว')
                .setColor(config.colors.primary)
                .setDescription('สถิติการใช้หมายเลขตั๋วแยกตามหมวดหมู่')
                .setTimestamp();
            for (const [category, data] of Object.entries(stats)) {
                const categoryInfo = config.ticketCategories[category];
                embed.addFields({
                    name: `${categoryInfo?.emoji || '📄'} ${categoryInfo?.label || category}`,
                    value: `**สร้างแล้ว:** ${data.total} ตั๋ว\n**หมายเลขปัจจุบัน:** ${data.current}\n**หมายเลขถัดไป:** ${data.next}`,
                    inline: true
                });
            }
            await message.reply({ embeds: [embed] });
        }
        
        if (command === 'reset-counters') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ คุณต้องมีสิทธิ์ Administrator เพื่อใช้คำสั่งนี้');
            }
            await ticketCounter.resetCounters();
            await message.reply('🔄 รีเซ็ตหมายเลขตั๋วทั้งหมดเรียบร้อยแล้ว!');
        }

        if (command === 'force-close') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ คุณต้องมีสิทธิ์ Administrator เพื่อใช้คำสั่งนี้');
            }
            const ticket = ticketManager.getTicketByChannelId(message.channel.id);
            if (!ticket) {
                return message.reply('❌ คำสั่งนี้ใช้ได้เฉพาะในช่องตั๋วเท่านั้น');
            }
            await message.reply('🔒 กำลังปิดตั๋วแบบบังคับ...');
            const transcriptResult = await ticketManager.generateTranscript(message.channel);
            await ticketManager.closeTicket(message.channel.id, message.author);
            console.log(`🔨 Force closed ticket: ${message.channel.name} by ${message.author.tag}`);
            setTimeout(async () => { try { await message.channel.delete('Force closed by admin'); } catch (error) { console.error('Error deleting channel:', error); } }, 5000);
        }

        if (command === 'firebase-status') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ คุณต้องมีสิทธิ์ Administrator เพื่อใช้คำสั่งนี้');
            }
            const isConnected = firebase.isInitialized();
            const embed = new EmbedBuilder()
                .setTitle('🔥 Firebase Status')
                .setColor(isConnected ? config.colors.success : config.colors.error)
                .addFields({ name: 'Connection Status', value: isConnected ? '✅ Connected' : '❌ Not Connected', inline: true });
            if (isConnected) {
                try {
                    const statsResult = await firebase.getTicketStats();
                    if (statsResult.success) {
                        embed.addFields({
                            name: 'Database Stats',
                            value: `Total Tickets: ${statsResult.stats.total}\nOpen: ${statsResult.stats.open || 0}\nClosed: ${statsResult.stats.closed || 0}`,
                            inline: true
                        });
                    }
                } catch (error) {
                    embed.addFields({ name: 'Database Stats', value: 'Error retrieving stats', inline: true });
                }
            }
            await message.reply({ embeds: [embed] });
        }
    });

    // === Handle dropdown selection and button interactions ===
    client.on('interactionCreate', async (interaction) => {
        // Handle dropdown selection
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'ticket_category_select') {
                console.log('Dropdown selection detected!');

                if (!scheduleManager.isInOperatingHours()) {
                    const operatingMsg = scheduleManager.getOperatingHoursMessage();
                    const embed = new EmbedBuilder().setTitle(operatingMsg.title).setDescription(operatingMsg.description).setColor(operatingMsg.color).addFields(operatingMsg.fields).setTimestamp();
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                const selectedCategory = interaction.values[0];
                const category = config.ticketCategories[selectedCategory];
                const user = interaction.user;
                const guild = interaction.guild;

                if (ticketManager.hasActiveTicket(user.id)) {
                    const activeTicket = ticketManager.getActiveTicket(user.id);
                    const channel = guild.channels.cache.get(activeTicket.channelId);
                    return interaction.reply({
                        content: `❌ คุณมีตั๋วที่เปิดอยู่แล้ว! กรุณาไปที่ ${channel ? channel.toString() : 'ห้องแชทตั๋วของคุณ'}`,
                        ephemeral: true
                    });
                }
                
                if (!ticketManager.canCreateTicket(user.id)) {
                    return interaction.reply({
                        content: `❌ คุณถึงขีดจำกัดการสร้างตั๋วแล้ว (สูงสุด ${config.bot.maxTicketsPerUser} ตั๋วต่อคน)`,
                        ephemeral: true
                    });
                }

                await interaction.deferReply({ ephemeral: true });

                try {
                    const result = await ticketManager.createTicketChannel(guild, user, selectedCategory);
                    
                    if (!result.success) {
                        return interaction.editReply({ content: `❌ เกิดข้อผิดพลาดในการสร้างตั๋ว: ${result.error}` });
                    }

                    const { channel, data } = result;
                    console.log(`Ticket created: ${channel.name} for ${user.tag}`);

                    // --- Start of welcome message logic from user's code ---
                    let dynamicDescription = '';
                    switch (selectedCategory) {
                        case 'member_edit':
                            dynamicDescription =
                                `สวัสดี ${user}! 👋เราได้ทำการติดต่อ <@&${config.server.staffRoleId}> ให้คุณแล้ว พวกเขาจะเข้ามาช่วยเหลือคุณในเร็ว ๆ นี้โปรดรอสักพักนึง โปรดแจ้งรายละเอียดเรื่องที่จะแจ้งของคุณให้กับล่วงหน้าก่อน Staff ของเราจะเข้ามาช่วยเหลือคุณ เพื่อเพิ่มความรวดเร็วในการดำเนินเรื่อง\n\n` +
                                `**โปรดระบุเนื้อหาของเรื่องที่แจ้งดังนี้**\n` +
                                `- ชื่อสมาชิกที่ต้องการเปลี่ยน\n` +
                                `- Game name\n` +
                                `- Game UID\n\n` +
                                `ขอบคุณที่ติดต่อทีมงาน BWS Esports\n` +
                                `โปรดอธิบายปัญหาหรือคำถามของคุณได้เลย`;
                            break;
                        case 'schedule_report':
                            dynamicDescription =
                                `สวัสดี ${user}! 👋เราได้ทำการติดต่อ <@&${config.server.staffRoleId}> ให้คุณแล้ว พวกเขาจะเข้ามาช่วยเหลือคุณในเร็ว ๆ นี้โปรดรอสักพักนึง โปรดแจ้งรายละเอียดเรื่องที่จะแจ้งของคุณให้กับล่วงหน้าก่อน Staff ของเราจะเข้ามาช่วยเหลือคุณ เพื่อเพิ่มความรวดเร็วในการดำเนินเรื่อง\n\n` +
                                `**โปรดระบุเนื้อหาของเรื่องที่แจ้งดังนี้**\n` +
                                `- ชื่อทีมแข่งของทั้งสองทีม\n` +
                                `- เวลาในที่กำหนดแล้ว\n` +
                                `- รูปภาพหลักฐานการพูดคุยและตกลงกันของทั้งสองทีม\n\n` +
                                `ขอบคุณที่ติดต่อทีมงาน BWS Esports\n` +
                                `โปรดอธิบายปัญหาหรือคำถามของคุณได้เลย`;
                            break;
                        case 'behavior_report':
                            dynamicDescription =
                                `สวัสดี ${user}! 👋เราได้ทำการติดต่อ <@&${config.server.staffRoleId}> ให้คุณแล้ว พวกเขาจะเข้ามาช่วยเหลือคุณในเร็ว ๆ นี้โปรดรอสักพักนึง โปรดแจ้งรายละเอียดเรื่องที่จะแจ้งของคุณให้กับล่วงหน้าก่อน Staff ของเราจะเข้ามาช่วยเหลือคุณ เพื่อเพิ่มความรวดเร็วในการดำเนินเรื่อง\n\n` +
                                `**โปรดระบุเนื้อหาของเรื่องที่แจ้งดังนี้**\n` +
                                `- ชื่อทีมคู่กรณี\n` +
                                `- ชื่อของนักแข่งคู่กรณี\n` +
                                `- หลักฐานการกระทำผิด (รูปภาพ, วิดีโอภาพ หรือไฟล์เสียง)\n\n` +
                                `ขอบคุณที่ติดต่อทีมงาน BWS Esports\n` +
                                `โปรดอธิบายปัญหาหรือคำถามของคุณได้เลย`;
                            break;
                        case 'technical_issue':
                        case 'general_contact':
                            dynamicDescription =
                                `สวัสดี ${user}! 👋เราได้ทำการติดต่อ <@&${config.server.staffRoleId}> ให้คุณแล้ว พวกเขาจะเข้ามาช่วยเหลือคุณในเร็ว ๆ นี้โปรดรอสักพักนึง โปรดแจ้งรายละเอียดเรื่องที่จะแจ้งของคุณให้กับล่วงหน้าก่อน Staff ของเราจะเข้ามาช่วยเหลือคุณ เพื่อเพิ่มความรวดเร็วในการดำเนินเรื่อง\n\n` +
                                `**โปรดระบุเนื้อหาของเรื่องที่แจ้งดังนี้**\n` +
                                `- รายชื่อทีมที่กำลังแข่ง (ทั้งทีมผู้แจ้งและทีมฝั่งตรงข้าม)\n` +
                                `- เวลาที่เกิดปัญหา\n` +
                                `- หลักฐานปัญหา (รูปภาพ หรือ วิดีโอภาพ)\n\n` +
                                `ขอบคุณที่ติดต่อทีมงาน BWS Esports\n` +
                                `โปรดอธิบายปัญหาหรือคำถามของคุณได้เลย`;
                            break;
                        default:
                            dynamicDescription =
                                `สวัสดี ${user}! 👋\n\nขอบคุณที่ติดต่อทีมงาน BWS Esports\nโปรดอธิบายปัญหาหรือคำถามของคุณได้เลย`;
                    }
                    
                    const welcomeEmbed = new EmbedBuilder()
                        .setTitle(`${category.emoji} ${category.label}`)
                        .setDescription(dynamicDescription)
                        .setColor(category.color)
                        .addFields(
                            { name: '🎫 หมายเลขตั๋ว', value: `#${data.ticketNumber}`, inline: true },
                            { name: '📂 หมวดหมู่', value: category.label, inline: true },
                            { name: '🕐 เวลาที่สร้าง', value: `<t:${Math.floor(data.createdAt / 1000)}:F>`, inline: true },
                            { name: '👤 ผู้สร้าง', value: user.toString(), inline: true }
                        )
                        .setFooter({ text: `Ticket #${data.ticketNumber} | สร้างเมื่อ` })
                        .setTimestamp();
                    // --- End of welcome message logic from user's code ---

                    // Create close and pause buttons
                    const closeButton = new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 ปิดตั๋ว').setStyle(ButtonStyle.Danger);
                    const pauseButton = new ButtonBuilder().setCustomId('pause_ticket').setLabel('⏸️ หยุดชั่วคราว').setStyle(ButtonStyle.Secondary);
                    const buttonRow = new ActionRowBuilder().addComponents(pauseButton, closeButton);

                    await channel.send({ embeds: [welcomeEmbed], components: [buttonRow] });
                    await interaction.editReply({ content: `✅ สร้างตั๋วเรียบร้อยแล้ว! กรุณาไปที่ ${channel} เพื่อดำเนินการต่อ` });
                    console.log(`✅ Ticket created successfully: ${channel.name} (${channel.id}) for ${user.tag}`);
                    
                    if (config.server.logChannelId) {
                        const logChannel = guild.channels.cache.get(config.server.logChannelId);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle('📝 ตั๋วใหม่ถูกสร้าง')
                                .setColor(config.colors.success)
                                .addFields(
                                    { name: '🎫 หมายเลข', value: `#${data.ticketNumber}`, inline: true },
                                    { name: '👤 ผู้สร้าง', value: `${user.tag} (${user.id})`, inline: true },
                                    { name: '📂 หมวดหมู่', value: category.label, inline: true },
                                    { name: '🏷️ ห้อง', value: channel.toString(), inline: true }
                                )
                                .setTimestamp();
                            await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                        }
                    }
                } catch (error) {
                    console.error('Error in ticket creation process:', error);
                    await interaction.editReply({ content: `❌ เกิดข้อผิดพลาดในการสร้างตั๋ว กรุณาลองอีกครั้งหรือติดต่อผู้ดูแลระบบ` });
                }
            }
        }
        
        // Handle button interactions
        if (!interaction.isButton()) return;
        const channel = interaction.channel;
        const ticket = ticketManager.getTicketByChannelId(channel.id);
        if (!ticket) { return interaction.reply({ content: '❌ ไม่พบข้อมูลตั๋วนี้ในระบบ', ephemeral: true }); }
        
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) || (config.server.staffRoleId && interaction.member.roles.cache.has(config.server.staffRoleId));
        const isTicketOwner = interaction.user.id === ticket.userId;

        if (interaction.customId === 'pause_ticket') {
            if (!isStaff) { return interaction.reply({ content: '❌ เฉพาะทีมงานเท่านั้นที่สามารถหยุดตั๋วชั่วคราวได้', ephemeral: true }); }
            if (ticket.isPaused) { return interaction.reply({ content: '⚠️ ตั๋วนี้ถูกหยุดชั่วคราวอยู่แล้ว', ephemeral: true }); }
            const pauseResult = await ticketManager.pauseTicket(channel.id, interaction.user);
            if (pauseResult.success) {
                await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false });
                const unpauseButton = new ButtonBuilder().setCustomId('unpause_ticket').setLabel('▶️ เริ่มใหม่').setStyle(ButtonStyle.Success);
                const closeButton = new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 ปิดตั๋ว').setStyle(ButtonStyle.Danger);
                const buttonRow = new ActionRowBuilder().addComponents(unpauseButton, closeButton);
                const pauseEmbed = new EmbedBuilder().setTitle('⏸️ ตั๋วถูกหยุดชั่วคราว').setDescription(`ตั๋วนี้ถูกหยุดโดย ${interaction.user}\n\nผู้ใช้ไม่สามารถส่งข้อความได้จนกว่าทีมงานจะเริ่มใหม่`).setColor(config.colors.warning).setTimestamp();
                await interaction.reply({ embeds: [pauseEmbed], components: [buttonRow] });
                console.log(`⏸️ Ticket paused: ${channel.name} by ${interaction.user.tag}`);
            } else { await interaction.reply({ content: `❌ เกิดข้อผิดพลาดในการหยุดตั๋ว: ${pauseResult.error}`, ephemeral: true }); }
        } else if (interaction.customId === 'unpause_ticket') {
            if (!isStaff) { return interaction.reply({ content: '❌ เฉพาะทีมงานเท่านั้นที่สามารถเริ่มตั๋วใหม่ได้', ephemeral: true }); }
            if (!ticket.isPaused) { return interaction.reply({ content: '⚠️ ตั๋วนี้ไม่ได้ถูกหยุดชั่วคราว', ephemeral: true }); }
            const unpauseResult = await ticketManager.unpauseTicket(channel.id, interaction.user);
            if (unpauseResult.success) {
                await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: true });
                const pauseButton = new ButtonBuilder().setCustomId('pause_ticket').setLabel('⏸️ หยุดชั่วคราว').setStyle(ButtonStyle.Secondary);
                const closeButton = new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 ปิดตั๋ว').setStyle(ButtonStyle.Danger);
                const buttonRow = new ActionRowBuilder().addComponents(pauseButton, closeButton);
                const unpauseEmbed = new EmbedBuilder().setTitle('▶️ ตั๋วเริ่มทำงานใหม่').setDescription(`ตั๋วถูกเริ่มใหม่โดย ${interaction.user}\n\nผู้ใช้สามารถส่งข้อความได้ตามปกติแล้ว`).setColor(config.colors.success).setTimestamp();
                await interaction.reply({ embeds: [unpauseEmbed], components: [buttonRow] });
                console.log(`▶️ Ticket unpaused: ${channel.name} by ${interaction.user.tag}`);
            } else { await interaction.reply({ content: `❌ เกิดข้อผิดพลาดในการเริ่มตั๋วใหม่: ${unpauseResult.error}`, ephemeral: true }); }
        } else if (interaction.customId === 'close_ticket') {
            const canClose = isTicketOwner || isStaff;
            if (!canClose) { return interaction.reply({ content: '❌ คุณไม่มีสิทธิ์ปิดตั๋วนี้', ephemeral: true }); }
            await interaction.reply({ content: '🔒 กำลังปิดตั๋ว... กำลังสร้าง transcript และห้องนี้จะถูกลบใน 15 วินาที', });
            const transcriptResult = await ticketManager.generateTranscript(channel);
            let transcriptSent = false;
            let transcriptUrl = null;
            if (transcriptResult.success) {
                try {
                    const fileUtils = require('../utils/fileUtils');
                    const transcriptServer = require('../utils/transcriptServer');
                    const saveResult = await fileUtils.saveTranscript(channel.name, transcriptResult.html, ticket.ticketNumber);
                    if (saveResult.success) {
                        transcriptUrl = transcriptServer.getTranscriptUrl(saveResult.fileName);
                        console.log('🔗 Transcript URL:', transcriptUrl);
                        firebase.saveTranscriptMetadata(ticket.ticketNumber, transcriptUrl, transcriptResult.messageCount).catch(err => console.error('Non-critical Firebase transcript save error:', err.message));
                    }
                    if (config.server.logChannelId) {
                        const logChannel = interaction.guild.channels.cache.get(config.server.logChannelId);
                        if (logChannel) {
                            const transcriptBuffer = Buffer.from(transcriptResult.html, 'utf8');
                            const fileName = `transcript-${ticket.ticketNumber}-${new Date().toISOString().split('T')[0]}.html`;
                            await logChannel.send({ content: `📋 **Transcript สำหรับตั๋ว:** #${ticket.ticketNumber}${transcriptUrl ? `\n🔗 **Direct Link:** ${transcriptUrl}` : ''}`, files: [{ attachment: transcriptBuffer, name: fileName }] });
                            transcriptSent = true;
                            console.log('✅ Transcript saved to log channel with direct link');
                        }
                    }
                } catch (error) { console.error('❌ Error sending transcript:', error); }
            } else { console.error('❌ Failed to generate transcript:', transcriptResult.error); }
            const closeResult = await ticketManager.closeTicket(channel.id, interaction.user);
            if (closeResult.success) {
                if (config.server.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(config.server.logChannelId);
                    if (logChannel) {
                        const user = interaction.guild.members.cache.get(ticket.userId);
                        const category = config.ticketCategories[ticket.category];
                        const closeEmbed = new EmbedBuilder().setTitle('🔒 ตั๋วถูกปิด').setColor(config.colors.error).addFields({ name: '🎫 หมายเลข', value: `#${ticket.ticketNumber}`, inline: true }, { name: '👤 เจ้าของตั๋ว', value: user ? `${user.user.tag} (${user.id})` : `User ID: ${ticket.userId}`, inline: true }, { name: '🔐 ปิดโดย', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true }, { name: '📂 หมวดหมู่', value: category?.label || ticket.category, inline: true }, { name: '⏱️ เวลาที่ใช้', value: `<t:${Math.floor(ticket.createdAt / 1000)}:R>`, inline: true }, { name: '📊 จำนวนข้อความ', value: transcriptResult.success ? transcriptResult.messageCount.toString() : 'ไม่สามารถนับได้', inline: true }, { name: '🔗 Direct Link', value: transcriptUrl ? `[คลิกที่นี่เพื่อดู](${transcriptUrl})` : '❌ ไม่สามารถสร้างลิงก์ได้', inline: true }).setTimestamp();
                        await logChannel.send({ embeds: [closeEmbed] }).catch(console.error);
                    }
                }
                setTimeout(async () => { try { await channel.delete('Ticket closed'); console.log(`🗑️ Ticket channel deleted: ${channel.name}`); } catch (error) { console.error('Error deleting ticket channel:', error); } }, 15000);
            }
        }
    });
};