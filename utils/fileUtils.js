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

    async saveTranscript(ticketName, html) {
        try {
            const fileName = `transcript-${ticketName}-${Date.now()}.html`;
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
            const files = await fs.readdir(this.transcriptsDir);
            const transcripts = files
                .filter(file => file.endsWith('.html'))
                .map(file => ({
                    name: file,
                    path: path.join(this.transcriptsDir, file),
                    created: new Date()
                }));
            
            return { success: true, transcripts };
        } catch (error) {
            console.error('Error reading transcripts directory:', error);
            return { success: false, error: error.message };
        }
    }

    async cleanOldTranscripts(daysOld = 30) {
        try {
            const files = await fs.readdir(this.transcriptsDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            let deletedCount = 0;
            
            for (const file of files) {
                if (!file.endsWith('.html')) continue;
                
                const filePath = path.join(this.transcriptsDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime < cutoffDate) {
                    await fs.unlink(filePath);
                    deletedCount++;
                    console.log(`🗑️ Deleted old transcript: ${file}`);
                }
            }
            
            console.log(`🧹 Cleaned ${deletedCount} old transcripts`);
            return { success: true, deletedCount };
        } catch (error) {
            console.error('Error cleaning old transcripts:', error);
            return { success: false, error: error.message };
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
}

module.exports = new FileUtils();