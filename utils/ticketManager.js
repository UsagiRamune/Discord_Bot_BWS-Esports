const { ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config/config');
const ticketCounter = require('./ticketCounter');

class TicketManager {
    constructor() {
        this.activeTickets = new Map();
    }

    hasActiveTicket(userId) {
        return this.activeTickets.has(userId);
    }

    getActiveTicket(userId) {
        return this.activeTickets.get(userId);
    }

    async createTicketChannel(guild, user, categoryKey) {
        const category = config.ticketCategories[categoryKey];
        
        // Get next ticket number
        const ticketNumber = await ticketCounter.getNextTicketNumber(categoryKey);
        const channelName = `ticket-${ticketNumber}`;

        try {
            const permissionOverwrites = [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ]
                },
                {
                    id: guild.members.me.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ]
                }
            ];

            // Add staff role permissions if configured
            if (config.server.staffRoleId) {
                const staffRole = guild.roles.cache.get(config.server.staffRoleId);
                if (staffRole) {
                    permissionOverwrites.push({
                        id: staffRole.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageMessages,
                            PermissionFlagsBits.AttachFiles
                        ]
                    });
                }
            }

            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                topic: `${category.label} - ${user.tag} - Ticket #${ticketNumber}`,
                parent: config.server.ticketCategoryId || null,
                permissionOverwrites
            });

            const ticketData = {
                ticketNumber: ticketNumber,
                channelId: ticketChannel.id,
                category: categoryKey,
                createdAt: Date.now(),
                userId: user.id,
                status: 'open',
                isPaused: false,
                pausedBy: null,
                pausedAt: null
            };

            this.activeTickets.set(user.id, ticketData);
            console.log(`🎫 Created ticket #${ticketNumber} for ${user.tag}`);
            
            return { success: true, channel: ticketChannel, data: ticketData };
        } catch (error) {
            console.error('Error creating ticket channel:', error);
            return { success: false, error: error.message };
        }
    }

    async closeTicket(channelId, closedBy) {
        let ticketData = null;
        let userId = null;

        // Find ticket by channel ID
        for (const [uId, ticket] of this.activeTickets.entries()) {
            if (ticket.channelId === channelId) {
                ticketData = ticket;
                userId = uId;
                break;
            }
        }

        if (!ticketData) {
            return { success: false, error: 'Ticket not found' };
        }

        ticketData.status = 'closed';
        ticketData.closedAt = Date.now();
        ticketData.closedBy = closedBy.id;
        ticketData.closedByTag = closedBy.tag;

        // Update in Firebase
        await firebase.updateTicketStatus(ticketData.ticketNumber, 'closed', {
            closedAt: ticketData.closedAt,
            closedBy: closedBy.id,
            closedByTag: closedBy.tag
        });

        this.activeTickets.delete(userId);
        
        console.log(`Closed ticket #${ticketData.ticketNumber}`);
        return { success: true, data: ticketData };
    }

    async pauseTicket(channelId, pausedBy) {
        const ticket = this.getTicketByChannelId(channelId);
        if (!ticket) {
            return { success: false, error: 'Ticket not found' };
        }

        const ticketData = this.activeTickets.get(ticket.userId);
        ticketData.isPaused = true;
        ticketData.pausedBy = pausedBy.id;
        ticketData.pausedAt = Date.now();

        console.log(`⏸️ Paused ticket #${ticketData.ticketNumber}`);
        return { success: true, data: ticketData };
    }

    async unpauseTicket(channelId, unpausedBy) {
        const ticket = this.getTicketByChannelId(channelId);
        if (!ticket) {
            return { success: false, error: 'Ticket not found' };
        }

        const ticketData = this.activeTickets.get(ticket.userId);
        ticketData.isPaused = false;
        ticketData.pausedBy = null;
        ticketData.pausedAt = null;

        console.log(`▶️ Unpaused ticket #${ticketData.ticketNumber}`);
        return { success: true, data: ticketData };
    }

    async generateTranscript(channel) {
        try {
            const messages = [];
            let lastId;

            // Fetch all messages in batches
            while (true) {
                const options = { limit: 100 };
                if (lastId) options.before = lastId;

                const batch = await channel.messages.fetch(options);
                if (batch.size === 0) break;

                messages.push(...batch.values());
                lastId = batch.last().id;
            }

            // Sort messages by creation time (oldest first)
            messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            // Generate HTML transcript
            const ticket = this.getTicketByChannelId(channel.id);
            const category = config.ticketCategories[ticket?.category];
            
            let html = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket #${ticket?.ticketNumber || 'Unknown'} Transcript</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #36393f;
            color: #dcddde;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: #2f3136;
            border-radius: 8px;
            overflow: hidden;
        }
        .header {
            background: #5865f2;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            color: white;
        }
        .ticket-info {
            background: #40444b;
            padding: 15px 20px;
            border-bottom: 1px solid #484b51;
        }
        .ticket-info div {
            margin: 5px 0;
        }
        .ticket-number {
            font-size: 1.2em;
            font-weight: bold;
            color: #5865f2;
            margin-bottom: 10px;
        }
        .messages {
            padding: 20px;
        }
        .message {
            margin-bottom: 20px;
            padding: 10px 15px;
            background: #40444b;
            border-radius: 8px;
            border-left: 4px solid #5865f2;
        }
        .message-header {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            margin-right: 12px;
            background: #5865f2;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
        }
        .username {
            font-weight: 600;
            color: #ffffff;
            margin-right: 8px;
        }
        .timestamp {
            color: #72767d;
            font-size: 12px;
        }
        .message-content {
            color: #dcddde;
            word-wrap: break-word;
        }
        .embed {
            border-left: 4px solid #5865f2;
            background: #2f3136;
            margin: 10px 0;
            padding: 12px;
            border-radius: 4px;
        }
        .embed-title {
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .embed-description {
            color: #dcddde;
            margin-bottom: 8px;
        }
        .attachment {
            background: #40444b;
            padding: 8px 12px;
            margin: 8px 0;
            border-radius: 4px;
            color: #00aff4;
        }
        .system-message {
            border-left-color: #faa61a;
            background: #40444b;
        }
        .bot-message {
            border-left-color: #5865f2;
        }
        .footer {
            background: #40444b;
            padding: 15px 20px;
            text-align: center;
            color: #72767d;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Ticket Transcript</h1>
        </div>
        <div class="ticket-info">
            <div class="ticket-number">🎫 Ticket #${ticket?.ticketNumber || 'Unknown'}</div>
            <div><strong>📝 Channel:</strong> #${channel.name}</div>
            <div><strong>📂 Category:</strong> ${category?.label || 'Unknown'} ${category?.emoji || ''}</div>
            <div><strong>🕐 Created:</strong> ${new Date(ticket?.createdAt || Date.now()).toLocaleString('th-TH')}</div>
            <div><strong>📊 Total Messages:</strong> ${messages.length}</div>
            <div><strong>⏰ Generated:</strong> ${new Date().toLocaleString('th-TH')}</div>
        </div>
        <div class="messages">`;

            for (const message of messages) {
                const isBot = message.author.bot;
                const isSystem = message.type !== 0;
                const messageClass = isSystem ? 'system-message' : (isBot ? 'bot-message' : 'message');
                
                html += `
            <div class="${messageClass}">
                <div class="message-header">
                    <div class="avatar">${message.author.username.charAt(0).toUpperCase()}</div>
                    <span class="username">${this.escapeHtml(message.author.username)}${isBot ? ' (Bot)' : ''}</span>
                    <span class="timestamp">${message.createdAt.toLocaleString('th-TH')}</span>
                </div>
                <div class="message-content">`;

                if (message.content) {
                    html += `<div>${this.escapeHtml(message.content).replace(/\n/g, '<br>')}</div>`;
                }

                // Add embeds
                if (message.embeds.length > 0) {
                    for (const embed of message.embeds) {
                        html += `<div class="embed">`;
                        if (embed.title) html += `<div class="embed-title">${this.escapeHtml(embed.title)}</div>`;
                        if (embed.description) html += `<div class="embed-description">${this.escapeHtml(embed.description).replace(/\n/g, '<br>')}</div>`;
                        html += `</div>`;
                    }
                }

                // Add attachments
                if (message.attachments.size > 0) {
                    for (const attachment of message.attachments.values()) {
                        html += `<div class="attachment">📎 <a href="${attachment.url}" target="_blank">${this.escapeHtml(attachment.name)}</a></div>`;
                    }
                }

                html += `
                </div>
            </div>`;
            }

            html += `
        </div>
        <div class="footer">
            Generated by Thai Esports League Ticket System<br>
            Ticket #${ticket?.ticketNumber || 'Unknown'} - ${new Date().toLocaleString('th-TH')}
        </div>
    </div>
</body>
</html>`;

            return { success: true, html, messageCount: messages.length, ticketNumber: ticket?.ticketNumber };
        } catch (error) {
            console.error('Error generating transcript:', error);
            return { success: false, error: error.message };
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    getTicketByChannelId(channelId) {
        for (const [userId, ticket] of this.activeTickets.entries()) {
            if (ticket.channelId === channelId) {
                return { ...ticket, userId };
            }
        }
        return null;
    }

    getAllActiveTickets() {
        return Array.from(this.activeTickets.entries()).map(([userId, ticket]) => ({
            userId,
            ...ticket
        }));
    }

    getUserTicketCount(userId) {
        return this.hasActiveTicket(userId) ? 1 : 0;
    }

    canCreateTicket(userId) {
        return this.getUserTicketCount(userId) < config.bot.maxTicketsPerUser;
    }

    getStats() {
        const activeCount = this.activeTickets.size;
        const categories = {};

        for (const ticket of this.activeTickets.values()) {
            categories[ticket.category] = (categories[ticket.category] || 0) + 1;
        }

        return {
            activeTickets: activeCount,
            categoriesBreakdown: categories
        };
    }
}

module.exports = new TicketManager();