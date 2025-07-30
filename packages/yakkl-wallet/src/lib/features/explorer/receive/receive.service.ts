import { currentAccount } from '../../../stores/account.store';
import { currentChain } from '../../../stores/chain.store';
import { get } from 'svelte/store';
import type { ServiceResponse } from '../../../types';

interface QRCodeData {
  address: string;
  chainId: number;
  amount?: string;
  token?: string;
  message?: string;
}

interface PaymentRequest {
  address: string;
  amount?: string;
  token?: string;
  message?: string;
  qrCode: string;
  uri: string;
}

export class ReceiveService {
  private static instance: ReceiveService;

  private constructor() {}

  static getInstance(): ReceiveService {
    if (!ReceiveService.instance) {
      ReceiveService.instance = new ReceiveService();
    }
    return ReceiveService.instance;
  }

  async generatePaymentRequest(
    amount?: string, 
    token?: string, 
    message?: string
  ): Promise<ServiceResponse<PaymentRequest>> {
    try {
      const account = get(currentAccount);
      const chain = get(currentChain);

      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      if (!chain) {
        return {
          success: false,
          error: { hasError: true, message: 'No network selected' }
        };
      }

      const qrData: QRCodeData = {
        address: account.address,
        chainId: chain.chainId,
        amount,
        token,
        message
      };

      // Generate EIP-681 payment URI
      const uri = this.generatePaymentURI(qrData);
      
      // Generate QR code data (in real implementation, this would create actual QR code)
      const qrCode = this.generateQRCodeData(qrData);

      return {
        success: true,
        data: {
          address: account.address,
          amount,
          token,
          message,
          qrCode,
          uri
        }
      };
    } catch (error) {
      return {
        success: false,
        error: { 
          hasError: true, 
          message: error instanceof Error ? error.message : 'Failed to generate payment request' 
        }
      };
    }
  }

  async copyAddressToClipboard(): Promise<ServiceResponse<boolean>> {
    try {
      const account = get(currentAccount);
      
      if (!account) {
        return {
          success: false,
          error: { hasError: true, message: 'No account selected' }
        };
      }

      await navigator.clipboard.writeText(account.address);
      
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: { 
          hasError: true, 
          message: 'Failed to copy address to clipboard' 
        }
      };
    }
  }

  async sharePaymentRequest(paymentRequest: PaymentRequest): Promise<ServiceResponse<boolean>> {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Payment Request',
          text: `Send ${paymentRequest.amount || 'crypto'} to ${paymentRequest.address}`,
          url: paymentRequest.uri
        });
        return { success: true, data: true };
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(paymentRequest.uri);
        return { success: true, data: true };
      }
    } catch (error) {
      return {
        success: false,
        error: { 
          hasError: true, 
          message: 'Failed to share payment request' 
        }
      };
    }
  }

  private generatePaymentURI(data: QRCodeData): string {
    // EIP-681 format: ethereum:<address>[@<chain_id>][?value=<value>&gas=<gas>&gasPrice=<gasPrice>]
    let uri = `ethereum:${data.address}`;
    
    if (data.chainId !== 1) {
      uri += `@${data.chainId}`;
    }

    const params = new URLSearchParams();
    
    if (data.amount) {
      // Convert to wei for ETH, or token units for ERC20
      if (!data.token || data.token === 'ETH') {
        const weiAmount = (parseFloat(data.amount) * 1e18).toString();
        params.append('value', weiAmount);
      } else {
        params.append('uint256', data.amount);
      }
    }

    if (data.token && data.token !== 'ETH') {
      // For ERC20 tokens, we'd need the contract address
      params.append('function', 'transfer');
    }

    if (data.message) {
      params.append('message', data.message);
    }

    const paramString = params.toString();
    return paramString ? `${uri}?${paramString}` : uri;
  }

  private generateQRCodeData(data: QRCodeData): string {
    // In a real implementation, this would generate actual QR code SVG/image
    // For now, return the URI that would be encoded
    return this.generatePaymentURI(data);
  }

  getAddressDisplayFormats(address: string) {
    return {
      full: address,
      short: `${address.slice(0, 6)}...${address.slice(-4)}`,
      middle: `${address.slice(0, 10)}...${address.slice(-6)}`
    };
  }
}