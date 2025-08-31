module.exports = {
    bot: {
        token: process.env.BOT_TOKEN,
        prefix: process.env.PREFIX || '!',
        maxTicketsPerUser: parseInt(process.env.MAX_TICKETS_PER_USER) || 1,
        clientId: process.env.CLIENT_ID
    },

    server: {
        guildId: process.env.GUILD_ID,
        staffRoleId: process.env.STAFF_ROLE_ID,
        ticketCategoryId: process.env.TICKET_CATEGORY_ID,
        logChannelId: process.env.LOG_CHANNEL_ID
    },

    colors: {
        primary: `#${process.env.PRIMARY_COLOR || '00ff00'}`,
        error: `#${process.env.ERROR_COLOR || 'ff6b6b'}`,
        warning: `#${process.env.WARNING_COLOR || 'f39c12'}`,
        success: `#${process.env.SUCCESS_COLOR || '2ecc71'}`
    },

    schedule: {
        startHour: parseInt(process.env.START_HOUR) || 6,  // 6 AM
        endHour: parseInt(process.env.END_HOUR) || 24,     // 12 AM (midnight)
        timezone: process.env.TIMEZONE || 'Asia/Bangkok'
    },

    ticketCategories: {
        'member_edit': {
            emoji: '👤',
            label: 'การแก้ไขข้อมูลสมาชิก',
            description: 'แก้ไขข้อมูลส่วนตัว ชื่อผู้ใช้ หรือข้อมูลการสมัคร',
            color: '#3498db'
        },
        'schedule_report': {
            emoji: '⏰',
            label: 'การแจ้งเกี่ยวกับเวลาการแข่ง',
            description: 'สอบถามหรือแจ้งปัญหาเกี่ยวกับตารางการแข่งขัน',
            color: '#e74c3c'
        },
        'behavior_report': {
            emoji: '⚠️',
            label: 'ติดต่อรายงานพฤติกรรมนักแข่ง',
            description: 'รายงานพฤติกรรมที่ไม่เหมาะสมของนักแข่ง',
            color: '#f39c12'
        },
        'technical_issue': {
            emoji: '🔧',
            label: 'แจ้งปัญหาทางเทคนิค',
            description: 'รายงานปัญหาเกม เซิร์ฟเวอร์ หรือปัญหาเทคนิคอื่นๆ',
            color: '#9b59b6'
        },
        'general_contact': {
            emoji: '💬',
            label: 'ติดต่อเรื่องอื่นๆ',
            description: 'สอบถามหรือติดต่อเรื่องทั่วไปอื่นๆ',
            color: '#2ecc71'
        }
    }
};