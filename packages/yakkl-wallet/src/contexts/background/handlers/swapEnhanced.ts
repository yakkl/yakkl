import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import { UniswapSwapManager } from '$lib/managers/UniswapSwapManager';
import { getInstances } from '$lib/common';
import { getYakklCurrentlySelected, getMiscStore, getYakklAccounts } from '$lib/common/stores';
import { ethers } from 'ethers-v6';
import { log } from '$lib/common/logger-wrapper';
import { Token } from '@uniswap/sdk-core';
import type { SwapParams } from '$lib/managers/types';

// Cache swap manager instance
let swapManager: UniswapSwapManager | null = null;

async function getSwapManager(): Promise<UniswapSwapManager> {
  if (!swapManager) {
    const instances = await getInstances();
    if (!instances || !instances[0] || !instances[1]) {
      throw new Error('Blockchain instances not initialized');
    }

    const [blockchain, provider] = instances;
    swapManager = new UniswapSwapManager(blockchain as any, provider);
    await swapManager.initialize();
  }

  return swapManager;
}

export const swapEnhancedHandlers = new Map<string, MessageHandlerFunc>([
  ['swap.getQuote', async (payload): Promise<MessageResponse> => {
    try {
      const { fromToken, toToken, amount, chainId, slippage = 0.5 } = payload || {};

      if (!fromToken || !toToken || !amount) {
        return { success: false, error: 'Missing required parameters' };
      }

      // Get current account
      const currentlySelected = await getYakklCurrentlySelected();
      const accounts = await getYakklAccounts();
      const currentAccount = accounts?.find(acc => acc.id === currentlySelected?.id);
      if (!currentAccount?.address) {
        return { success: false, error: 'No account selected' };
      }

      // Get swap manager
      const manager = await getSwapManager();

      // Convert amount to proper units
      const amountIn = ethers.parseUnits(amount, fromToken.decimals || 18);

      // Note: SwapParams is not used for getQuote, just keeping for reference
      // const swapParams: SwapParams = {
      //   tokenIn: fromTokenObj,
      //   tokenOut: toTokenObj,
      //   fee: 3000, // 0.3% fee tier
      //   amount: amountIn,
      //   slippage: slippage,
      //   deadline: Math.floor(Date.now() / 1000) + 1800,
      //   recipient: currentlySelected.account.address,
      //   feeRecipient: '', // TODO: Set fee recipient
      //   feeAmount: 0
      // };

      // Get quote from Uniswap
      const fromTokenObj = new Token(
        fromToken.chainId || 1,
        fromToken.address,
        fromToken.decimals || 18,
        fromToken.symbol,
        fromToken.name
      );
      const toTokenObj = new Token(
        toToken.chainId || 1,
        toToken.address,
        toToken.decimals || 18,
        toToken.symbol,
        toToken.name
      );
      const quote = await manager.getQuote(
        fromTokenObj as any,
        toTokenObj as any,
        amountIn,
        currentAccount.address, // funding address
        true, // isExactIn
        3000 // fee tier
      );

      if (!quote || !quote.amountOut) {
        return {
          success: false,
          error: 'Failed to get quote from Uniswap'
        };
      }

      // Calculate output amount with slippage
      const quotedAmount = BigInt(quote.amountOut.toString());
      const slippageBasisPoints = Math.floor(slippage * 100); // Convert percentage to basis points
      const amountOutMinimum = quotedAmount * BigInt(10000 - slippageBasisPoints) / BigInt(10000);

      // Estimate gas (using placeholder for now)
      const gasEstimate = 300000n; // TODO: Use actual gas estimation
      const instances = await getInstances();
      const provider = instances?.[1]; // Get provider from instances
      const feeData = await provider?.getFeeData();
      const gasPrice = feeData?.gasPrice || 0n;
      const gasCostWei = gasEstimate * gasPrice;
      const gasCostETH = ethers.formatEther(gasCostWei);

      // Get current ETH price for USD conversion
      const ethPrice = 2500; // TODO: Get real ETH price from price feed
      const gasFeeUSD = (parseFloat(gasCostETH) * ethPrice).toFixed(2);

      // Calculate rate
      const rate = parseFloat(ethers.formatUnits(quotedAmount, toToken.decimals || 18)) / parseFloat(amount);

      return {
        success: true,
        data: {
          fromToken,
          toToken,
          fromAmount: amount,
          toAmount: ethers.formatUnits(quotedAmount, toToken.decimals || 18),
          amountOutMinimum: ethers.formatUnits(amountOutMinimum, toToken.decimals || 18),
          rate: rate.toFixed(6),
          gasFee: gasFeeUSD,
          gasEstimate: gasEstimate.toString(),
          slippage,
          provider: 'Uniswap V3',
          fee: 3000,
          timestamp: Date.now(),
          priceImpact: (quote as any).priceImpact || '0' // TODO: Check actual quote structure
        }
      };
    } catch (error) {
      log.error('Failed to get swap quote:', true, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }],

  ['swap.execute', async (payload): Promise<MessageResponse> => {
    try {
      const {
        fromToken,
        toToken,
        fromAmount,
        amountOutMinimum,
        slippage = 0.5,
        fee = 3000,
        deadline
      } = payload || {};

      if (!fromToken || !toToken || !fromAmount || !amountOutMinimum) {
        return { success: false, error: 'Missing required parameters' };
      }

      // Get current account
      const currentlySelected = await getYakklCurrentlySelected();
      const accounts = await getYakklAccounts();
      const currentAccount = accounts?.find(acc => acc.id === currentlySelected?.id);
      if (!currentAccount?.address) {
        return { success: false, error: 'No account selected' };
      }

      // Get swap manager
      const manager = await getSwapManager();
      const instances = await getInstances();
      const provider = instances?.[1]; // Get provider from instances

      // Convert amounts to proper units
      const amountIn = ethers.parseUnits(fromAmount, fromToken.decimals || 18);
      const minAmountOut = ethers.parseUnits(amountOutMinimum, toToken.decimals || 18);

      // Check if we need to approve token spending
      if (fromToken.address !== ethers.ZeroAddress) { // Not ETH
        const fromTokenObj = new Token(
          fromToken.chainId || 1,
          fromToken.address,
          fromToken.decimals || 18,
          fromToken.symbol,
          fromToken.name
        );

        const allowance = await manager.checkAllowance(
          fromTokenObj as any,
          currentAccount.address
        );

        if (BigInt(allowance) < amountIn) {
          // Need approval
          log.info('Approving token for swap...');
          const approvalTx = await manager.approveToken(
            fromTokenObj as any,
            amountIn.toString()
          );

          // Wait for approval - log the result
          log.info('Token approval transaction submitted', false, approvalTx);
        }
      }

      // Create token objects
      const fromTokenObj = new Token(
        fromToken.chainId || 1,
        fromToken.address,
        fromToken.decimals || 18,
        fromToken.symbol,
        fromToken.name
      );
      const toTokenObj = new Token(
        toToken.chainId || 1,
        toToken.address,
        toToken.decimals || 18,
        toToken.symbol,
        toToken.name
      );

      // Prepare swap params - use any to bypass type mismatch between @uniswap/sdk-core Token and custom Token
      const swapParams: any = {
        tokenIn: fromTokenObj,
        tokenOut: toTokenObj,
        amount: amountIn,
        fee,
        slippage,
        deadline: deadline || Math.floor(Date.now() / 1000) + 1800, // 30 minutes
        recipient: currentAccount.address,
        feeRecipient: '', // TODO: Set fee recipient if needed
        feeAmount: 0,
        gasLimit: 300000,
        maxFeePerGas: 0,
        maxPriorityFeePerGas: 0
      };

      // Execute swap
      const swapTx = await manager.executeSwap(swapParams);

      if (!swapTx) {
        return {
          success: false,
          error: 'Failed to execute swap'
        };
      }

      return {
        success: true,
        data: {
          txHash: swapTx.hash,
          status: 'pending',
          from: swapTx.from,
          to: swapTx.to,
          nonce: swapTx.nonce,
          gasLimit: swapTx.gasLimit?.toString(),
          gasPrice: swapTx.gasPrice?.toString(),
          data: swapTx.data
        }
      };
    } catch (error) {
      log.error('Failed to execute swap:', true, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }],

  ['swap.checkAllowance', async (payload): Promise<MessageResponse> => {
    try {
      const { tokenAddress, ownerAddress, spenderAddress } = payload || {};

      if (!tokenAddress || !ownerAddress || !spenderAddress) {
        return { success: false, error: 'Missing required parameters' };
      }

      const manager = await getSwapManager();
      // Create token object
      const token = new Token(
        1, // chainId (default to mainnet)
        tokenAddress,
        18, // decimals (default)
        'TOKEN',
        'Token'
      );
      const allowance = await manager.checkAllowance(token as any, ownerAddress);

      return {
        success: true,
        data: {
          allowance: allowance.toString()
        }
      };
    } catch (error) {
      log.error('Failed to check allowance:', true, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }],

  ['swap.approve', async (payload): Promise<MessageResponse> => {
    try {
      const { tokenAddress, spenderAddress, amount } = payload || {};

      if (!tokenAddress || !spenderAddress || !amount) {
        return { success: false, error: 'Missing required parameters' };
      }

      const manager = await getSwapManager();
      // Create token object
      const token = new Token(
        1, // chainId (default to mainnet)
        tokenAddress,
        18, // decimals (default)
        'TOKEN',
        'Token'
      );
      const tx = await manager.approveToken(token as any, amount);

      return {
        success: true,
        data: {
          txHash: (tx as any)?.transactionHash || (tx as any)?.hash || 'unknown',
          status: 'pending'
        }
      };
    } catch (error) {
      log.error('Failed to approve token:', true, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }]
]);

// Import required constants
const ADDRESSES = {
  UNISWAP_V3_ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  UNISWAP_FACTORY: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
};
