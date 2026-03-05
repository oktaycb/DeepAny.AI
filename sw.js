const CACHE_NAME = 'tensomar-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/auth/sign-in',
    '/assets/images/tensomar-logo.png',
    '/scripts/functions.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : { title: 'Tensomar Update', body: 'New verification or system alert.' };

    const options = {
        body: data.body,
        icon: '/assets/images/tensomar-logo.png',
        badge: '/assets/images/tensomar-logo.png'
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/dashboard/panel')
    );
});
