// Updated utils/ticketCounter.js
const firebase = require('./firebase');

class TicketCounter {
    constructor() {
        this.counters = {};
        this.categoryMapping = {
            'member_edit': 1,        // 1xxx
            'schedule_report': 2,    // 2xxx
            'behavior_report': 3,    // 3xxx
            'technical_issue': 4,    // 4xxx
            'general_contact': 5     // 5xxx
        };
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            const result = await firebase.getTicketCounters();
            if (result.success) {
                this.counters = result.counters;
                console.log('📊 Loaded ticket counters from Firebase:', this.counters);
            } else {
                throw new Error(result.error);
            }
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing ticket counter:', error);
            // Fallback to default values if Firebase fails
            this.counters = {};
            for (const [category, prefix] of Object.entries(this.categoryMapping)) {
                this.counters[category] = prefix * 1000;
            }
            this.initialized = true;
        }
    }

    async getNextTicketNumber(category) {
        if (!this.initialized) await this.initialize();
        
        if (!this.categoryMapping[category]) {
            throw new Error(`Unknown ticket category: ${category}`);
        }

        // Increment counter for this category
        this.counters[category] = (this.counters[category] || (this.categoryMapping[category] * 1000)) + 1;
        
        // Save to Firebase
        try {
            await firebase.updateTicketCounters(this.counters);
            console.log(`📈 Updated counter for ${category}: ${this.counters[category]}`);
        } catch (error) {
            console.error('Error saving counter to Firebase:', error);
            // Continue anyway, better to have ticket with potentially duplicate number than no ticket
        }
        
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

    async getStats() {
        if (!this.initialized) await this.initialize();
        
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
        
        try {
            await firebase.updateTicketCounters(this.counters);
            console.log('🔄 Reset all ticket counters in Firebase');
        } catch (error) {
            console.error('Error resetting counters in Firebase:', error);
        }
        
        return this.counters;
    }
}

module.exports = new TicketCounter();