import { writable, derived, get } from 'svelte/store';
import { ViewCacheManager } from '$lib/managers/ViewCacheManager';
import type { ViewCache, ViewUpdateNotification } from '$lib/managers/ViewCacheManager';
import type { TokenDisplay, TransactionDisplay } from '$lib/types';
import type { YakklAccount } from '$lib/common/interfaces';
import { selectedNetwork } from './network.store';
import { currentAccount } from './account.store';
import { log } from '$lib/common/logger-wrapper';

/**
 * View state types
 */
export interface ViewState {
	currentView: ViewType;
	splitView: boolean;
	secondaryView: ViewType | null;
	viewHistory: ViewType[];
	isRefreshing: boolean;
	lastRefresh: Date | null;
	preferences: ViewPreferences;
	cache: ViewCacheState;
	filters: ViewFilters;
}

export type ViewType = 'dashboard' | 'accounts' | 'tokens' | 'transactions' | 'watchlist' | 'networks' | 'settings';

export interface ViewPreferences {
	defaultView: ViewType;
	autoRefreshInterval: number; // in seconds, 0 = disabled
	showNotifications: boolean;
	compactMode: boolean;
	theme: 'light' | 'dark' | 'auto';
	[viewType: string]: any; // View-specific preferences
}

export interface ViewCacheState {
	accounts: YakklAccount[];
	tokens: TokenDisplay[];
	transactions: TransactionDisplay[];
	watchlist: TokenDisplay[];
	lastUpdated: Record<ViewType, Date | null>;
}

export interface ViewFilters {
	global: {
		chainId?: number;
		accountAddress?: string;
		dateRange?: 'all' | 'today' | 'week' | 'month' | 'year';
	};
	tokens: {
		search: string;
		sortBy: 'name' | 'value' | 'price' | 'change';
		sortOrder: 'asc' | 'desc';
		viewMode: 'grid' | 'list';
		showZeroBalances: boolean;
	};
	transactions: {
		search: string;
		type: 'all' | 'sent' | 'received' | 'contract' | 'swap' | 'failed';
		status: 'all' | 'pending' | 'confirmed' | 'failed';
		limit: number;
	};
	watchlist: {
		search: string;
		sortBy: 'name' | 'price' | 'change' | 'added';
		showAlerts: boolean;
	};
}

/**
 * Initial state
 */
const initialState: ViewState = {
	currentView: 'dashboard',
	splitView: false,
	secondaryView: null,
	viewHistory: ['dashboard'],
	isRefreshing: false,
	lastRefresh: null,
	preferences: {
		defaultView: 'dashboard',
		autoRefreshInterval: 30,
		showNotifications: true,
		compactMode: false,
		theme: 'auto'
	},
	cache: {
		accounts: [],
		tokens: [],
		transactions: [],
		watchlist: [],
		lastUpdated: {
			dashboard: null,
			accounts: null,
			tokens: null,
			transactions: null,
			watchlist: null,
			networks: null,
			settings: null
		}
	},
	filters: {
		global: {},
		tokens: {
			search: '',
			sortBy: 'value',
			sortOrder: 'desc',
			viewMode: 'list',
			showZeroBalances: false
		},
		transactions: {
			search: '',
			type: 'all',
			status: 'all',
			limit: 50
		},
		watchlist: {
			search: '',
			sortBy: 'added',
			showAlerts: false
		}
	}
};

/**
 * Create the view store
 */
function createViewStore() {
	const { subscribe, set, update } = writable<ViewState>(initialState);

	let viewCacheManager: ViewCacheManager | null = null;
	let autoRefreshTimer: NodeJS.Timeout | null = null;
	const updateListenerId = 'view-store';

	/**
	 * Initialize the store
	 */
	async function initialize() {
		// Load preferences from localStorage
		loadPreferences();

		// Initialize ViewCacheManager
		viewCacheManager = ViewCacheManager.getInstance();
		viewCacheManager.registerUpdateListener(handleCacheUpdate, updateListenerId);

		// Load initial data
		await refreshAllViews();

		// Start auto-refresh if enabled
		startAutoRefresh();

		log.info('[ViewStore] Initialized');
	}

	/**
	 * Load preferences from localStorage
	 */
	function loadPreferences() {
		if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
			return; // Skip during SSR
		}
		try {
			const stored = localStorage.getItem('yakkl_view_preferences');
			if (stored) {
				const prefs = JSON.parse(stored);
				update(state => ({
					...state,
					preferences: { ...state.preferences, ...prefs }
				}));
			}
		} catch (error) {
			log.error('[ViewStore] Failed to load preferences', false, error);
		}
	}

	/**
	 * Save preferences to localStorage
	 */
	function savePreferences() {
		if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
			return; // Skip during SSR
		}
		const state = get({ subscribe });
		try {
			localStorage.setItem('yakkl_view_preferences', JSON.stringify(state.preferences));
		} catch (error) {
			log.error('[ViewStore] Failed to save preferences', false, error);
		}
	}

	/**
	 * Handle cache updates from ViewCacheManager
	 */
	function handleCacheUpdate(notification: ViewUpdateNotification) {
		update(state => {
			const newState = { ...state };

			// Update last refresh time
			newState.lastRefresh = new Date();

			// Update cache timestamp for affected view
			if (notification.viewType && notification.viewType !== 'all') {
				newState.cache.lastUpdated[notification.viewType] = new Date();
			}

			// Handle specific update types
			switch (notification.event) {
				case 'balances-updated':
				case 'tokens-updated':
				case 'transactions-updated':
					// These will trigger reactive updates in components
					break;
				case 'network-changed':
				case 'account-changed':
					// Clear filters when context changes
					newState.filters.global = {
						chainId: get(selectedNetwork)?.chainId,
						accountAddress: get(currentAccount)?.address
					};
					break;
			}

			return newState;
		});

		log.debug('[ViewStore] Cache update handled', false, notification);
	}

	/**
	 * Switch to a different view
	 */
	function switchView(view: ViewType) {
		update(state => {
			if (view === state.currentView) return state;

			const newHistory = [...state.viewHistory, view];
			if (newHistory.length > 20) {
				newHistory.shift();
			}

			return {
				...state,
				currentView: view,
				viewHistory: newHistory,
				cache: {
					...state.cache,
					lastUpdated: {
						...state.cache.lastUpdated,
						[view]: new Date()
					}
				}
			};
		});

		log.info('[ViewStore] Switched view', false, { to: view });
	}

	/**
	 * Go back in view history
	 */
	function goBack() {
		update(state => {
			if (state.viewHistory.length <= 1) return state;

			const newHistory = state.viewHistory.slice(0, -1);
			const previousView = newHistory[newHistory.length - 1];

			return {
				...state,
				currentView: previousView,
				viewHistory: newHistory
			};
		});
	}

	/**
	 * Toggle split view
	 */
	function toggleSplitView() {
		update(state => ({
			...state,
			splitView: !state.splitView,
			secondaryView: !state.splitView ? null : (state.secondaryView || 'transactions')
		}));
	}

	/**
	 * Set secondary view for split mode
	 */
	function setSecondaryView(view: ViewType | null) {
		update(state => ({
			...state,
			secondaryView: view
		}));
	}

	/**
	 * Update view preferences
	 */
	function updatePreferences(prefs: Partial<ViewPreferences>) {
		update(state => ({
			...state,
			preferences: { ...state.preferences, ...prefs }
		}));
		savePreferences();

		// Restart auto-refresh if interval changed
		if ('autoRefreshInterval' in prefs) {
			startAutoRefresh();
		}
	}

	/**
	 * Update filters for a specific view
	 */
	function updateFilters(viewType: keyof ViewFilters, filters: any) {
		update(state => ({
			...state,
			filters: {
				...state.filters,
				[viewType]: { ...state.filters[viewType], ...filters }
			}
		}));
	}

	/**
	 * Refresh all views
	 */
	async function refreshAllViews() {
		if (!viewCacheManager) return;

		update(state => ({ ...state, isRefreshing: true }));

		try {
			const network = get(selectedNetwork);
			const account = get(currentAccount);
			const context = {
				chainId: network?.chainId,
				accountAddress: account?.address
			};

			// Load all view data in parallel
			const [accountsCache, tokensCache, transactionsCache] = await Promise.all([
				viewCacheManager.getAccountsView(context),
				viewCacheManager.getTokensView(context),
				viewCacheManager.getTransactionsView(context)
			]);

			update(state => ({
				...state,
				isRefreshing: false,
				lastRefresh: new Date(),
				cache: {
					...state.cache,
					accounts: accountsCache.data || [],
					tokens: tokensCache.data || [],
					transactions: transactionsCache.data || [],
					lastUpdated: {
						...state.cache.lastUpdated,
						accounts: new Date(),
						tokens: new Date(),
						transactions: new Date()
					}
				}
			}));

			log.info('[ViewStore] Refreshed all views');
		} catch (error) {
			log.error('[ViewStore] Failed to refresh views', false, error);
			update(state => ({ ...state, isRefreshing: false }));
		}
	}

	/**
	 * Refresh a specific view
	 */
	async function refreshView(viewType: ViewType) {
		if (!viewCacheManager) return;

		const network = get(selectedNetwork);
		const account = get(currentAccount);
		const context = {
			chainId: network?.chainId,
			accountAddress: account?.address
		};

		try {
			let cache: ViewCache;

			switch (viewType) {
				case 'accounts':
					cache = await viewCacheManager.getAccountsView(context);
					update(state => ({
						...state,
						cache: {
							...state.cache,
							accounts: cache.data || [],
							lastUpdated: {
								...state.cache.lastUpdated,
								accounts: new Date()
							}
						}
					}));
					break;

				case 'tokens':
					cache = await viewCacheManager.getTokensView(context);
					update(state => ({
						...state,
						cache: {
							...state.cache,
							tokens: cache.data || [],
							lastUpdated: {
								...state.cache.lastUpdated,
								tokens: new Date()
							}
						}
					}));
					break;

				case 'transactions':
					cache = await viewCacheManager.getTransactionsView(context);
					update(state => ({
						...state,
						cache: {
							...state.cache,
							transactions: cache.data || [],
							lastUpdated: {
								...state.cache.lastUpdated,
								transactions: new Date()
							}
						}
					}));
					break;
			}

			log.info('[ViewStore] Refreshed view', false, { viewType });
		} catch (error) {
			log.error('[ViewStore] Failed to refresh view', false, { viewType, error });
		}
	}

	/**
	 * Start auto-refresh timer
	 */
	function startAutoRefresh() {
		// Clear existing timer
		if (autoRefreshTimer) {
			clearInterval(autoRefreshTimer);
			autoRefreshTimer = null;
		}

		const state = get({ subscribe });
		const interval = state.preferences.autoRefreshInterval;

		if (interval > 0) {
			autoRefreshTimer = setInterval(() => {
				refreshAllViews();
			}, interval * 1000);

			log.info('[ViewStore] Auto-refresh started', false, { interval });
		}
	}

	/**
	 * Stop auto-refresh timer
	 */
	function stopAutoRefresh() {
		if (autoRefreshTimer) {
			clearInterval(autoRefreshTimer);
			autoRefreshTimer = null;
			log.info('[ViewStore] Auto-refresh stopped');
		}
	}

	/**
	 * Clean up resources
	 */
	function destroy() {
		stopAutoRefresh();
		if (viewCacheManager) {
			viewCacheManager.unregisterUpdateListener(handleCacheUpdate);
		}
		log.info('[ViewStore] Destroyed');
	}

	return {
		subscribe,
		initialize,
		switchView,
		goBack,
		toggleSplitView,
		setSecondaryView,
		updatePreferences,
		updateFilters,
		refreshAllViews,
		refreshView,
		destroy
	};
}

/**
 * The view store instance
 */
export const viewStore = createViewStore();

/**
 * Derived stores for specific views
 */
export const currentView = derived(
	viewStore,
	$viewStore => $viewStore.currentView
);

export const viewHistory = derived(
	viewStore,
	$viewStore => $viewStore.viewHistory
);

export const isRefreshing = derived(
	viewStore,
	$viewStore => $viewStore.isRefreshing
);

export const viewPreferences = derived(
	viewStore,
	$viewStore => $viewStore.preferences
);

export const viewFilters = derived(
	viewStore,
	$viewStore => $viewStore.filters
);

export const viewCache = derived(
	viewStore,
	$viewStore => $viewStore.cache
);

/**
 * Filtered data stores
 */
export const filteredTokens = derived(
	[viewStore, selectedNetwork, currentAccount],
	([$viewStore, $network, $account]) => {
		let tokens = $viewStore.cache.tokens;
		const filters = $viewStore.filters.tokens;

		// Apply search filter
		if (filters.search) {
			const query = filters.search.toLowerCase();
			tokens = tokens.filter(token =>
				token.symbol.toLowerCase().includes(query) ||
				token.name.toLowerCase().includes(query)
			);
		}

		// Filter zero balances
		if (!filters.showZeroBalances) {
			tokens = tokens.filter(token => {
				const quantity = parseFloat(token.quantity || '0');
				return quantity > 0;
			});
		}

		// Sort tokens
		tokens = [...tokens].sort((a, b) => {
			let aVal: any, bVal: any;

			switch (filters.sortBy) {
				case 'name':
					aVal = a.name.toLowerCase();
					bVal = b.name.toLowerCase();
					return filters.sortOrder === 'asc'
						? aVal.localeCompare(bVal)
						: bVal.localeCompare(aVal);

				case 'value':
					aVal = a.value || 0;
					bVal = b.value || 0;
					return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;

				case 'price':
					aVal = a.price || 0;
					bVal = b.price || 0;
					return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;

				case 'change':
					aVal = a.change24h || 0;
					bVal = b.change24h || 0;
					return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;

				default:
					return 0;
			}
		});

		return tokens;
	}
);

export const filteredTransactions = derived(
	[viewStore, currentAccount],
	([$viewStore, $account]) => {
		let transactions = $viewStore.cache.transactions;
		const filters = $viewStore.filters.transactions;

		// Apply search filter
		if (filters.search) {
			const query = filters.search.toLowerCase();
			transactions = transactions.filter(tx =>
				tx.hash.toLowerCase().includes(query) ||
				tx.from?.toLowerCase().includes(query) ||
				tx.to?.toLowerCase().includes(query) ||
				tx.methodId?.toLowerCase().includes(query) ||
				tx.functionName?.toLowerCase().includes(query)
			);
		}

		// Apply type filter
		if (filters.type !== 'all') {
			transactions = transactions.filter(tx => {
				switch (filters.type) {
					case 'sent':
						return tx.from?.toLowerCase() === $account?.address?.toLowerCase();
					case 'received':
						return tx.to?.toLowerCase() === $account?.address?.toLowerCase();
					case 'contract':
						return tx.type === 'contract';
					case 'swap':
						return tx.type === 'swap' || tx.functionName?.toLowerCase().includes('swap');
					case 'failed':
						return tx.status === 'failed';
					default:
						return true;
				}
			});
		}

		// Apply status filter
		if (filters.status !== 'all') {
			transactions = transactions.filter(tx => tx.status === filters.status);
		}

		// Apply limit
		return transactions.slice(0, filters.limit);
	}
);

/**
 * Statistics and aggregations
 */
export const viewStats = derived(
	viewStore,
	$viewStore => {
		const tokens = $viewStore.cache.tokens;
		const transactions = $viewStore.cache.transactions;

		const totalTokenValue = tokens.reduce((sum, token) => {
			const value = typeof token.value === 'number' ? token.value : 0;
			return sum + value;
		}, 0);

		const pendingTransactions = transactions.filter(tx => tx.status === 'pending').length;
		const failedTransactions = transactions.filter(tx => tx.status === 'failed').length;

		return {
			totalAccounts: $viewStore.cache.accounts.length,
			totalTokens: tokens.length,
			totalTokenValue,
			totalTransactions: transactions.length,
			pendingTransactions,
			failedTransactions,
			watchlistCount: $viewStore.cache.watchlist.length,
		};
	}
);
