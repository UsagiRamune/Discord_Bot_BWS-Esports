# Thai Esports League - Discord Ticket Bot

A professional Discord ticket system with Firebase integration, scheduled operations (6 AM - 12 AM Bangkok time), and web-based transcript viewing.

## Features

- **Structured Ticket System** with numbered tickets (1001, 2001, etc.)
- **Firebase Integration** for persistent data storage
- **Scheduled Operations** (6 AM - 12 AM Bangkok timezone)
- **Web Transcript Server** with direct links
- **Multi-category Support** (5 predefined categories)
- **Staff Controls** (pause, close, manage tickets)
- **Auto-generated HTML Transcripts**
- **Production Ready** for deployment

## Project Structure

```
thai-esports-ticket-bot/
├── config/
│   └── config.js              # Bot configuration
├── handlers/
│   ├── eventHandler.js        # Discord events
│   └── ticketHandler.js       # Ticket interactions
├── utils/
│   ├── firebase.js           # Firebase integration
│   ├── ticketCounter.js      # Ticket numbering
│   ├── ticketManager.js      # Ticket management
│   ├── scheduleManager.js    # Operating hours
│   ├── fileUtils.js          # File operations
│   └── transcriptServer.js   # Web server
├── transcripts/              # Auto-generated HTML files
├── data/                     # JSON data storage
├── index.js                  # Main bot file
├── package.json              # Dependencies
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
└── README.md                 # This file
```

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repository>
cd thai-esports-ticket-bot
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required Variables:**
```env
BOT_TOKEN=your_discord_bot_token
```

**Optional Variables:**
```env
GUILD_ID=your_server_id
STAFF_ROLE_ID=your_staff_role_id
TICKET_CATEGORY_ID=your_category_id
LOG_CHANNEL_ID=your_log_channel_id
```

### 3. Firebase Setup (Optional but Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Firestore Database
4. Generate service account key
5. Add Firebase environment variables to `.env`

### 4. Run the Bot

```bash
# Development
npm run dev

# Production
npm start
```

## Discord Bot Setup

### 1. Create Bot Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Go to "Bot" section
4. Create bot and copy token
5. Enable required intents:
   - Guilds
   - Guild Messages
   - Message Content

### 2. Bot Permissions

Required permissions (integer: `377957122112`):
- View Channels
- Send Messages
- Manage Messages
- Read Message History
- Manage Channels
- Attach Files
- Use Slash Commands

### 3. Invite Bot to Server

Use this URL format:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=377957122112&scope=bot
```

## Deployment to Render

### 1. Connect GitHub

1. Push your code to GitHub
2. Go to [Render Dashboard](https://render.com)
3. Create new "Web Service"
4. Connect your GitHub repository

### 2. Render Configuration

**Build Command:** `npm install`
**Start Command:** `npm start`
**Environment:** `Node`
**Region:** Choose closest to your users

### 3. Environment Variables

Add these in Render dashboard:

```
BOT_TOKEN=your_discord_bot_token
GUILD_ID=your_server_id
STAFF_ROLE_ID=your_staff_role_id
TICKET_CATEGORY_ID=your_category_id
LOG_CHANNEL_ID=your_log_channel_id

# Firebase (extract from your service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxx

# Render specific
TRANSCRIPT_PORT=10000
TRANSCRIPT_BASE_URL=https://your-app-name.onrender.com
NODE_ENV=production
```

### 4. Deploy

Render will automatically deploy when you push to your main branch.

## Bot Commands

### User Commands
- Ticket creation via dropdown menu (no commands needed)

### Staff Commands
- `!setup-tickets` - Create ticket panel (Admin only)
- `!ticket-stats` - View active ticket statistics
- `!ticket-counters` - View ticket numbering statistics
- `!firebase-status` - Check Firebase connection (Admin only)
- `!force-close` - Force close current ticket (Admin only)
- `!reset-counters` - Reset ticket counters (Admin only)

### System Features
- **Auto-pause** paused ticket users from messaging
- **Operating hours** enforcement (6 AM - 12 AM Bangkok)
- **Graceful shutdown** warnings before closing hours
- **Auto-transcript** generation on ticket close
- **Web interface** for viewing transcripts

## Ticket Numbering System

- **Category 1** (member_edit): 1001, 1002, 1003...
- **Category 2** (schedule_report): 2001, 2002, 2003...
- **Category 3** (behavior_report): 3001, 3002, 3003...
- **Category 4** (technical_issue): 4001, 4002, 4003...
- **Category 5** (general_contact): 5001, 5002, 5003...

## Web Transcript Server

Access transcripts at: `https://your-app.onrender.com/transcripts`

Features:
- **Archive browser** with search and statistics
- **Direct transcript links** for sharing
- **Responsive design** works on mobile
- **Security** prevents path traversal attacks

## Operating Schedule

**Default Hours:** 6:00 AM - 12:00 AM (Bangkok Time)

**Outside Hours:**
- Bot status changes to "Do Not Disturb"
- New ticket creation disabled
- Existing tickets remain accessible
- Staff can override restrictions

**Customize Hours:**
```env
START_HOUR=6    # 6 AM
END_HOUR=24     # 12 AM (midnight)
TIMEZONE=Asia/Bangkok
```

## Firebase Data Structure

```
tickets/
├── {documentId}
│   ├── ticketNumber: 1001
│   ├── category: "member_edit"
│   ├── userId: "123456789"
│   ├── status: "open|closed|paused"
│   ├── createdAt: timestamp
│   └── ...

system/
└── ticketCounters
    └── counters
        ├── member_edit: 1001
        ├── schedule_report: 2002
        └── ...

transcripts/
├── {documentId}
│   ├── ticketNumber: 1001
│   ├── transcriptUrl: "https://..."
│   └── messageCount: 15
```

## Troubleshooting

### Bot Not Responding
1. Check bot token is correct
2. Verify bot has required permissions
3. Check Discord API status
4. Review console logs for errors

### Firebase Issues
1. Verify all environment variables are set
2. Check Firebase project settings
3. Ensure Firestore is enabled
4. Bot continues working without Firebase

### Transcript Server Issues
1. Check TRANSCRIPT_PORT is available
2. Verify file system permissions
3. Check transcript directory exists
4. Review server logs

### Render Deployment Issues
1. Check build logs for errors
2. Verify all environment variables
3. Ensure start command is correct
4. Check Render service status

## Security Notes

- **Never commit** `firebase-service-account.json` to Git
- **Use environment variables** for all sensitive data
- **Firebase rules** should deny public access
- **Transcript server** includes security headers
- **File access** is restricted and validated

## Support

For issues or questions:
1. Check console logs first
2. Verify environment variables
3. Test Firebase connection
4. Check Discord bot permissions
5. Review Render deployment logs

## License

MIT License - Feel free to modify and use for your league.

---

**Thai Esports League Ticket Bot v1.0**
*Built for professional esports support operations*