/* Only public installation/offline assets are cached. APIs and account data always use the network. */
const CACHE='neon-radar-offline-v1';
const OFFLINE='/offline.html';
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([OFFLINE,'/icons/icon-192.png'])).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('neon-radar-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).catch(async()=>await caches.match(OFFLINE)||Response.error()));
 }else if(url.pathname==='/icons/icon-192.png'){
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
 }
});
