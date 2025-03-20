// ... existing code ...

// Remove the getApiKey function and API key handling from client context
async function handleEIP6963Request(method: string, params: any[], requestContext?: any): Promise<any> {
  try {
    log.warn('Handling EIP6963 request', false, { method, params });

    // Get current wallet state
    const result = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
    const yakklCurrentlySelected = result[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;

    if (!yakklCurrentlySelected) {
      throw new ProviderRpcError(4100, 'Wallet not initialized');
    }

    // Handle methods that don't require approval
    if (noApprovalMethods.includes(method)) {
      switch (method) {
        case 'eth_chainId':
          return `0x${yakklCurrentlySelected.shortcuts.chainId.toString(16)}`;
        case 'net_version':
          return yakklCurrentlySelected.shortcuts.chainId.toString();
        case 'eth_accounts':
          return yakklCurrentlySelected.shortcuts.address ? [yakklCurrentlySelected.shortcuts.address] : [];
        case 'eth_getBlockByNumber':
          try {
            // Call getBlock without API key - it will be handled in the background
            return await getBlock(yakklCurrentlySelected.shortcuts.chainId, params[0], undefined);
          } catch (error) {
            log.error('Error in eth_getBlockByNumber', false, error);
            throw new ProviderRpcError(4200, error instanceof Error ? error.message : 'Failed to fetch block');
          }
        default:
          // For other no-approval methods, still show popup for now
          return await showEIP6963Popup(method, params);
      }
    }

    // For methods requiring approval, show popup
    return await showEIP6963Popup(method, params);

  } catch (error) {
    log.error('Error in handleEIP6963Request', false, {
      error,
      method,
      params,
      errorMessage: error instanceof Error ? error.message : String(error)
    });

    if (error instanceof ProviderRpcError) {
      throw error;
    }

    throw new ProviderRpcError(
      EIP1193_ERRORS.INTERNAL_ERROR.code,
      error instanceof Error ? error.message : EIP1193_ERRORS.INTERNAL_ERROR.message
    );
  }
}

// ... existing code ...
