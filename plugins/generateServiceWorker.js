function generateServiceWorker({file, options} = {}) {
	// script for proposed page
	const page_script = `
		<script>
			if (navigator && navigator.serviceWorker) {
				// Register Service Worker
				navigator.serviceWorker.register(${file});
			}
		</script>
	`;

	// Sw template added to 'file'
	const sw_template = `


	`;

	// add script tag to index


	// created
}


// Listen for Install Event
self.addEventListener('install', function(event) {

	// Activate Immediately
	self.skipWaiting();

	// Cache
	event.waitUntil(caches.open('app').then(function(cache) {
		// Offline page
		cache.add(new Request('offline/index.html'));

		// Core Assets
		for (let asset of core_assets) {
			cache.add(new Request(asset));
		}

		return cache;
	}));
});

// Listen for the activate event
self.addEventListener('activate', function(event) {
	// Do Something...
});


// Listen for requests
self.addEventListener('fetch', function(event) {

	// Get the Request
	let request = event.request;

	// BUG FIX: https://stackoverflow.com/a/49719964
	if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return;

	// HTML files
	if (request.headers.get('Accept').includes('text/html')) {
		event.respondWith(
			fetch(request).then(function(response) {
				return response;
			}).catch(function(error) {
				return caches.match('offline/index.html');
			})
		);
	}
})



Gondola({
	userSettings: {
		"pass": [
			"styles",
			"admin",
			"envelope"
		],
		"service_worker": {
			file: "sw.js",
			options: {
				strategy: "local",
				offline_page: true,
				core_assets: [
					'/styles/main.css',
					'/assets/icon.svg'
				]
			}
		}
	}
}).build('drafts');