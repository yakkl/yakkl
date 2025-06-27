import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import { BlockchainExplorer } from '$lib/managers/providers/explorer/BlockchainExplorer';
import { getYakklCurrentlySelected } from '$lib/common/stores';

export const blockchainHandlers = new Map<string, MessageHandlerFunc>([
  ['yakkl_getTransactionHistory', async (payload): Promise<MessageResponse> => {
    try {
      const { address, limit = 10 } = payload || {};
      
      if (!address) {
        return { success: false, error: 'Address is required' };
      }

      // Get current chain from store
      const currentlySelected = await getYakklCurrentlySelected();
      const chainId = currentlySelected?.shortcuts?.chainId || 1;

      // Get transaction history from blockchain explorer
      const explorer = BlockchainExplorer.getInstance();
      const transactions = await explorer.getTransactionHistory(address, chainId, limit);

      return { success: true, data: transactions };
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return { success: false, error: (error as Error).message };
    }
  }],

  ['yakkl_trackActivity', async (payload): Promise<MessageResponse> => {
    try {
      // Payload now contains the activity data directly
      const activityData = payload;
      
      // For now, just log the activity
      console.log('Activity tracked:', activityData);
      
      // TODO: Implement actual activity tracking storage
      // This could store to IndexedDB or send to analytics service
      
      return { success: true, data: true };
    } catch (error) {
      console.error('Failed to track activity:', error);
      return { success: false, error: (error as Error).message };
    }
  }]
]);