const { ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config/config');
const ticketCounter = require('./ticketCounter');
const firebase = require('./firebase');

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
        // ================== START: CODE ที่แก้ ==================
        console.log('[TM-DEBUG] Entered createTicketChannel');
        const category = config.ticketCategories[categoryKey];
        if (!category) {
            console.error(`[TM-DEBUG] CRITICAL: Invalid category key provided: ${categoryKey}`);
            return { success: false, error: `Invalid ticket category: ${categoryKey}` };
        }
        
        console.log('[TM-DEBUG] Getting next ticket number...');
        const ticketNumber = await ticketCounter.getNextTicketNumber(categoryKey);
        console.log(`[TM-DEBUG] Got ticket number: ${ticketNumber}`);
        const channelName = `ticket-${ticketNumber}`;
        // ================== END: CODE ที่แก้ ==================

        try {
            const permissionOverwrites = [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
                { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] }
            ];

            if (config.server.staffRoleId) {
                const staffRole = guild.roles.cache.get(config.server.staffRoleId);
                if (staffRole) {
                    permissionOverwrites.push({
                        id: staffRole.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles]
                    });
                } else {
                    console.warn(`[TM-WARN] Staff Role ID (${config.server.staffRoleId}) not found in this guild.`);
                }
            }
            
            // ================== START: CODE ที่แก้ ==================
            console.log(`[TM-DEBUG] Preparing to create channel '${channelName}' in category ${config.server.ticketCategoryId || 'none'}`);
            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                topic: `${category.label} - ${user.tag} - Ticket #${ticketNumber}`,
                parent: config.server.ticketCategoryId || null,
                permissionOverwrites
            });
            console.log(`[TM-DEBUG] Channel created successfully: ${ticketChannel.id}`);
            // ================== END: CODE ที่แก้ ==================

            const ticketData = {
                ticketNumber: ticketNumber,
                channelId: ticketChannel.id,
                category: categoryKey,
                createdAt: Date.now(),
                userId: user.id,
                userTag: user.tag,
                guildId: guild.id,
                status: 'open',
                isPaused: false,
                pausedBy: null,
                pausedAt: null
            };

            this.activeTickets.set(user.id, ticketData);
            
            firebase.saveTicketData(ticketData).catch(err => {
                console.error('Non-critical Firebase save error:', err.message);
            });
            
            console.log(`Created ticket #${ticketNumber} for ${user.tag}`);
            
            return { success: true, channel: ticketChannel, data: ticketData };
        } catch (error) {
            // ================== START: CODE ที่แก้ ==================
            console.error('!!!!!!!!!! FAILED AT guild.channels.create !!!!!!!!!!');
            console.error('This is likely a PERMISSIONS or INVALID ID issue.');
            console.error(`Check if bot has 'Manage Channels' permission.`);
            console.error(`Check if TICKET_CATEGORY_ID '${config.server.ticketCategoryId}' is valid and the bot can access it.`);
            console.error(error); // แสดง error แบบเต็มๆ
            return { success: false, error: error.message };
            // ================== END: CODE ที่แก้ ==================
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

        // Update in Firebase (non-blocking)
        firebase.updateTicketStatus(ticketData.ticketNumber, 'closed', {
            closedAt: ticketData.closedAt,
            closedBy: closedBy.id,
            closedByTag: closedBy.tag
        }).catch(err => {
            console.error('Non-critical Firebase update error:', err.message);
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

        // Update Firebase (non-blocking)
        firebase.updateTicketStatus(ticketData.ticketNumber, 'paused', {
            isPaused: true,
            pausedBy: pausedBy.id,
            pausedAt: Date.now()
        }).catch(err => {
            console.error('Non-critical Firebase update error:', err.message);
        });

        console.log(`Paused ticket #${ticketData.ticketNumber}`);
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

        // Update Firebase (non-blocking)
        firebase.updateTicketStatus(ticketData.ticketNumber, 'open', {
            isPaused: false,
            pausedBy: null,
            pausedAt: null
        }).catch(err => {
            console.error('Non-critical Firebase update error:', err.message);
        });

        console.log(`Unpaused ticket #${ticketData.ticketNumber}`);
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
    <title>Ticket #${ticket?.ticketNumber || 'Unknown'} Transcript - Thai Esports League</title>
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
            background: linear-gradient(135deg, #5865f2, #3b4cca);
            padding: 20px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 1.8em;
        }
        .ticket-info {
            background: #40444b;
            padding: 15px 20px;
            border-bottom: 1px solid #484b51;
        }
        .ticket-info div {
            margin: 8px 0;
        }
        .ticket-number {
            font-size: 1.3em;
            font-weight: bold;
            color: #5865f2;
            margin-bottom: 15px;
            text-align: center;
            padding: 10px;
            background: #2f3136;
            border-radius: 6px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 0;
            border-bottom: 1px solid #484b51;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: 600;
            color: #b9bbbe;
        }
        .info-value {
            color: #dcddde;
        }
        .messages {
            padding: 20px;
            max-height: 600px;
            overflow-y: auto;
        }
        .message {
            margin-bottom: 20px;
            padding: 12px 16px;
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
            font-size: 14px;
        }
        .username {
            font-weight: 600;
            color: #ffffff;
            margin-right: 8px;
        }
        .bot-tag {
            background: #5865f2;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            margin-right: 8px;
        }
        .timestamp {
            color: #72767d;
            font-size: 12px;
            margin-left: auto;
        }
        .message-content {
            color: #dcddde;
            word-wrap: break-word;
            line-height: 1.5;
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
            border-left: 3px solid #faa61a;
        }
        .attachment a {
            color: #00aff4;
            text-decoration: none;
        }
        .attachment a:hover {
            text-decoration: underline;
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
            border-top: 1px solid #484b51;
        }
        .footer-logo {
            color: #5865f2;
            font-weight: bold;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Thai Esports League</h1>
            <p>Ticket Support Transcript</p>
        </div>
        <div class="ticket-info">
            <div class="ticket-number">Ticket #${ticket?.ticketNumber || 'Unknown'}</div>
            <div class="info-row">
                <span class="info-label">Channel:</span>
                <span class="info-value">#${channel.name}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Category:</span>
                <span class="info-value">${category?.label || 'Unknown'} ${category?.emoji || ''}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Created:</span>
                <span class="info-value">${new Date(ticket?.createdAt || Date.now()).toLocaleString('th-TH', {timeZone: 'Asia/Bangkok'})}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Messages:</span>
                <span class="info-value">${messages.length}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Generated:</span>
                <span class="info-value">${new Date().toLocaleString('th-TH', {timeZone: 'Asia/Bangkok'})}</span>
            </div>
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
                    <span class="username">${this.escapeHtml(message.author.username)}</span>
                    ${isBot ? '<span class="bot-tag">BOT</span>' : ''}
                    <span class="timestamp">${message.createdAt.toLocaleString('th-TH', {timeZone: 'Asia/Bangkok'})}</span>
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
                        html += `<div class="attachment"><a href="${attachment.url}" target="_blank">${this.escapeHtml(attachment.name)}</a></div>`;
                    }
                }

                html += `
                </div>
            </div>`;
            }

            html += `
        </div>
        <div class="footer">
            <div class="footer-logo">Thai Esports League Support System</div>
            <div>Ticket #${ticket?.ticketNumber || 'Unknown'} • Generated ${new Date().toLocaleString('th-TH', {timeZone: 'Asia/Bangkok'})}</div>
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