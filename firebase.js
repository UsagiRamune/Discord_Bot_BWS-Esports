// Create: utils/firebase.js
const admin = require('firebase-admin');

class FirebaseService {
    constructor() {
        this.db = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // For production (Render), use environment variables
            if (process.env.FIREBASE_PRIVATE_KEY) {
                const serviceAccount = {
                    type: "service_account",
                    project_id: process.env.FIREBASE_PROJECT_ID,
                    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    client_email: process.env.FIREBASE_CLIENT_EMAIL,
                    client_id: process.env.FIREBASE_CLIENT_ID,
                    auth_uri: "https://accounts.google.com/o/oauth2/auth",
                    token_uri: "https://oauth2.googleapis.com/token",
                    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
                };

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
                });
            } 
            // For local development, use service account file
            else if (process.env.NODE_ENV !== 'production') {
                const serviceAccount = require('../firebase-service-account.json');
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
                });
            } else {
                throw new Error('Firebase credentials not found');
            }

            this.db = admin.firestore();
            this.initialized = true;
            console.log('✅ Firebase initialized successfully');
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            throw error;
        }
    }

    async saveTicketData(ticketData) {
        if (!this.initialized) await this.initialize();
        
        try {
            const docRef = await this.db.collection('tickets').add({
                ...ticketData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`💾 Ticket saved to Firebase: ${docRef.id}`);
            return { success: true, docId: docRef.id };
        } catch (error) {
            console.error('Error saving ticket to Firebase:', error);
            return { success: false, error: error.message };
        }
    }

    async updateTicketStatus(ticketNumber, status, additionalData = {}) {
        if (!this.initialized) await this.initialize();
        
        try {
            const ticketQuery = await this.db.collection('tickets')
                .where('ticketNumber', '==', ticketNumber)
                .limit(1)
                .get();
            
            if (ticketQuery.empty) {
                return { success: false, error: 'Ticket not found' };
            }
            
            const ticketDoc = ticketQuery.docs[0];
            await ticketDoc.ref.update({
                status,
                ...additionalData,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`📝 Ticket #${ticketNumber} updated: ${status}`);
            return { success: true };
        } catch (error) {
            console.error('Error updating ticket status:', error);
            return { success: false, error: error.message };
        }
    }

    async getTicketStats() {
        if (!this.initialized) await this.initialize();
        
        try {
            const tickets = await this.db.collection('tickets').get();
            const stats = {
                total: tickets.size,
                open: 0,
                closed: 0,
                paused: 0,
                categories: {}
            };
            
            tickets.forEach(doc => {
                const data = doc.data();
                stats[data.status] = (stats[data.status] || 0) + 1;
                stats.categories[data.category] = (stats.categories[data.category] || 0) + 1;
            });
            
            return { success: true, stats };
        } catch (error) {
            console.error('Error getting ticket stats:', error);
            return { success: false, error: error.message };
        }
    }

    async saveTranscriptMetadata(ticketNumber, transcriptUrl, messageCount) {
        if (!this.initialized) await this.initialize();
        
        try {
            await this.db.collection('transcripts').add({
                ticketNumber,
                transcriptUrl,
                messageCount,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`📄 Transcript metadata saved for ticket #${ticketNumber}`);
            return { success: true };
        } catch (error) {
            console.error('Error saving transcript metadata:', error);
            return { success: false, error: error.message };
        }
    }

    // Get ticket counters from Firebase
    async getTicketCounters() {
        if (!this.initialized) await this.initialize();
        
        try {
            const doc = await this.db.collection('system').doc('ticketCounters').get();
            if (doc.exists) {
                return { success: true, counters: doc.data().counters };
            } else {
                // Initialize default counters
                const defaultCounters = {
                    'member_edit': 1000,
                    'schedule_report': 2000,
                    'behavior_report': 3000,
                    'technical_issue': 4000,
                    'general_contact': 5000
                };
                
                await this.db.collection('system').doc('ticketCounters').set({
                    counters: defaultCounters,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                return { success: true, counters: defaultCounters };
            }
        } catch (error) {
            console.error('Error getting ticket counters:', error);
            return { success: false, error: error.message };
        }
    }

    // Update ticket counters in Firebase
    async updateTicketCounters(counters) {
        if (!this.initialized) await this.initialize();
        
        try {
            await this.db.collection('system').doc('ticketCounters').set({
                counters,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            return { success: true };
        } catch (error) {
            console.error('Error updating ticket counters:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new FirebaseService();