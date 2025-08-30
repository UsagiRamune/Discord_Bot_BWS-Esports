const fs = require('fs').promises;
const path = require('path');

class FileUtils {
    constructor() {
        this.transcriptsDir = path.join(__dirname, '../transcripts');
        this.ensureTranscriptsDirectory();
    }

    async ensureTranscriptsDirectory() {
        try {
            await fs.access(this.transcriptsDir);
        } catch (error) {
            // Directory doesn't exist, create it
            await fs.mkdir(this.transcriptsDir, { recursive: true });
            console.log('📁 Created transcripts directory');
        }
    }

    async saveTranscript(ticketName, html, ticketNumber = null) {
        try {
            const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const fileName = ticketNumber ? 
                `transcript-${ticketNumber}-${timestamp}.html` : 
                `transcript-${ticketName}-${Date.now()}.html`;
            const filePath = path.join(this.transcriptsDir, fileName);
            
            await fs.writeFile(filePath, html, 'utf8');
            console.log(`💾 Transcript saved: ${fileName}`);
            
            return { success: true, fileName, filePath };
        } catch (error) {
            console.error('Error saving transcript:', error);
            return { success: false, error: error.message };
        }
    }

    async getTranscriptsList() {
        try {
            await this.ensureTranscriptsDirectory();
            const files = await fs.readdir(this.transcriptsDir);
            const transcripts = [];
            
            for (const file of files) {
                if (file.endsWith('.html')) {
                    try {
                        const filePath = path.join(this.transcriptsDir, file);
                        const stats = await fs.stat(filePath);
                        transcripts.push({
                            name: file,
                            path: filePath,
                            created: stats.mtime,
                            size: stats.size
                        });
                    } catch (error) {
                        console.error(`Error getting stats for ${file}:`, error);
                    }
                }
            }
            
            // Sort by creation date, newest first
            transcripts.sort((a, b) => b.created - a.created);
            
            return { success: true, transcripts };
        } catch (error) {
            console.error('Error reading transcripts directory:', error);
            return { success: false, error: error.message };
        }
    }

    async cleanOldTranscripts(daysOld = 30) {
        try {
            await this.ensureTranscriptsDirectory();
            const files = await fs.readdir(this.transcriptsDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            let deletedCount = 0;
            let totalSize = 0;
            
            for (const file of files) {
                if (!file.endsWith('.html')) continue;
                
                try {
                    const filePath = path.join(this.transcriptsDir, file);
                    const stats = await fs.stat(filePath);
                    
                    if (stats.mtime < cutoffDate) {
                        totalSize += stats.size;
                        await fs.unlink(filePath);
                        deletedCount++;
                        console.log(`🗑️ Deleted old transcript: ${file}`);
                    }
                } catch (error) {
                    console.error(`Error processing file ${file}:`, error);
                }
            }
            
            const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
            console.log(`🧹 Cleaned ${deletedCount} old transcripts (${sizeMB} MB freed)`);
            return { success: true, deletedCount, sizeFreed: totalSize };
        } catch (error) {
            console.error('Error cleaning old transcripts:', error);
            return { success: false, error: error.message };
        }
    }

    async getTranscriptContent(filename) {
        try {
            // Security check
            if (!filename.endsWith('.html') || filename.includes('..') || filename.includes('/')) {
                return { success: false, error: 'Invalid filename' };
            }

            const filePath = path.join(this.transcriptsDir, filename);
            
            // Check if file exists
            try {
                await fs.access(filePath);
            } catch {
                return { success: false, error: 'File not found' };
            }

            const content = await fs.readFile(filePath, 'utf8');
            return { success: true, content };
        } catch (error) {
            console.error('Error reading transcript:', error);
            return { success: false, error: error.message };
        }
    }

    async getDirectoryStats() {
        try {
            const result = await this.getTranscriptsList();
            if (!result.success) return result;

            const stats = {
                totalFiles: result.transcripts.length,
                totalSize: 0,
                oldestFile: null,
                newestFile: null
            };

            for (const transcript of result.transcripts) {
                stats.totalSize += transcript.size;
                
                if (!stats.oldestFile || transcript.created < stats.oldestFile.created) {
                    stats.oldestFile = transcript;
                }
                
                if (!stats.newestFile || transcript.created > stats.newestFile.created) {
                    stats.newestFile = transcript;
                }
            }

            stats.totalSizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);

            return { success: true, stats };
        } catch (error) {
            console.error('Error getting directory stats:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new FileUtils();