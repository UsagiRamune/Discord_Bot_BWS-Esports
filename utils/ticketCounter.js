// Create new file: utils/ticketCounter.js
const fs = require('fs').promises;
const path = require('path');

class TicketCounter {
    constructor() {
        this.counterFile = path.join(__dirname, '../data/ticket_counters.json');
        this.counters = {};
        this.categoryMapping = {
            'member_edit': 1,        // 1xxx
            'schedule_report': 2,    // 2xxx
            'behavior_report': 3,    // 3xxx
            'technical_issue': 4,    // 4xxx
            'general_contact': 5     // 5xxx
        };
        this.ensureDataDirectory();
        this.loadCounters();
    }

    async ensureDataDirectory() {
        try {
            const dataDir = path.join(__dirname, '../data');
            await fs.mkdir(dataDir, { recursive: true });
        } catch (error) {
            console.error('Error creating data directory:', error);
        }
    }

    async loadCounters() {
        try {
            const data = await fs.readFile(this.counterFile, 'utf8');
            this.counters = JSON.parse(data);
            console.log('📊 Loaded ticket counters:', this.counters);
        } catch (error) {
            // File doesn't exist, initialize with default values
            this.counters = {};
            for (const [category, prefix] of Object.entries(this.categoryMapping)) {
                this.counters[category] = prefix * 1000; // Start at 1000, 2000, etc.
            }
            await this.saveCounters();
            console.log('📊 Initialized new ticket counters:', this.counters);
        }
    }

    async saveCounters() {
        try {
            await fs.writeFile(this.counterFile, JSON.stringify(this.counters, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving ticket counters:', error);
        }
    }

    async getNextTicketNumber(category) {
        if (!this.categoryMapping[category]) {
            throw new Error(`Unknown ticket category: ${category}`);
        }

        // Increment counter for this category
        this.counters[category] = (this.counters[category] || (this.categoryMapping[category] * 1000)) + 1;
        
        // Save to file
        await this.saveCounters();
        
        return this.counters[category];
    }

    getCategoryFromTicketNumber(ticketNumber) {
        const prefix = Math.floor(ticketNumber / 1000);
        for (const [category, categoryPrefix] of Object.entries(this.categoryMapping)) {
            if (categoryPrefix === prefix) {
                return category;
            }
        }
        return null;
    }

    getStats() {
        const stats = {};
        for (const [category, count] of Object.entries(this.counters)) {
            const baseCount = this.categoryMapping[category] * 1000;
            stats[category] = {
                total: count - baseCount,
                current: count,
                next: count + 1
            };
        }
        return stats;
    }

    // Reset counters (admin only - for testing)
    async resetCounters() {
        this.counters = {};
        for (const [category, prefix] of Object.entries(this.categoryMapping)) {
            this.counters[category] = prefix * 1000;
        }
        await this.saveCounters();
        console.log('🔄 Reset all ticket counters');
        return this.counters;
    }
}

module.exports = new TicketCounter();