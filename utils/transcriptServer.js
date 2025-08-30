const express = require('express');
const path = require('path');
const fileUtils = require('./fileUtils');

class TranscriptServer {
    constructor() {
        this.app = express();
        this.port = process.env.TRANSCRIPT_PORT || 10000; // Default to 10000 for Render
        this.server = null;
        this.setupRoutes();
    }

    setupRoutes() {
        // Health check endpoint (required by most hosting services)
        this.app.get('/health', (req, res) => {
            res.status(200).json({ 
                status: 'OK', 
                message: 'Thai Esports League Transcript Server',
                timestamp: new Date().toISOString()
            });
        });

        // Serve transcript files
        this.app.get('/transcript/:filename', async (req, res) => {
            try {
                const filename = req.params.filename;
                console.log(`📖 Transcript request: ${filename}`);
                
                const result = await fileUtils.getTranscriptContent(filename);
                
                if (!result.success) {
                    if (result.error === 'File not found') {
                        return res.status(404).send(`
                            <html>
                                <head>
                                    <title>Transcript Not Found</title>
                                    <style>
                                        body { 
                                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                                            background: #36393f; 
                                            color: #dcddde; 
                                            text-align: center; 
                                            padding: 50px; 
                                            margin: 0;
                                        }
                                        .container { 
                                            max-width: 600px; 
                                            margin: 0 auto; 
                                            background: #2f3136; 
                                            padding: 40px; 
                                            border-radius: 8px; 
                                        }
                                        h1 { color: #faa61a; margin: 0 0 20px 0; }
                                        p { line-height: 1.6; margin-bottom: 15px; }
                                        .back-link { 
                                            color: #5865f2; 
                                            text-decoration: none; 
                                            font-weight: 600; 
                                        }
                                        .back-link:hover { text-decoration: underline; }
                                    </style>
                                </head>
                                <body>
                                    <div class="container">
                                        <h1>🔍 Transcript Not Found</h1>
                                        <p>The requested transcript file could not be found.</p>
                                        <p>It may have been deleted, moved, or never existed.</p>
                                        <p><a href="/transcripts" class="back-link">← Back to Transcript List</a></p>
                                    </div>
                                </body>
                            </html>
                        `);
                    }
                    
                    return res.status(400).send(`
                        <html>
                            <head>
                                <title>Invalid Request</title>
                                <style>
                                    body { 
                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                                        background: #36393f; 
                                        color: #dcddde; 
                                        text-align: center; 
                                        padding: 50px; 
                                    }
                                </style>
                            </head>
                            <body>
                                <h1>❌ Invalid Request</h1>
                                <p>${result.error}</p>
                            </body>
                        </html>
                    `);
                }

                // Set proper content type and security headers
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('X-Content-Type-Options', 'nosniff');
                res.setHeader('X-Frame-Options', 'SAMEORIGIN');
                
                res.send(result.content);
                
                console.log(`✅ Transcript served successfully: ${filename}`);
            } catch (error) {
                console.error('Error serving transcript:', error);
                res.status(500).send(`
                    <html>
                        <head>
                            <title>Server Error</title>
                            <style>
                                body { 
                                    font-family: Arial, sans-serif; 
                                    background: #36393f; 
                                    color: #dcddde; 
                                    text-align: center; 
                                    padding: 50px; 
                                }
                            </style>
                        </head>
                        <body>
                            <h1>❌ Server Error</h1>
                            <p>An error occurred while loading the transcript.</p>
                        </body>
                    </html>
                `);
            }
        });

        // List all transcripts (admin interface)
        this.app.get('/transcripts', async (req, res) => {
            try {
                const result = await fileUtils.getTranscriptsList();
                const statsResult = await fileUtils.getDirectoryStats();
                
                if (!result.success) {
                    throw new Error(result.error);
                }

                const transcripts = result.transcripts;
                const stats = statsResult.success ? statsResult.stats : null;

                let html = `
                <html>
                <head>
                    <title>Transcript Archive - Thai Esports League</title>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                            background: #36393f; 
                            color: #dcddde; 
                            padding: 20px; 
                            margin: 0;
                            line-height: 1.6;
                        }
                        .container { 
                            max-width: 1000px; 
                            margin: 0 auto; 
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 30px;
                            padding: 30px;
                            background: linear-gradient(135deg, #5865f2, #3b4cca);
                            border-radius: 8px;
                            color: white;
                        }
                        h1 { 
                            color: white; 
                            margin: 0 0 10px 0; 
                            font-size: 2em;
                        }
                        .stats {
                            background: #2f3136;
                            padding: 20px;
                            border-radius: 8px;
                            margin-bottom: 30px;
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                            gap: 15px;
                        }
                        .stat-item {
                            text-align: center;
                            padding: 15px;
                            background: #40444b;
                            border-radius: 6px;
                        }
                        .stat-number {
                            font-size: 1.5em;
                            font-weight: bold;
                            color: #5865f2;
                        }
                        .stat-label {
                            font-size: 0.9em;
                            color: #b9bbbe;
                            margin-top: 5px;
                        }
                        .transcript-list {
                            background: #2f3136;
                            border-radius: 8px;
                            overflow: hidden;
                        }
                        .transcript-item { 
                            padding: 15px 20px; 
                            border-bottom: 1px solid #40444b; 
                            transition: background-color 0.2s;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                        }
                        .transcript-item:hover { 
                            background: #40444b; 
                        }
                        .transcript-item:last-child {
                            border-bottom: none;
                        }
                        .transcript-info {
                            flex: 1;
                        }
                        .transcript-item a { 
                            text-decoration: none; 
                            color: #5865f2; 
                            font-weight: 600;
                            font-size: 1.1em;
                        }
                        .transcript-item a:hover { 
                            text-decoration: underline; 
                        }
                        .transcript-meta {
                            font-size: 0.9em;
                            color: #b9bbbe;
                            margin-top: 5px;
                        }
                        .transcript-size {
                            color: #72767d;
                            font-size: 0.8em;
                            background: #40444b;
                            padding: 4px 8px;
                            border-radius: 4px;
                        }
                        .no-transcripts {
                            text-align: center;
                            padding: 50px;
                            color: #72767d;
                        }
                        .refresh-btn {
                            background: #5865f2;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            margin-left: 10px;
                        }
                        .refresh-btn:hover {
                            background: #4752c4;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎫 Thai Esports League</h1>
                            <p>Ticket Transcript Archive</p>
                        </div>`;

                if (stats) {
                    html += `
                        <div class="stats">
                            <div class="stat-item">
                                <div class="stat-number">${stats.totalFiles}</div>
                                <div class="stat-label">Total Transcripts</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${stats.totalSizeMB} MB</div>
                                <div class="stat-label">Storage Used</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${stats.newestFile ? new Date(stats.newestFile.created).toLocaleDateString('th-TH') : 'N/A'}</div>
                                <div class="stat-label">Latest Transcript</div>
                            </div>
                        </div>`;
                }

                html += `<div class="transcript-list">`;

                if (transcripts.length === 0) {
                    html += `
                        <div class="no-transcripts">
                            <h3>📭 No Transcripts Found</h3>
                            <p>No transcript files are currently available.</p>
                        </div>`;
                } else {
                    for (const transcript of transcripts) {
                        const sizeKB = Math.round(transcript.size / 1024);
                        const createdDate = new Date(transcript.created);
                        
                        html += `
                            <div class="transcript-item">
                                <div class="transcript-info">
                                    <div>
                                        <a href="/transcript/${transcript.name}" target="_blank">
                                            🎫 ${transcript.name}
                                        </a>
                                    </div>
                                    <div class="transcript-meta">
                                        Created: ${createdDate.toLocaleString('th-TH', {timeZone: 'Asia/Bangkok'})}
                                    </div>
                                </div>
                                <div class="transcript-size">
                                    ${sizeKB} KB
                                </div>
                            </div>`;
                    }
                }

                html += `
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px; padding: 20px;">
                            <button class="refresh-btn" onclick="window.location.reload()">🔄 Refresh</button>
                            <div style="margin-top: 15px; font-size: 0.9em; color: #72767d;">
                                Last updated: ${new Date().toLocaleString('th-TH', {timeZone: 'Asia/Bangkok'})}
                            </div>
                        </div>
                    </div>
                </body>
                </html>`;

                res.send(html);
            } catch (error) {
                console.error('Error listing transcripts:', error);
                res.status(500).send(`
                    <html>
                        <body style="font-family: Arial; text-align: center; padding: 50px; background: #36393f; color: #dcddde;">
                            <h1>❌ Error Loading Transcript List</h1>
                            <p>An error occurred while loading the transcript archive.</p>
                        </body>
                    </html>
                `);
            }
        });

        // Root endpoint - redirect to transcripts list
        this.app.get('/', (req, res) => {
            res.redirect('/transcripts');
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).send(`
                <html>
                    <head>
                        <title>Page Not Found</title>
                        <style>
                            body { 
                                font-family: Arial, sans-serif; 
                                background: #36393f; 
                                color: #dcddde; 
                                text-align: center; 
                                padding: 50px; 
                            }
                            .container { 
                                max-width: 500px; 
                                margin: 0 auto; 
                                background: #2f3136; 
                                padding: 30px; 
                                border-radius: 8px; 
                            }
                            a { color: #5865f2; text-decoration: none; }
                            a:hover { text-decoration: underline; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>🔍 Page Not Found</h1>
                            <p>The requested page could not be found.</p>
                            <p><a href="/transcripts">← Go to Transcript Archive</a></p>
                        </div>
                    </body>
                </html>
            `);
        });
    }

    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, '0.0.0.0', () => {
                    console.log(`🌐 Transcript server running on port ${this.port}`);
                    console.log(`📖 Access transcripts at: http://localhost:${this.port}/transcripts`);
                    if (process.env.TRANSCRIPT_BASE_URL) {
                        console.log(`🔗 Public URL: ${process.env.TRANSCRIPT_BASE_URL}/transcripts`);
                    }
                    resolve();
                });

                this.server.on('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        console.error(`❌ Port ${this.port} is already in use`);
                    } else {
                        console.error('❌ Transcript server error:', error);
                    }
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    console.log('🛑 Transcript server stopped');
                    resolve();
                });
            });
        }
    }

    getTranscriptUrl(filename) {
        const baseUrl = process.env.TRANSCRIPT_BASE_URL || `http://localhost:${this.port}`;
        return `${baseUrl}/transcript/${filename}`;
    }

    getArchiveUrl() {
        const baseUrl = process.env.TRANSCRIPT_BASE_URL || `http://localhost:${this.port}`;
        return `${baseUrl}/transcripts`;
    }
}

module.exports = new TranscriptServer();