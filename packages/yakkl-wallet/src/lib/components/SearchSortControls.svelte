<!-- SearchSortControls.svelte -->
<script lang="ts">
  import SearchIcon from './icons/SearchIcon.svelte';
  import SortIcon from './icons/SortIcon.svelte';

  let {
    searchQuery = '',
    sortOrder = 'date',
    sortDirection = 'desc',
    onSearch,
    onSortOrderChange,
    onSortDirectionChange
  } = $props<{
    searchQuery?: string;
    sortOrder?: 'date' | 'title';
    sortDirection?: 'asc' | 'desc';
    onSearch: (query: string) => void;
    onSortOrderChange: (order: 'date' | 'title') => void;
    onSortDirectionChange: () => void;
  }>();

  // Handle search input with debounce
  let searchTimeout: NodeJS.Timeout;
  function handleSearch(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      onSearch(value);
    }, 300);
  }

  // Handle sort order change
  function handleSortOrderChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as 'date' | 'title';
    onSortOrderChange(value);
  }

  // Handle sort direction change
  function handleSortDirectionChange() {
    onSortDirectionChange();
  }
</script>

<div class="flex items-center justify-end mb-2">
  <div class="flex items-center space-x-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-full p-1.5 shadow-lg">
    <!-- Search Field -->
    <div class="relative flex-1 max-w-xs">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="w-4 h-4 text-gray-400" />
      </div>
      <input
        type="text"
        class="block w-full pl-10 pr-3 py-1.5 text-sm bg-transparent border border-gray-200 dark:border-zinc-700 rounded-full focus:ring-1 focus:ring-gray-300 dark:focus:ring-zinc-700 dark:text-gray-200"
        placeholder="Search articles..."
        value={searchQuery}
        oninput={handleSearch}
      />
    </div>

    <!-- Sort Controls -->
    <div class="flex items-center space-x-1">
      <select
        class="text-sm bg-transparent border-0 focus:ring-0 focus:outline-none dark:text-gray-200"
        value={sortOrder}
        onchange={handleSortOrderChange}
      >
        <option value="date">Date</option>
        <option value="title">Title</option>
      </select>

      <button
        class="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors duration-200"
        onclick={handleSortDirectionChange}
      >
        <SortIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 {sortDirection === 'asc' ? 'rotate-180' : ''}" />
      </button>
    </div>
  </div>
</div>
