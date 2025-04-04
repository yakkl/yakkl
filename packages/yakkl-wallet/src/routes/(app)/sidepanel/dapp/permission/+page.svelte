<!-- Permission Request Page -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { log } from '$lib/plugins/Logger';
  import { browser_ext, browserSvelte } from '$lib/common/environment';

  let loading = true;
  let error: string | null = null;
  let origin: string | null = null;
  let method: string | null = null;
  let params: any[] = [];
  let requestId: string | null = null;

  onMount(async () => {
    try {
      if (browserSvelte) {
        // Get request details from URL params
        const searchParams = new URLSearchParams(window.location.search);
        requestId = searchParams.get('requestId');
        origin = searchParams.get('origin');
        method = searchParams.get('method');
        const paramsStr = searchParams.get('params');

        if (paramsStr) {
          try {
            params = JSON.parse(paramsStr);
          } catch (e) {
            log.error('Error parsing params:', false, e);
            params = [];
          }
        }

        if (!requestId || !origin || !method) {
          throw new Error('Missing required parameters');
        }

        loading = false;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error occurred';
      loading = false;
    }
  });

  async function handleApprove() {
    try {
      if (browserSvelte) {
        loading = true;
        const response = await browser_ext.runtime.sendMessage({
          type: 'YAKKL_PERMISSION_RESPONSE',
          requestId,
          approved: true,
          method,
          params
        });

        log.debug('Permission approved:', false, {
          requestId,
          method,
          response
        });

        // Only close if message was sent successfully
        window.close();
      }
    } catch (e) {
      loading = false;
      error = e instanceof Error ? e.message : 'Failed to approve request';
      log.error('Error approving permission:', false, {
        error,
        requestId,
        method
      });
    }
  }

  async function handleReject() {
    try {
      if (browserSvelte) {
        loading = true;
        const response = await browser_ext.runtime.sendMessage({
          type: 'YAKKL_PERMISSION_RESPONSE',
          requestId,
          approved: false,
          method,
          reason: 'User rejected the request'
        });

        log.debug('Permission rejected:', false, {
          requestId,
          method,
          response
        });

        // Only close if message was sent successfully
        window.close();
      }
    } catch (e) {
      loading = false;
      error = e instanceof Error ? e.message : 'Failed to reject request';
      log.error('Error rejecting permission:', false, {
        error,
        requestId,
        method
      });
    }
  }
</script>

<div class="min-h-screen bg-gray-50 flex flex-col py-6 px-4 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <img class="mx-auto h-12 w-auto" src="/images/logoBullFav.svg" alt="YAKKL" />
    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
      Permission Request
    </h2>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      {#if loading}
        <div class="flex justify-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      {:else if error}
        <div class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error</h3>
              <div class="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="space-y-6">
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium text-gray-700">Origin</label>
            <div class="mt-1">
              <div class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50">
                {origin}
              </div>
            </div>
          </div>

          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium text-gray-700">Method</label>
            <div class="mt-1">
              <div class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50">
                {method}
              </div>
            </div>
          </div>

          {#if params.length > 0}
            <div>
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="block text-sm font-medium text-gray-700">Parameters</label>
              <div class="mt-1">
                <pre class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 overflow-auto">
                  {JSON.stringify(params, null, 2)}
                </pre>
              </div>
            </div>
          {/if}

          <div class="flex space-x-4">
            <button
              type="button"
              on:click={handleApprove}
              class="flex-1 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Approve
            </button>
            <button
              type="button"
              on:click={handleReject}
              class="flex-1 justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Reject
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
