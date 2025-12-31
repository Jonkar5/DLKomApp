importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// This config should match your firebase.ts config
const firebaseConfig = {
    apiKey: "AIzaSyCFlI3yuIsQmmFbNxRCmNHCELcVGv7RQQg",
    authDomain: "dlkomapp.firebaseapp.com",
    projectId: "dlkomapp",
    storageBucket: "dlkomapp.firebasestorage.app",
    messagingSenderId: "1031659070634",
    appId: "1:1031659070634:web:60c0bba32148b7ef4e1cd3"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.image || '/pwa-192x192.png',
        badge: '/pwa-192x192.png', // Icono pequeño en la barra
        vibrate: [200, 100, 200],
        tag: payload.data ? payload.data.eventId : 'dlkom-event',
        data: {
            url: payload.data ? `/?eventId=${payload.data.eventId}` : '/',
            eventId: payload.data ? payload.data.eventId : null
        },
        actions: [
            { action: 'open', title: 'Ver Evento' }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Lógica para que al pulsar la notificación se abra la PWA instalada
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Get the eventId from the notification data
    const eventId = event.notification.data ? event.notification.data.eventId : null;
    const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there is already a window open with our app
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                // If the app is open, navigate it to the target URL and focus
                if ('navigate' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            return clients.openWindow(targetUrl);
        })
    );
});
