const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const ticketManager = require('../utils/ticketManager');
const scheduleManager = require('../utils/scheduleManager');
const ticketCounter = require('../utils/ticketCounter');
const firebase = require('../utils/firebase');

module.exports = (client) => {
    // Message create event for commands
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        
        // Check if message is in a paused ticket channel
        const ticket = ticketManager.getTicketByChannelId(message.channel.id);
        if (ticket && ticket.isPaused && message.author.id === ticket.userId) {
            // Delete the message and send ephemeral warning
            await message.delete().catch(() => {});
            
            // Send a temporary warning message that deletes itself
            const warningMsg = await message.channel.send({
                content: `⏸️ ${message.author} ตั๋วนี้ถูกหยุดชั่วคราวโดยทีมงาน คุณไม่สามารถส่งข้อความได้ในขณะนี้`
            });
            
            // Delete warning after 5 seconds
            setTimeout(async () => {
                await warningMsg.delete().catch(() => {});
            }, 5000);
            
            return;
        }
        
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

            // Create embed with better styling
            const embed = new EmbedBuilder()
                .setTitle('🎫 ระบบติดต่อทีมงาน - Thai Esports League')
                .setDescription('กรุณาเลือกหมวดหมู่ที่ต้องการติดต่อจากเมนูด้านล่าง\nทีมงานจะตอบกลับโดยเร็วที่สุด!')
                .setColor(config.colors.primary)
                .addFields({
                    name: '📋 วิธีการใช้งาน',
                    value: '1️⃣ เลือกหมวดหมู่จากเมนูด้านล่าง\n2️⃣ ระบบจะสร้างห้องแชทส่วนตัวให้คุณ\n3️⃣ อธิบายปัญหาหรือคำถามของคุณ\n4️⃣ รอทีมงานตอบกลับ'
                })
                .addFields({
                    name: '🕐 เวลาทำการ',
                    value: `${config.schedule.startHour}:00 - ${config.schedule.endHour}:00 น. (เวลาไทย)`,
                    inline: true
                })
                .setFooter({ text: 'Thai Esports League Support System' })
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

        // Ticket stats command
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

        // Ticket counter stats command
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

        // Reset counters command (admin only)
        if (command === 'reset-counters') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ คุณต้องมีสิทธิ์ Administrator เพื่อใช้คำสั่งนี้');
            }

            await ticketCounter.resetCounters();
            await message.reply('🔄 รีเซ็ตหมายเลขตั๋วทั้งหมดเรียบร้อยแล้ว!');
        }

        // Force close ticket command
        if (command === 'force-close') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ คุณต้องมีสิทธิ์ Administrator เพื่อใช้คำสั่งนี้');
            }

            const ticket = ticketManager.getTicketByChannelId(message.channel.id);
            if (!ticket) {
                return message.reply('❌ คำสั่งนี้ใช้ได้เฉพาะในช่องตั๋วเท่านั้น');
            }

            await message.reply('🔒 กำลังปิดตั๋วแบบบังคับ...');

            // Generate transcript
            const transcriptResult = await ticketManager.generateTranscript(message.channel);
            
            // Close ticket
            await ticketManager.closeTicket(message.channel.id, message.author);

            // Log and delete
            console.log(`🔨 Force closed ticket: ${message.channel.name} by ${message.author.tag}`);
            
            setTimeout(async () => {
                try {
                    await message.channel.delete('Force closed by admin');
                } catch (error) {
                    console.error('Error deleting channel:', error);
                }
            }, 5000);
        }

        // Firebase status command
        if (command === 'firebase-status') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ คุณต้องมีสิทธิ์ Administrator เพื่อใช้คำสั่งนี้');
            }

            const isConnected = firebase.isInitialized();
            const embed = new EmbedBuilder()
                .setTitle('🔥 Firebase Status')
                .setColor(isConnected ? config.colors.success : config.colors.error)
                .addFields({
                    name: 'Connection Status',
                    value: isConnected ? '✅ Connected' : '❌ Not Connected',
                    inline: true
                });

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
                    embed.addFields({
                        name: 'Database Stats',
                        value: 'Error retrieving stats',
                        inline: true
                    });
                }
            }

            await message.reply({ embeds: [embed] });
        }
    });

    // Handle dropdown selection and create ticket
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isStringSelectMenu()) return;

        if (interaction.customId === 'ticket_category_select') {
            console.log('Dropdown selection detected!');

            // Check operating hours
            if (!scheduleManager.isInOperatingHours()) {
                const operatingMsg = scheduleManager.getOperatingHoursMessage();
                const embed = new EmbedBuilder()
                    .setTitle(operatingMsg.title)
                    .setDescription(operatingMsg.description)
                    .setColor(operatingMsg.color)
                    .addFields(operatingMsg.fields)
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }
            
            const selectedCategory = interaction.values[0];
            const category = config.ticketCategories[selectedCategory];
            const user = interaction.user;
            const guild = interaction.guild;

            // Check if user already has an active ticket
            if (ticketManager.hasActiveTicket(user.id)) {
                const activeTicket = ticketManager.getActiveTicket(user.id);
                const channel = guild.channels.cache.get(activeTicket.channelId);
                
                return interaction.reply({
                    content: `❌ คุณมีตั๋วที่เปิดอยู่แล้ว! กรุณาไปที่ ${channel ? channel.toString() : 'ห้องแชทตั๋วของคุณ'}`,
                    ephemeral: true
                });
            }

            // Check if user can create more tickets
            if (!ticketManager.canCreateTicket(user.id)) {
                return interaction.reply({
                    content: `❌ คุณถึงขีดจำกัดการสร้างตั๋วแล้ว (สูงสุด ${config.bot.maxTicketsPerUser} ตั๋วต่อคน)`,
                    ephemeral: true
                });
            }

            // Defer the reply to give us more time to create the channel
            await interaction.deferReply({ ephemeral: true });

            try {
                // Create the ticket channel
                const result = await ticketManager.createTicketChannel(guild, user, selectedCategory);
                
                if (!result.success) {
                    return interaction.editReply({
                        content: `❌ เกิดข้อผิดพลาดในการสร้างตั๋ว: ${result.error}`
                    });
                }

                const { channel, data } = result;
                console.log(`Ticket created: ${channel.name} for ${user.tag}`);

                // Create welcome embed for the ticket
                const welcomeEmbed = new EmbedBuilder()
                    .setTitle(`${category.emoji} ${category.label}`)
                    .setDescription(`สวัสดี ${user}! 👋\n\nขอบคุณที่ติดต่อทีมงาน Thai Esports League\nโปรดอธิบายปัญหาหรือคำถามของคุณได้เลย`)
                    .setColor(category.color)
                    .addFields(
                        { name: '🎫 หมายเลขตั๋ว', value: `#${data.ticketNumber}`, inline: true },
                        { name: '📂 หมวดหมู่', value: category.label, inline: true },
                        { name: '🕐 เวลาที่สร้าง', value: `<t:${Math.floor(data.createdAt / 1000)}:F>`, inline: true },
                        { name: '👤 ผู้สร้าง', value: user.toString(), inline: true }
                    )
                    .setFooter({ text: `Ticket #${data.ticketNumber} | สร้างเมื่อ` })
                    .setTimestamp();

                // Create close and pause buttons
                const closeButton = new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 ปิดตั๋ว')
                    .setStyle(ButtonStyle.Danger);

                const pauseButton = new ButtonBuilder()
                    .setCustomId('pause_ticket')
                    .setLabel('⏸️ หยุดชั่วคราว')
                    .setStyle(ButtonStyle.Secondary);

                const buttonRow = new ActionRowBuilder().addComponents(pauseButton, closeButton);

                // Send welcome message to the ticket channel
                await channel.send({
                    content: `${user} ${config.server.staffRoleId ? `<@&${config.server.staffRoleId}>` : ''}`,
                    embeds: [welcomeEmbed],
                    components: [buttonRow]
                });

                // Reply to the user
                await interaction.editReply({
                    content: `✅ สร้างตั๋วเรียบร้อยแล้ว! กรุณาไปที่ ${channel} เพื่อดำเนินการต่อ`
                });

                // Log to console
                console.log(`✅ Ticket created successfully: ${channel.name} (${channel.id}) for ${user.tag}`);

                // Log to log channel if configured
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
                await interaction.editReply({
                    content: `❌ เกิดข้อผิดพลาดในการสร้างตั๋ว กรุณาลองอีกครั้งหรือติดต่อผู้ดูแลระบบ`
                });
            }
        }
    });

    // Handle button interactions (close, pause, unpause)
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        const channel = interaction.channel;
        const ticket = ticketManager.getTicketByChannelId(channel.id);

        if (!ticket) {
            return interaction.reply({
                content: '❌ ไม่พบข้อมูลตั๋วนี้ในระบบ',
                ephemeral: true
            });
        }

        // Check permissions for staff actions
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
                       (config.server.staffRoleId && interaction.member.roles.cache.has(config.server.staffRoleId));
        const isTicketOwner = interaction.user.id === ticket.userId;

        if (interaction.customId === 'pause_ticket') {
            if (!isStaff) {
                return interaction.reply({
                    content: '❌ เฉพาะทีมงานเท่านั้นที่สามารถหยุดตั๋วชั่วคราวได้',
                    ephemeral: true
                });
            }

            if (ticket.isPaused) {
                return interaction.reply({
                    content: '⚠️ ตั๋วนี้ถูกหยุดชั่วคราวอยู่แล้ว',
                    ephemeral: true
                });
            }

            // Pause the ticket
            const pauseResult = await ticketManager.pauseTicket(channel.id, interaction.user);
            
            if (pauseResult.success) {
                // Update channel permissions to prevent user from sending messages
                await channel.permissionOverwrites.edit(ticket.userId, {
                    SendMessages: false
                });

                // Create unpause button
                const unpauseButton = new ButtonBuilder()
                    .setCustomId('unpause_ticket')
                    .setLabel('▶️ เริ่มใหม่')
                    .setStyle(ButtonStyle.Success);

                const closeButton = new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 ปิดตั๋ว')
                    .setStyle(ButtonStyle.Danger);

                const buttonRow = new ActionRowBuilder().addComponents(unpauseButton, closeButton);

                const pauseEmbed = new EmbedBuilder()
                    .setTitle('⏸️ ตั๋วถูกหยุดชั่วคราว')
                    .setDescription(`ตั๋วนี้ถูกหยุดโดย ${interaction.user}\n\nผู้ใช้ไม่สามารถส่งข้อความได้จนกว่าทีมงานจะเริ่มใหม่`)
                    .setColor(config.colors.warning)
                    .setTimestamp();

                await interaction.reply({
                    embeds: [pauseEmbed],
                    components: [buttonRow]
                });

                console.log(`⏸️ Ticket paused: ${channel.name} by ${interaction.user.tag}`);
            } else {
                await interaction.reply({
                    content: `❌ เกิดข้อผิดพลาดในการหยุดตั๋ว: ${pauseResult.error}`,
                    ephemeral: true
                });
            }
        }

        else if (interaction.customId === 'unpause_ticket') {
            if (!isStaff) {
                return interaction.reply({
                    content: '❌ เฉพาะทีมงานเท่านั้นที่สามารถเริ่มตั๋วใหม่ได้',
                    ephemeral: true
                });
            }

            if (!ticket.isPaused) {
                return interaction.reply({
                    content: '⚠️ ตั๋วนี้ไม่ได้ถูกหยุดชั่วคราว',
                    ephemeral: true
                });
            }

            // Unpause the ticket
            const unpauseResult = await ticketManager.unpauseTicket(channel.id, interaction.user);
            
            if (unpauseResult.success) {
                // Restore user permissions
                await channel.permissionOverwrites.edit(ticket.userId, {
                    SendMessages: true
                });

                // Restore original buttons
                const pauseButton = new ButtonBuilder()
                    .setCustomId('pause_ticket')
                    .setLabel('⏸️ หยุดชั่วคราว')
                    .setStyle(ButtonStyle.Secondary);

                const closeButton = new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 ปิดตั๋ว')
                    .setStyle(ButtonStyle.Danger);

                const buttonRow = new ActionRowBuilder().addComponents(pauseButton, closeButton);

                const unpauseEmbed = new EmbedBuilder()
                    .setTitle('▶️ ตั๋วเริ่มทำงานใหม่')
                    .setDescription(`ตั๋วถูกเริ่มใหม่โดย ${interaction.user}\n\nผู้ใช้สามารถส่งข้อความได้ตามปกติแล้ว`)
                    .setColor(config.colors.success)
                    .setTimestamp();

                await interaction.reply({
                    embeds: [unpauseEmbed],
                    components: [buttonRow]
                });

                console.log(`▶️ Ticket unpaused: ${channel.name} by ${interaction.user.tag}`);
            } else {
                await interaction.reply({
                    content: `❌ เกิดข้อผิดพลาดในการเริ่มตั๋วใหม่: ${unpauseResult.error}`,
                    ephemeral: true
                });
            }
        }

        else if (interaction.customId === 'close_ticket') {
            // Check if user has permission to close (ticket owner or staff)
            const canClose = isTicketOwner || isStaff;

            if (!canClose) {
                return interaction.reply({
                    content: '❌ คุณไม่มีสิทธิ์ปิดตั๋วนี้',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: '🔒 กำลังปิดตั๋ว... กำลังสร้าง transcript และห้องนี้จะถูกลบใน 15 วินาที',
            });

            // Generate transcript before closing
            console.log('📄 Generating transcript...');
            const transcriptResult = await ticketManager.generateTranscript(channel);
            
            let transcriptSent = false;
            let transcriptUrl = null;
            
            if (transcriptResult.success) {
                try {
                    // Save transcript to file system and get URL
                    const fileUtils = require('../utils/fileUtils');
                    const transcriptServer = require('../utils/transcriptServer');
                    
                    const saveResult = await fileUtils.saveTranscript(channel.name, transcriptResult.html, ticket.ticketNumber);
                    
                    if (saveResult.success) {
                        // Create direct link using the transcript server
                        transcriptUrl = transcriptServer.getTranscriptUrl(saveResult.fileName);
                        console.log('🔗 Transcript URL:', transcriptUrl);

                        // Save transcript metadata to Firebase
                        firebase.saveTranscriptMetadata(ticket.ticketNumber, transcriptUrl, transcriptResult.messageCount)
                            .catch(err => console.error('Non-critical Firebase transcript save error:', err.message));
                    }

                    // Send transcript to log channel if configured
                    if (config.server.logChannelId) {
                        const logChannel = interaction.guild.channels.cache.get(config.server.logChannelId);
                        if (logChannel) {
                            const transcriptBuffer = Buffer.from(transcriptResult.html, 'utf8');
                            const fileName = `transcript-${ticket.ticketNumber}-${new Date().toISOString().split('T')[0]}.html`;
                            
                            await logChannel.send({
                                content: `📋 **Transcript สำหรับตั๋ว:** #${ticket.ticketNumber}${transcriptUrl ? `\n🔗 **Direct Link:** ${transcriptUrl}` : ''}`,
                                files: [{
                                    attachment: transcriptBuffer,
                                    name: fileName
                                }]
                            });
                            transcriptSent = true;
                            console.log('✅ Transcript saved to log channel with direct link');
                        }
                    }

                } catch (error) {
                    console.error('❌ Error sending transcript:', error);
                }
            } else {
                console.error('❌ Failed to generate transcript:', transcriptResult.error);
            }

            // Close ticket in manager
            const closeResult = await ticketManager.closeTicket(channel.id, interaction.user);
            
            if (closeResult.success) {
                // Log closure if log channel exists
                if (config.server.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(config.server.logChannelId);
                    if (logChannel) {
                        const user = interaction.guild.members.cache.get(ticket.userId);
                        const category = config.ticketCategories[ticket.category];
                        const closeEmbed = new EmbedBuilder()
                            .setTitle('🔒 ตั๋วถูกปิด')
                            .setColor(config.colors.error)
                            .addFields(
                                { name: '🎫 หมายเลข', value: `#${ticket.ticketNumber}`, inline: true },
                                { name: '👤 เจ้าของตั๋ว', value: user ? `${user.user.tag} (${user.id})` : `User ID: ${ticket.userId}`, inline: true },
                                { name: '🔐 ปิดโดย', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                                { name: '📂 หมวดหมู่', value: category?.label || ticket.category, inline: true },
                                { name: '⏱️ เวลาที่ใช้', value: `<t:${Math.floor(ticket.createdAt / 1000)}:R>`, inline: true },
                                { name: '📊 จำนวนข้อความ', value: transcriptResult.success ? transcriptResult.messageCount.toString() : 'ไม่สามารถนับได้', inline: true },
                                { name: '🔗 Direct Link', value: transcriptUrl ? `[คลิกที่นี่เพื่อดู](${transcriptUrl})` : '❌ ไม่สามารถสร้างลิงก์ได้', inline: true },
                            )
                            .setTimestamp();

                        await logChannel.send({ embeds: [closeEmbed] }).catch(console.error);
                    }
                }

                // Delete channel after delay
                setTimeout(async () => {
                    try {
                        await channel.delete('Ticket closed');
                        console.log(`🗑️ Ticket channel deleted: ${channel.name}`);
                    } catch (error) {
                        console.error('Error deleting ticket channel:', error);
                    }
                }, 15000);
            }
        }
    });
};