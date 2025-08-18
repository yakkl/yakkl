<script lang="ts">
	import { writable } from 'svelte/store';
	
	// Props
	let {
		value = 'orbital',
		onChange = (mode: 'orbital' | 'traditional') => {},
		className = ''
	} = $props();
	
	// Local state
	let mode = $state(value);
	
	// Handle toggle
	function toggleMode() {
		mode = mode === 'orbital' ? 'traditional' : 'orbital';
		onChange(mode);
		
		// Save preference to localStorage
		try {
			localStorage.setItem('yakkl_nav_mode', mode);
		} catch (e) {
			console.warn('Failed to save navigation preference');
		}
	}
	
	// Load saved preference on mount
	$effect(() => {
		try {
			const saved = localStorage.getItem('yakkl_nav_mode');
			if (saved === 'orbital' || saved === 'traditional') {
				mode = saved;
				onChange(mode);
			}
		} catch (e) {
			console.warn('Failed to load navigation preference');
		}
	});
</script>

<div class="navigation-toggle {className}">
	<button
		onclick={toggleMode}
		class="toggle-btn"
		aria-label="Toggle navigation mode"
		title={mode === 'orbital' ? 'Switch to traditional view' : 'Switch to orbital view'}
	>
		<div class="toggle-track">
			<div class="toggle-thumb" class:orbital={mode === 'orbital'}>
				{#if mode === 'orbital'}
					<!-- Orbital icon -->
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<circle cx="12" cy="12" r="3" stroke-width="2"/>
						<circle cx="12" cy="12" r="8" stroke-width="1" stroke-dasharray="2 2"/>
						<circle cx="20" cy="12" r="2" fill="currentColor"/>
						<circle cx="4" cy="12" r="2" fill="currentColor"/>
						<circle cx="12" cy="4" r="2" fill="currentColor"/>
						<circle cx="12" cy="20" r="2" fill="currentColor"/>
					</svg>
				{:else}
					<!-- List icon -->
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
					</svg>
				{/if}
			</div>
		</div>
		<span class="toggle-label">
			{mode === 'orbital' ? 'Orbital' : 'Classic'}
		</span>
	</button>
</div>

<style>
	.navigation-toggle {
		display: inline-block;
	}
	
	.toggle-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 24px;
		cursor: pointer;
		transition: all 0.3s ease;
		color: var(--text-primary, #1f2937);
	}
	
	.toggle-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.3);
		transform: translateY(-1px);
	}
	
	.toggle-track {
		position: relative;
		width: 48px;
		height: 24px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 12px;
		transition: background 0.3s ease;
	}
	
	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 20px;
		height: 20px;
		background: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}
	
	.toggle-thumb.orbital {
		transform: translateX(24px);
		background: linear-gradient(135deg, #3b82f6, #8b5cf6);
		color: white;
	}
	
	.toggle-label {
		font-size: 0.875rem;
		font-weight: 500;
	}
	
	/* Dark mode */
	:global(.dark) .toggle-btn {
		color: #f3f4f6;
		background: rgba(17, 24, 39, 0.6);
		border-color: rgba(55, 65, 81, 0.5);
	}
	
	:global(.dark) .toggle-btn:hover {
		background: rgba(31, 41, 55, 0.7);
		border-color: rgba(75, 85, 99, 0.6);
	}
	
	:global(.dark) .toggle-track {
		background: rgba(255, 255, 255, 0.1);
	}
</style>