"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEventsAndNotify = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
admin.initializeApp();
exports.checkEventsAndNotify = (0, scheduler_1.onSchedule)("every 1 minutes", async (event) => {
    const db = admin.firestore();
    const now = new Date();
    // 1. Get current time in Madrid for comparison
    const options = {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    };
    const formatter = new Intl.DateTimeFormat("en-CA", options);
    const parts = formatter.formatToParts(now);
    const currentDay = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`;
    const currentTimeStr = `${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}`;
    // Calculate threshold: 15 minutes from now
    const thresholdDate = new Date(now.getTime() + 15 * 60000);
    const thresholdParts = formatter.formatToParts(thresholdDate);
    const thresholdTime = `${thresholdParts.find(p => p.type === 'hour')?.value}:${thresholdParts.find(p => p.type === 'minute')?.value}`;
    console.log(`🔍 Checking events for ${currentDay} at ${currentTimeStr}. Threshold: ${thresholdTime}`);
    // Get all events for today
    const eventsSnapshot = await db.collection("events")
        .where("date", "==", currentDay)
        .get();
    if (eventsSnapshot.empty) {
        console.log(`📭 No events found for ${currentDay}`);
        return;
    }
    console.log(`📅 Found ${eventsSnapshot.docs.length} events for today`);
    // Helper function to convert time string to minutes since midnight
    const timeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };
    const currentMinutes = timeToMinutes(currentTimeStr);
    // Filter events that are within the notification window
    const activeEvents = eventsSnapshot.docs.filter(doc => {
        const data = doc.data();
        const eventMinutes = timeToMinutes(data.time);
        // Calculate minutes until event
        const minutesUntilEvent = eventMinutes - currentMinutes;
        // Event should be between now and 15 minutes from now
        const isInWindow = minutesUntilEvent >= 0 && minutesUntilEvent <= 15;
        const notDismissed = data.dismissed !== true;
        // Only notify at specific intervals: 15, 10, and 5 minutes before
        const shouldNotify = minutesUntilEvent === 15 || minutesUntilEvent === 10 || minutesUntilEvent === 5;
        console.log(`📌 Event "${data.title}" at ${data.time}: minutesUntil=${minutesUntilEvent}, shouldNotify=${shouldNotify}, notDismissed=${notDismissed}`);
        return isInWindow && notDismissed && shouldNotify;
    });
    if (activeEvents.length === 0) {
        console.log(`⏰ No active events in notification window`);
        return;
    }
    console.log(`✅ ${activeEvents.length} events ready for notification`);
    // Get FCM tokens
    const tokensSnapshot = await db.collection("fcmTokens").get();
    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
    if (tokens.length === 0) {
        console.error(`❌ No FCM tokens found! Users need to register their devices.`);
        return;
    }
    console.log(`📱 Found ${tokens.length} registered device(s)`);
    // Send notifications
    for (const doc of activeEvents) {
        const eventData = doc.data();
        const eventMinutes = timeToMinutes(eventData.time);
        const minutesUntilEvent = eventMinutes - currentMinutes;
        // Customize message based on how far away the event is
        let bodyMessage = "";
        if (minutesUntilEvent === 15) {
            bodyMessage = `⏰ En 15 minutos (${eventData.time}). Pulsa para silenciar.`;
        }
        else if (minutesUntilEvent === 10) {
            bodyMessage = `⏰ En 10 minutos (${eventData.time}). Pulsa para silenciar.`;
        }
        else if (minutesUntilEvent === 5) {
            bodyMessage = `🔔 ¡ÚLTIMO AVISO! En 5 minutos (${eventData.time})`;
        }
        const msg = {
            notification: {
                title: `🔔 DLKOM: ${eventData.title}`,
                body: bodyMessage,
                imageUrl: "https://dlkomapp.web.app/pwa-192x192.png"
            },
            data: {
                eventId: doc.id,
                url: `/?eventId=${doc.id}`
            },
            android: {
                priority: "high",
                notification: {
                    sound: "default",
                    defaultSound: true,
                    notificationPriority: "PRIORITY_MAX",
                    visibility: "public",
                    tag: doc.id
                }
            },
            tokens: tokens
        };
        try {
            const response = await admin.messaging().sendEachForMulticast(msg);
            console.log(`✅ Notification sent for event "${eventData.title}" (${minutesUntilEvent} min before). Success: ${response.successCount}, Failure: ${response.failureCount}`);
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        console.error(`❌ Failed to send to token ${idx}: ${resp.error}`);
                    }
                });
            }
        }
        catch (error) {
            console.error(`❌ Error sending notification for event ${doc.id}:`, error);
        }
    }
});
//# sourceMappingURL=index.js.map