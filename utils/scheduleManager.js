const cron = require('node-cron');
const config = require('../config/config');

class ScheduleManager {
    constructor() {
        this.client = null;
        this.isOperatingHours = this.checkOperatingHours();
        this.cronJobs = [];
    }

    setClient(client) {
        this.client = client;
        this.setupSchedule();
    }

    checkOperatingHours() {
        const now = new Date();
        const bangkokTime = new Date(now.toLocaleString("en-US", {timeZone: config.schedule.timezone}));
        const hour = bangkokTime.getHours();
        
        return hour >= config.schedule.startHour && hour < config.schedule.endHour;
    }

    setupSchedule() {
        if (!this.client) return;

        // Check every minute if we should update bot status
        const statusCheck = cron.schedule('* * * * *', () => {
            this.updateBotStatus();
        }, {
            scheduled: true,
            timezone: config.schedule.timezone
        });

        // Log schedule changes
        const hourlyLog = cron.schedule('0 * * * *', () => {
            const isNowOperating = this.checkOperatingHours();
            if (isNowOperating !== this.isOperatingHours) {
                this.isOperatingHours = isNowOperating;
                console.log(`🕐 Schedule change: ${isNowOperating ? 'Operating hours started' : 'Operating hours ended'}`);
            }
        }, {
            scheduled: true,
            timezone: config.schedule.timezone
        });

        this.cronJobs.push(statusCheck, hourlyLog);
        
        // Set initial status
        this.updateBotStatus();
        
        console.log(`📅 Schedule manager initialized`);
        console.log(`⏰ Operating hours: ${config.schedule.startHour}:00 - ${config.schedule.endHour}:00 (${config.schedule.timezone})`);
    }

    updateBotStatus() {
        if (!this.client || !this.client.user) return;

        const wasOperating = this.isOperatingHours;
        this.isOperatingHours = this.checkOperatingHours();

        try {
            if (this.isOperatingHours) {
                this.client.user.setStatus('online');
                this.client.user.setActivity('Thai Esports League | !setup-tickets', { type: 'WATCHING' });
                
                if (!wasOperating) {
                    console.log('🟢 Bot is now in operating hours - Online');
                }
            } else {
                this.client.user.setStatus('dnd');
                this.client.user.setActivity(`ปิดทำการ | เปิด ${config.schedule.startHour}:00-${config.schedule.endHour}:00`, { type: 'PLAYING' });
                
                if (wasOperating) {
                    console.log('🔴 Bot is now outside operating hours - Do Not Disturb');
                }
            }
        } catch (error) {
            console.error('Error updating bot status:', error);
        }
    }

    isInOperatingHours() {
        return this.checkOperatingHours();
    }

    getOperatingHoursMessage() {
        const now = new Date();
        const bangkokTime = new Date(now.toLocaleString("en-US", {timeZone: config.schedule.timezone}));
        const currentHour = bangkokTime.getHours();
        const currentMinute = bangkokTime.getMinutes();
        
        let nextOpenTime;
        if (currentHour < config.schedule.startHour) {
            // Before opening today
            nextOpenTime = `วันนี้เวลา ${config.schedule.startHour}:00 น.`;
        } else if (currentHour >= config.schedule.endHour) {
            // After closing today, opens tomorrow
            nextOpenTime = `พรุ่งนี้เวลา ${config.schedule.startHour}:00 น.`;
        } else {
            // Should be operating hours
            return null;
        }

        return {
            title: '🕐 ระบบตั๋วปิดทำการ',
            description: `ระบบตั๋วของ Thai Esports League ปิดทำการชั่วคราว`,
            fields: [
                {
                    name: '⏰ เวลาทำการ',
                    value: `${config.schedule.startHour}:00 - ${config.schedule.endHour}:00 น. (เวลาไทย)`,
                    inline: true
                },
                {
                    name: '🕐 เวลาปัจจุบัน',
                    value: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')} น.`,
                    inline: true
                },
                {
                    name: '🔔 เปิดทำการอีกครั้ง',
                    value: nextOpenTime,
                    inline: false
                }
            ],
            color: config.colors.warning
        };
    }

    // Graceful shutdown with advance warning for active tickets
    async scheduleGracefulShutdown() {
        const now = new Date();
        const bangkokTime = new Date(now.toLocaleString("en-US", {timeZone: config.schedule.timezone}));
        const hour = bangkokTime.getHours();
        const minute = bangkokTime.getMinutes();
        
        // Warning at 11:45 PM (15 minutes before closing)
        if (hour === 23 && minute === 45) {
            await this.sendClosingWarning();
        }
    }

    async sendClosingWarning() {
        if (!this.client) return;

        try {

            const ticketManager = require('./ticketManager');
            const { EmbedBuilder } = require('discord.js');
            
            const activeTickets = ticketManager.getAllActiveTickets();
            
            if (activeTickets.length > 0) {
                console.log(`⚠️ Sending closing warning to ${activeTickets.length} active tickets`);
                
                for (const ticket of activeTickets) {
                    try {
                        const channel = this.client.channels.cache.get(ticket.channelId);
                        if (channel) {
                            const warningEmbed = new EmbedBuilder()
                                .setTitle('⚠️ แจ้งเตือน: ระบบจะปิดทำการในอีก 15 นาที')
                                .setDescription('ระบบตั๋วจะปิดทำการเวลา 24:00 น.\nหากคุณยังต้องการความช่วยเหลือ กรุณาแจ้งให้ทีมงานทราบตอนนี้')
                                .setColor(config.colors.warning)
                                .addFields({
                                    name: '🔔 จะเปิดทำการอีกครั้ง',
                                    value: `พรุ่งนี้เวลา ${config.schedule.startHour}:00 น.`,
                                    inline: true
                                })
                                .setTimestamp();

                            await channel.send({ embeds: [warningEmbed] });
                        }
                    } catch (error) {
                        console.error(`Error sending warning to ticket ${ticket.ticketNumber}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('Error sending closing warnings:', error);
        }
    }

    destroy() {
        this.cronJobs.forEach(job => {
            if (job) job.stop();
        });
        this.cronJobs = [];
        console.log('📅 Schedule manager destroyed');
    }
}

module.exports = new ScheduleManager();