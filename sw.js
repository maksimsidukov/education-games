const prefix = 'lapki:' + self.registration.scope + ':';
const cacheName = prefix + 'v3';
const atScope = path => new URL(path, self.registration.scope).href;
const indexUrl = atScope('index.html');
const colors = ['red', 'yellow', 'blue', 'green', 'purple', 'orange', 'pink', 'turquoise'];
const colorClips = ['circle', 'square', 'triangle', 'rectangle', 'star']
  .flatMap(shape => colors.map(color => 'color-' + shape + '-' + color));
const assets = new Set([
  indexUrl, atScope('styles.css'), atScope('app.mjs'), atScope('games.mjs'),
  atScope('manifest.webmanifest'), atScope('assets/meadow.jpg'),
  atScope('assets/icon-192.png'), atScope('assets/icon-512.png'),
  ...[
    ...colorClips, 'circle', 'square', 'triangle', 'rectangle', 'star',
    'cat', 'dog', 'cow', 'duck', 'frog',
    'count-1', 'count-2', 'count-3', 'count-4', 'count-5', 'pairs', 'shadows', 'retry', 'correct', 'finish',
  ].map(clip => atScope('assets/voice/' + clip + '.wav')),
]);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache =>
    cache.addAll(Array.from(assets, url => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(prefix) && name !== cacheName)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function rangeResponse(response, range) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return response;
  const data = await response.arrayBuffer();
  const start = match[1] ? Number(match[1]) : Math.max(0, data.byteLength - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), data.byteLength - 1) : data.byteLength - 1;
  if (start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + data.byteLength } });
  }
  const part = data.slice(start, end + 1);
  return new Response(part, {
    status: 206,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Type': response.headers.get('Content-Type') || 'audio/wav',
      'Content-Length': String(part.byteLength),
      'Content-Range': 'bytes ' + start + '-' + end + '/' + data.byteLength,
    },
  });
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  url.search = '';
  const resource = url.href === self.registration.scope && request.mode === 'navigate' ? indexUrl : url.href;
  if (!assets.has(resource)) return;

  event.respondWith((async () => {
    const response = await (await caches.open(cacheName)).match(resource);
    if (!response) return fetch(request);
    const range = request.headers.get('Range');
    return range && resource.endsWith('.wav') ? rangeResponse(response, range) : response;
  })());
});
