// ALLNIGHT 서비스 워커 — 설치 가능(PWA) + 오프라인 안내 화면만 담당한다.
// 의도적으로 최소 기능: API·Supabase·카카오 지도·로그인 요청은 가로채지 않고 항상 네트워크로 보낸다.
// 그래서 영업 정보가 오래된 캐시로 보이거나 로그인·제보가 깨질 일이 없다.
const CACHE = "allnight-shell-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // 페이지 이동(GET, 같은 사이트)만 다룬다. 실패(오프라인)했을 때만 안내 화면을 보여준다.
  if (req.method !== "GET" || req.mode !== "navigate") return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
});
