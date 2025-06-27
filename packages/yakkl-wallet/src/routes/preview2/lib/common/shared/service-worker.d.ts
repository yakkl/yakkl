// src/types/service-worker.d.ts
interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
	// Add any service worker specific properties you need
}

interface Window {
	browser?: any;
}

interface Chrome {
	runtime?: any;
	devtools?: any;
}

declare var chrome: Chrome;
