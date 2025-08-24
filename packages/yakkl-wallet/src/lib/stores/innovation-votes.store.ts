import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

interface Vote {
	visualizationId: string;
	timestamp: number;
	userId?: string; // For future user association
}

interface VoteStore {
	votes: Vote[];
	lastSyncedAt: number | null;
	localVotes: Record<string, number>; // Aggregated counts
}

const STORAGE_KEY = 'yakkl_innovation_votes';

// Initialize from localStorage
function loadVotes(): VoteStore {
	if (!browser) {
		return { votes: [], lastSyncedAt: null, localVotes: {} };
	}
	
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (error) {
		console.error('Failed to load votes from localStorage:', error);
	}
	
	return { votes: [], lastSyncedAt: null, localVotes: {} };
}

// Save to localStorage
function saveVotes(store: VoteStore) {
	if (!browser) return;
	
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
	} catch (error) {
		console.error('Failed to save votes to localStorage:', error);
	}
}

// Create the store
function createVotesStore() {
	const { subscribe, update } = writable<VoteStore>(loadVotes());

	return {
		subscribe,
		
		// Vote for a visualization
		vote(visualizationId: string) {
			update(store => {
				// Check if already voted recently (within 24 hours)
				const recentVote = store.votes.find(v => 
					v.visualizationId === visualizationId && 
					Date.now() - v.timestamp < 24 * 60 * 60 * 1000
				);
				
				if (recentVote) {
					console.log('Already voted for this visualization today');
					return store;
				}
				
				// Add new vote
				const newVote: Vote = {
					visualizationId,
					timestamp: Date.now()
				};
				
				store.votes.push(newVote);
				
				// Update local counts
				if (!store.localVotes[visualizationId]) {
					store.localVotes[visualizationId] = 0;
				}
				store.localVotes[visualizationId]++;
				
				// Save to localStorage
				saveVotes(store);
				
				return store;
			});
		},
		
		// Get vote count for a visualization
		getVoteCount(visualizationId: string): number {
			let count = 0;
			const unsubscribe = this.subscribe(store => {
				count = store.localVotes[visualizationId] || 0;
			});
			unsubscribe();
			return count;
		},
		
		// Check if user has voted for a visualization today
		hasVotedToday(visualizationId: string): boolean {
			let hasVoted = false;
			const unsubscribe = this.subscribe(store => {
				hasVoted = store.votes.some(v => 
					v.visualizationId === visualizationId && 
					Date.now() - v.timestamp < 24 * 60 * 60 * 1000
				);
			});
			unsubscribe();
			return hasVoted;
		},
		
		// Prepare votes for backend sync (future feature)
		async prepareForSync(): Promise<Vote[]> {
			let votesToSync: Vote[] = [];
			const unsubscribe = this.subscribe(store => {
				// Get votes that haven't been synced
				const lastSync = store.lastSyncedAt || 0;
				votesToSync = store.votes.filter(v => v.timestamp > lastSync);
			});
			unsubscribe();
			return votesToSync;
		},
		
		// Mark votes as synced (future feature)
		markAsSynced() {
			update(store => {
				store.lastSyncedAt = Date.now();
				saveVotes(store);
				return store;
			});
		},
		
		// Clear old votes (cleanup)
		clearOldVotes() {
			update(store => {
				const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
				store.votes = store.votes.filter(v => v.timestamp > oneWeekAgo);
				
				// Recalculate local votes
				store.localVotes = {};
				store.votes.forEach(vote => {
					if (!store.localVotes[vote.visualizationId]) {
						store.localVotes[vote.visualizationId] = 0;
					}
					store.localVotes[vote.visualizationId]++;
				});
				
				saveVotes(store);
				return store;
			});
		},
		
		// Get top voted visualizations
		getTopVoted(limit: number = 5): Array<{ id: string; votes: number }> {
			let topVoted: Array<{ id: string; votes: number }> = [];
			const unsubscribe = this.subscribe(store => {
				topVoted = Object.entries(store.localVotes)
					.map(([id, votes]) => ({ id, votes: votes as number }))
					.sort((a, b) => (b.votes as number) - (a.votes as number))
					.slice(0, limit);
			});
			unsubscribe();
			return topVoted;
		}
	};
}

export const innovationVotesStore = createVotesStore();

// Derived store for vote counts
export const voteCounts = derived(innovationVotesStore, $store => $store.localVotes);

// Clean up old votes periodically
if (browser) {
	// Clean up on load
	innovationVotesStore.clearOldVotes();
	
	// Clean up every hour
	setInterval(() => {
		innovationVotesStore.clearOldVotes();
	}, 60 * 60 * 1000);
}