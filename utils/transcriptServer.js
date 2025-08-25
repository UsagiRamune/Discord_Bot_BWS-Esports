const express = require('express');
const path = require('path');
const fs = require('fs').promises;

class TranscriptServer {
    constructor() {
        this.app = express();
        this.port = process.env.TRANSCRIPT_PORT || 3000;
        this.transcriptsDir = path.join(__dirname, '../transcripts');
        this.server = null;
        this.setupRoutes();
    }

    setupRoutes() {
        // Serve transcript files
        this.app.get('/transcript/:filename', async (req, res) => {
            try {
                const filename = req.params.filename;
                
                // Security check - only allow .html files and prevent path traversal
                if (!filename.endsWith('.html') || filename.includes('..') || filename.includes('/')) {
                    return res.status(400).send('Invalid filename');
                }

                const filePath = path.join(this.transcriptsDir, filename);
                
                // Check if file exists
                try {
                    await fs.access(filePath);
                } catch {
                    return res.status(404).send(`
                        <html>
                            <body style="font-family: Arial; text-align: center; padding: 50px;">
                                <h1>🔍 Transcript Not Found</h1>
                                <p>The requested transcript file could not be found.</p>
                                <p>It may have been deleted or moved.</p>
                            </body>
                        </html>
                    `);
                }

                // Read and serve the HTML file
                const htmlContent = await fs.readFile(filePath, 'utf8');
                res.setHeader('Content-Type', 'text/html');
                res.send(htmlContent);

                console.log(`📖 Transcript served: ${filename}`);
            } catch (error) {
                console.error('Error serving transcript:', error);
                res.status(500).send(`
                    <html>
                        <body style="font-family: Arial; text-align: center; padding: 50px;">
                            <h1>❌ Error</h1>
                            <p>An error occurred while loading the transcript.</p>
                        </body>
                    </html>
                `);
            }
        });

        // List all transcripts (for admin purposes)
        this.app.get('/transcripts', async (req, res) => {
            try {
                const files = await fs.readdir(this.transcriptsDir);
                const transcripts = files
                    .filter(file => file.endsWith('.html'))
                    .sort((a, b) => b.localeCompare(a)); // Sort newest first

                let html = `
                <html>
                <head>
                    <title>Transcript List - Thai Esports League</title>
                    <style>
                        body { font-family: Arial; padding: 20px; background: #f5f5f5; }
                        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
                        h1 { color: #5865f2; }
                        .transcript-item { padding: 10px; border: 1px solid #ddd; margin: 10px 0; border-radius: 4px; }
                        .transcript-item a { text-decoration: none; color: #5865f2; font-weight: bold; }
                        .transcript-item:hover { background: #f8f9fa; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>📋 Available Transcripts</h1>
                        <p>Total transcripts: ${transcripts.length}</p>
                `;

                for (const file of transcripts) {
                    const stats = await fs.stat(path.join(this.transcriptsDir, file));
                    html += `
                        <div class="transcript-item">
                            <a href="/transcript/${file}" target="_blank">🎫 ${file}</a>
                            <br>
                            <small>Created: ${stats.mtime.toLocaleString('th-TH')}</small>
                        </div>
                    `;
                }

                html += `
                    </div>
                </body>
                </html>`;

                res.send(html);
            } catch (error) {
                console.error('Error listing transcripts:', error);
                res.status(500).send('Error loading transcript list');
            }
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ status: 'OK', message: 'Transcript server is running' });
        });

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.send(`
                <html>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1>🎫 Thai Esports League</h1>
                    <h2>Transcript Server</h2>
                    <p>This server provides access to ticket transcripts.</p>
                    <a href="/transcripts">📋 View All Transcripts</a>
                </body>
                </html>
            `);
        });
    }

    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, () => {
                    console.log(`🌐 Transcript server running on port ${this.port}`);
                    console.log(`📖 Transcripts available at: http://localhost:${this.port}/transcript/`);
                    resolve();
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
}

// Export singleton instance
module.exports = new TranscriptServer();