<script lang="ts">
  interface Props {
    show?: boolean;
    onClose?: () => void;
    onSubmit?: (rating: number, comment: string) => void;
    title?: string;
    subtitle?: string;
    productName?: string;
    showTerms?: boolean;
    termsText?: string;
    maxRating?: number;
    ratingLabels?: Record<number, string>;
  }
  
  let { 
    show = $bindable(false),
    onClose = () => { show = false; },
    onSubmit = () => {},
    title = 'Rate Your Experience',
    subtitle = 'We\'d love to hear your thoughts',
    productName = 'this product',
    showTerms = true,
    termsText = 'I agree to allow my testimonial to be shared publicly. My full contact information will never be shared.',
    maxRating = 5,
    ratingLabels = {
      1: 'We\'re sorry to hear that. Please tell us how we can improve.',
      2: 'Thanks for your feedback. What could be better?',
      3: 'Good to hear! Any suggestions for improvement?',
      4: 'Great! What did you like?',
      5: 'Awesome! We\'re thrilled you love it!'
    }
  }: Props = $props();
  
  let rating = $state(0);
  let hoveredRating = $state(0);
  let comment = $state('');
  let termsAccepted = $state(!showTerms); // Auto-accept if terms not shown
  let submitting = $state(false);
  let submitted = $state(false);
  
  function setRating(value: number) {
    rating = value;
  }
  
  function setHoveredRating(value: number) {
    hoveredRating = value;
  }
  
  function resetHoveredRating() {
    hoveredRating = 0;
  }
  
  async function handleSubmit() {
    if (rating === 0) {
      alert('Please select a rating before submitting.');
      return;
    }
    
    if (showTerms && !termsAccepted) {
      alert('Please accept the terms to submit your review.');
      return;
    }
    
    submitting = true;
    
    // Call the onSubmit callback
    await onSubmit(rating, comment);
    
    submitting = false;
    submitted = true;
    
    // Close after showing success
    setTimeout(() => {
      handleClose();
    }, 2000);
  }
  
  function handleClose() {
    rating = 0;
    hoveredRating = 0;
    comment = '';
    termsAccepted = !showTerms;
    submitted = false;
    onClose();
  }
  
  function getStarClass(position: number): string {
    const isActive = (hoveredRating || rating) >= position;
    return isActive ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600';
  }
  
  // Generate rating positions array
  const ratingPositions = Array.from({ length: maxRating }, (_, i) => i + 1);
</script>

{#if show}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative">
      <!-- Close button -->
      <button
        onclick={handleClose}
        class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
        aria-label="Close"
      >
        ×
      </button>
      
      <!-- Header -->
      <div class="text-center mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <p class="text-gray-600 dark:text-gray-300 mt-2">
          {subtitle}
        </p>
      </div>
      
      {#if !submitted}
        <!-- Star Rating -->
        <div class="flex justify-center gap-2 mb-6">
          {#each ratingPositions as position}
            <button
              onclick={() => setRating(position)}
              onmouseenter={() => setHoveredRating(position)}
              onmouseleave={resetHoveredRating}
              class="transition-all duration-200 transform hover:scale-110"
              aria-label={`Rate ${position} stars`}
            >
              <svg 
                class="w-10 h-10 {getStarClass(position)} transition-colors duration-200" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </button>
          {/each}
        </div>
        
        <!-- Rating Text -->
        {#if rating > 0 && ratingLabels[rating]}
          <p class="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
            {ratingLabels[rating]}
          </p>
        {/if}
        
        <!-- Comment Area -->
        <div class="mb-4">
          <label for="comment" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your feedback (optional)
          </label>
          <textarea
            id="comment"
            bind:value={comment}
            placeholder="Tell us about your experience..."
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   placeholder-gray-400 dark:placeholder-gray-500"
          ></textarea>
        </div>
        
        <!-- Terms Acceptance -->
        {#if showTerms}
          <div class="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={termsAccepted}
                class="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span class="text-sm text-gray-600 dark:text-gray-300">
                {termsText}
              </span>
            </label>
          </div>
        {/if}
        
        <!-- Submit Button -->
        <button
          onclick={handleSubmit}
          disabled={rating === 0 || (showTerms && !termsAccepted) || submitting}
          class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {#if submitting}
            <span class="inline-block animate-spin mr-2">⏳</span>
            Submitting...
          {:else}
            Submit Review
          {/if}
        </button>
      {:else}
        <!-- Success Message -->
        <div class="text-center py-8">
          <div class="text-green-500 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Thank You!
          </h3>
          <p class="text-gray-600 dark:text-gray-300">
            Your feedback helps us improve {productName} for everyone.
          </p>
        </div>
      {/if}
    </div>
  </div>
{/if}