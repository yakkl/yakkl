<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export interface FilterOption {
    id: string;
    label: string;
    value: any;
    checked?: boolean;
  }
  
  export interface SortOption {
    id: string;
    label: string;
    field: string;
  }
  
  interface Props {
    filters?: FilterOption[];
    sortOptions?: SortOption[];
    currentSort?: { field: string; order: 'asc' | 'desc' };
    searchPlaceholder?: string;
    searchValue?: string;
    showSearch?: boolean;
    showFilters?: boolean;
    showSort?: boolean;
    className?: string;
    position?: 'left' | 'right' | 'center';
  }
  
  let {
    filters = [],
    sortOptions = [],
    currentSort = { field: '', order: 'desc' as const },
    searchPlaceholder = 'Search...',
    searchValue = '',
    showSearch = true,
    showFilters = true,
    showSort = true,
    className = '',
    position = 'right'
  }: Props = $props();
  
  let isOpen = $state(false);
  let localSearchValue = $state(searchValue);
  let localFilters = $state(filters.map(f => ({ ...f })));
  let localSort = $state({ ...currentSort });
  
  const dispatch = createEventDispatcher();
  
  // Update local state when props change
  $effect(() => {
    localSearchValue = searchValue;
    localFilters = filters.map(f => ({ ...f }));
    localSort = { ...currentSort };
  });
  
  function handleSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    localSearchValue = target.value;
    dispatch('search', localSearchValue);
  }
  
  function handleFilterChange(filterId: string) {
    const filter = localFilters.find(f => f.id === filterId);
    if (filter) {
      filter.checked = !filter.checked;
      dispatch('filter', { 
        filters: localFilters.map(f => ({ id: f.id, checked: f.checked }))
      });
    }
  }
  
  function handleSort(field: string) {
    if (localSort.field === field) {
      localSort.order = localSort.order === 'asc' ? 'desc' : 'asc';
    } else {
      localSort.field = field;
      localSort.order = 'desc';
    }
    dispatch('sort', { field: localSort.field, order: localSort.order });
  }
  
  function handleClearFilters() {
    localFilters = localFilters.map(f => ({ ...f, checked: false }));
    localSearchValue = '';
    dispatch('clear', {});
    dispatch('filter', { 
      filters: localFilters.map(f => ({ id: f.id, checked: false }))
    });
    dispatch('search', '');
  }
  
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter-sort-controls')) {
      isOpen = false;
    }
  }
  
  // Get active filter count
  let activeFilterCount = $derived(localFilters.filter(f => f.checked).length);
  
  // Position classes
  let positionClasses = $derived.by(() => {
    switch (position) {
      case 'left':
        return 'left-0';
      case 'center':
        return 'left-1/2 -translate-x-1/2';
      case 'right':
      default:
        return 'right-0';
    }
  });
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative filter-sort-controls {className}">
  <!-- Trigger Button -->
  <button
    onclick={() => isOpen = !isOpen}
    class="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
    aria-label="Filter and sort options"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
    <span>Filter & Sort</span>
    {#if activeFilterCount > 0}
      <span class="px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
        {activeFilterCount}
      </span>
    {/if}
  </button>
  
  <!-- Dropdown Panel -->
  {#if isOpen}
    <div class="absolute top-full mt-2 w-80 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-gray-200 dark:border-zinc-700 z-50 {positionClasses}">
      <div class="p-4 space-y-4">
        <!-- Search -->
        {#if showSearch}
          <div>
            <label for="search-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div class="relative">
              <input
                id="search-input"
                type="text"
                value={localSearchValue}
                oninput={handleSearch}
                placeholder={searchPlaceholder}
                class="w-full px-3 py-2 pl-9 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        {/if}
        
        <!-- Filters -->
        {#if showFilters && filters.length > 0}
          <fieldset>
            <legend class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filters
            </legend>
            <div class="space-y-2">
              {#each localFilters as filter}
                <label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700 p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={filter.checked}
                    onchange={() => handleFilterChange(filter.id)}
                    class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-zinc-600 rounded focus:ring-indigo-500"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">
                    {filter.label}
                  </span>
                </label>
              {/each}
            </div>
          </fieldset>
        {/if}
        
        <!-- Sort Options -->
        {#if showSort && sortOptions.length > 0}
          <fieldset>
            <legend class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort By
            </legend>
            <div class="space-y-1">
              {#each sortOptions as option}
                <button
                  onclick={() => handleSort(option.field)}
                  class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors {localSort.field === option.field ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300'}"
                >
                  <span>{option.label}</span>
                  {#if localSort.field === option.field}
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {#if localSort.order === 'asc'}
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                      {:else}
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      {/if}
                    </svg>
                  {/if}
                </button>
              {/each}
            </div>
          </fieldset>
        {/if}
        
        <!-- Actions -->
        <div class="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-zinc-700">
          <button
            onclick={handleClearFilters}
            class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Clear all
          </button>
          <button
            onclick={() => isOpen = false}
            class="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  input[type="checkbox"] {
    cursor: pointer;
  }
  
  /* Custom checkbox styling */
  input[type="checkbox"]:checked {
    background-color: rgb(79 70 229);
    border-color: rgb(79 70 229);
  }
</style>