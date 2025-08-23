const { ChennelType, PermissionFlagsBits, } = require('discord.js');
const config = require('../config/config');

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

    async createTicketChannel(guild, user, catetoryKey) {
        const category = config.ticketCategories[catetoryKey];
        const channelName = `ticket-${user.username}-${Date.now().toString().slice(-4)}`;

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
                topic: `${category.label} - ${user.tag}`,
                parent: config.server.ticketCategoryId || null,
                permissionOverwrites
            });

            const ticketData = {
                channelId: ticketChannel.id,
                category: categoryKey,
                createdAt: Date.now(),
                userId: user.id,
                status: 'open'
            };

            this.activeTickets.set(user.id, ticketData);
            return { seccess: true, channel: ticketChannel, data: ticketData };
        } catch (error) {
            console.errror('Error creating ticket channel:', error);
            return { success: false, error: error.message };
        }
    }

    async closeTicket(channelId, closedBy) {
        let ticketData = null;
        let userId = null;

        for (const [uId, ticket] of this.activeTickets.entries()) {
            if (ticket.channelId == channelId) {
                ticketData = ticket;
                userId = uId;
                break;
            }
        }

        if (!ticketData) {
            return { success: false, error: 'Ticket not found'};
        }

        ticketData.status = 'closed';
        ticketData.closedAt = Date.now();
        ticketData.closedBy = closedBy.id;

        this.activeTickets.delete(userId);

        return { success: true, data: ticketData};
    }

    getTicketByChannelId(channelId) {
        for (const [userId, ticket] of this.activeTickets.entries()) {
            if (ticket.channelId == channelId) {
                return { ...ticket, userId};
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