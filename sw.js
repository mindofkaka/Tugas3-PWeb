const CACHE_NAME = 'todo-app-v1'
const APP_SHELL = ['./', './index.html', './style.css', './script.js']

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => {})))
        ).then(() => self.skipWaiting())
    )
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => 
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
        .then(() => self.clients.claim())
    )
})

self.addEventListener('fetch', (event) => {
    const req = event.request
    if(req.method !== 'GET') return 
    if(new URL(req.url).origin !== self.location.origin) return 

    event.respondWith(
        fetch(req).then((res) => {
            if(res.ok) {
                const copy = res.clone()
                caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
            }
            return res 
        }).catch(async () => {
            const hit = await caches.match(req, {ignoreSearch: true})
            if(hit) return hit 
            if(req.mode === 'navigate') {
                const page = await caches.match('./index.html')
                if(page) return page 
            }
            return Response.error()
        })
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const taskId = event.notification.data ? event.notification.data.taskId : null 

    event.waitUntil(
        (async() => {
            const windows = await self.clients.matchAll({
                type: 'window',
                includeUncontrolled: true 
            })
            if(windows.length > 0) {
                const client = windows[0]
                if('focus' in client) await client.focus()
                client.postMessage({type: 'select-task', taskId})
                return 
            }
            const url = taskId !== null && taskId !== undefined ? './?task=' + encodeURIComponent(taskId) : './'
            await self.clients.openWindow(url)
        })()
    )
})