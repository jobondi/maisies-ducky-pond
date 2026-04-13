// Service Worker — network-first for HTML/JS, cache-first for fonts/images
var CACHE_NAME = 'ducky-pond-v2';
var ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/game-engine.js',
  '/js/game-ui.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/ducks/queen.svg',
  '/icons/ducks/pirate.svg',
  '/icons/ducks/chef.svg',
  '/icons/ducks/devil.svg',
  '/icons/ducks/wizard.svg',
  '/icons/ducks/firefighter.svg',
  '/icons/ducks/cowboy.svg',
  '/icons/ducks/princess.svg',
  '/icons/ducks/superhero.svg',
  '/icons/ducks/astronaut.svg',
  '/icons/ducks/rocker.svg',
  '/icons/ducks/surfer.svg',
  '/icons/ducks/ninja.svg',
  '/icons/ducks/spooky.svg',
  '/icons/ducks/doctor.svg',
  '/icons/ducks/unicorn.svg',
  '/icons/ducks/dragon.svg',
  '/icons/ducks/mermaid.svg',
  '/icons/ducks/robot.svg',
  '/icons/ducks/froggy.svg',
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function () {
        return caches.match(event.request);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request).then(function (response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
        return response;
      });
    })
  );
});
