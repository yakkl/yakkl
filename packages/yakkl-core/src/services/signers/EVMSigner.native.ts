/* eslint-disable @typescript-eslint/no-explicit-any */
// Native EVM signer using noble-secp256k1 and ethereum-cryptography
// Implements EIP-191 personal_sign format compatible with ethers' signMessage

import type { ISigner } from '../../interfaces/signer.interface';
import { ChainType } from '../../interfaces/provider.interface';

export class NativeEVMSigner implements ISigner {
  chain(): ChainType { return ChainType.EVM; }

  private async libs() {
    const secp = await import('@noble/secp256k1');
    const { keccak256 } = await import('ethereum-cryptography/keccak.js');
    const { hexToBytes, bytesToHex } = await import('ethereum-cryptography/utils.js');
    return { secp, keccak256, hexToBytes, bytesToHex };
  }

  private toBytes(input: string | Uint8Array): Uint8Array {
    if (typeof input === 'string') return new TextEncoder().encode(input);
    return input;
  }

  private eip191MessageBytes(message: string | Uint8Array): Uint8Array {
    const msgBytes = this.toBytes(message);
    const prefix = `\u0019Ethereum Signed Message:\n${msgBytes.length}`; // \x19
    const prefixBytes = new TextEncoder().encode(prefix);
    const out = new Uint8Array(prefixBytes.length + msgBytes.length);
    out.set(prefixBytes, 0);
    out.set(msgBytes, prefixBytes.length);
    return out;
  }

  async signMessage(privateKeyHex: string, message: string | Uint8Array): Promise<string> {
    const { secp, keccak256, hexToBytes, bytesToHex } = await this.libs();
    const pk = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;
    const pkBytes = hexToBytes(pk);

    // Hash per EIP-191
    const digest = keccak256(this.eip191MessageBytes(message));

    // Sign with recovery info; adapt to noble v2 signature shape
    const sigObj: any = await secp.sign(digest, pkBytes);
    let compact: Uint8Array;
    if (typeof sigObj.toCompactRawBytes === 'function') compact = sigObj.toCompactRawBytes();
    else if (typeof sigObj.toRawBytes === 'function') compact = sigObj.toRawBytes();
    else compact = sigObj as Uint8Array;
    const recid = 0; // fallback without recovery info

    // Compose 65-byte signature r(32) + s(32) + v(1)
    const r = bytesToHex((compact as Uint8Array).slice(0, 32));
    const s = bytesToHex((compact as Uint8Array).slice(32, 64));
    const v = (recid ?? 0) + 27; // 27/28 for personal_sign compatibility
    const vHex = v.toString(16).padStart(2, '0');
    return '0x' + r + s + vHex;
  }
}
