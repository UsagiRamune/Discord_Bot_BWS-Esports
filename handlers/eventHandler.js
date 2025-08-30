const config = require('../config/config');
const scheduleManager = require('../utils/scheduleManager');
const firebase = require('../utils/firebase');

module.exports = (client) => {
    // Bot ready event
    client.once('ready', async () => {
        console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
        console.log(`👥 Bot is in ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} servers`);
        
        // Initialize Firebase
        try {
            await firebase.initialize();
            console.log('✅ Firebase integration ready');
        } catch (error) {
            console.error('⚠️ Firebase initialization failed, continuing without Firebase');
        }

        // Initialize schedule manager
        scheduleManager.setClient(client);
        
        // Set initial bot activity (will be updated by schedule manager)
        client.user.setActivity('Thai Esports League | !setup-tickets', { type: 'WATCHING' });

        console.log('🚀 All systems ready!');
    });

    // Guild join event
    client.on('guildCreate', (guild) => {
        console.log(`➕ Joined new guild: ${guild.name} (${guild.id})`);
        console.log(`👥 Guild has ${guild.memberCount} members`);
        
        // Try to send a welcome message to the system messages channel
        if (guild.systemChannel) {
            const welcomeMessage = `👋 สวัสดีครับ! ขอบคุณที่เชิญ Thai Esports League Bot เข้ามา!

🎫 **ระบบติดต่อทีมงาน**
• ใช้คำสั่ง \`!setup-tickets\` เพื่อตั้งค่าระบบตั๋ว
• เวลาทำการ: ${config.schedule.startHour}:00 - ${config.schedule.endHour}:00 น.

🔧 **การตั้งค่า**
• ตั้งค่า environment variables ตามที่ต้องการ
• สร้าง category สำหรับตั๋ว (ไม่จำเป็น)
• กำหนด staff role สำหรับทีมงาน

📋 คำสั่งที่สำคัญ:
• \`!setup-tickets\` - สร้างแผงควบคุมตั๋ว
• \`!ticket-stats\` - ดูสถิติตั๋ว
• \`!firebase-status\` - ตรวจสอบสถานะ Firebase

🔗 ต้องการความช่วยเหลือ? ติดต่อผู้พัฒนาได้เลย!`;
            
            guild.systemChannel.send(welcomeMessage).catch(() => {
                console.log('Could not send welcome message to system channel');
            });
        }
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

    // Handle process signals for graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('🛑 Received SIGTERM, shutting down gracefully...');
        
        try {
            scheduleManager.destroy();
            console.log('✅ Schedule manager destroyed');
            
            client.destroy();
            console.log('✅ Discord client destroyed');
            
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    });

    process.on('SIGINT', async () => {
        console.log('🛑 Received SIGINT, shutting down gracefully...');
        
        try {
            scheduleManager.destroy();
            client.destroy();
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    });
};