import { ExtensionRSSFeedService, type RSSFeed, type RSSItem } from './ExtensionRSSFeedService';
import { browser_ext } from '$lib/common/environment';
import { log } from '$lib/managers/Logger';

export type { RSSFeed, RSSItem };

export class DynamicRSSFeedService {
	private static instance: DynamicRSSFeedService;
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000; // Start with 1 second
	private reconnectTimer: number | null = null;
	private feedUpdateCallbacks: ((feed: RSSFeed) => void)[] = [];
	private rssService: ExtensionRSSFeedService;

	private constructor() {
		this.rssService = ExtensionRSSFeedService.getInstance();
	}

	static getInstance(): DynamicRSSFeedService {
		if (!DynamicRSSFeedService.instance) {
			DynamicRSSFeedService.instance = new DynamicRSSFeedService();
		}
		return DynamicRSSFeedService.instance;
	}

	async connect(wsUrl: string): Promise<void> {
		if (this.ws?.readyState === WebSocket.OPEN) {
			return;
		}

		try {
			this.ws = new WebSocket(wsUrl);

			this.ws.onopen = () => {
				log.info('WebSocket connected', false);
				this.reconnectAttempts = 0;
				this.reconnectDelay = 1000;
			};

			this.ws.onmessage = async (event) => {
				try {
					const data = JSON.parse(event.data);

					if (data.type === 'rss_feed') {
						// Handle raw XML feed
						if (typeof data.content === 'string') {
							const feed = await this.rssService.parseRSSFeed(data.content, wsUrl);
							this.notifyFeedUpdate(feed);
						}
						// Handle pre-parsed feed object
						else if (data.content && data.content.items) {
							this.notifyFeedUpdate(data.content as RSSFeed);
						}
					}
				} catch (error) {
					log.error('Error processing WebSocket message:', false, error);
				}
			};

			this.ws.onclose = () => {
				log.warn('WebSocket connection closed', false);
				this.attemptReconnect();
			};

			this.ws.onerror = (error) => {
				log.error('WebSocket error:', false, error);
			};
		} catch (error) {
			log.error('Error connecting to WebSocket:', false, error);
			this.attemptReconnect();
		}
	}

	private attemptReconnect() {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			log.error('Max reconnection attempts reached', false);
			return;
		}

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		this.reconnectTimer = window.setTimeout(() => {
			this.reconnectAttempts++;
			this.reconnectDelay *= 2; // Exponential backoff
			this.connect(this.ws?.url || '');
		}, this.reconnectDelay);
	}

	disconnect() {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}

	onFeedUpdate(callback: (feed: RSSFeed) => void): () => void {
		this.feedUpdateCallbacks.push(callback);
		return () => {
			this.feedUpdateCallbacks = this.feedUpdateCallbacks.filter((cb) => cb !== callback);
		};
	}

	private notifyFeedUpdate(feed: RSSFeed) {
		this.feedUpdateCallbacks.forEach((callback) => callback(feed));
	}

	// Method to load the sample feed from static data
	async loadSampleFeed(): Promise<RSSFeed> {
		try {
			const response = await fetch('/src/lib/data/sample-crypto-feed.xml');
			const xmlText = await response.text();
			return await this.rssService.parseRSSFeed(xmlText, 'sample-feed');
		} catch (error) {
			log.error('Error loading sample feed:', false, error);
			throw error;
		}
	}
}
