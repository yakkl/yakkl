/* eslint-disable @typescript-eslint/no-explicit-any */
import { getMiscStore } from '$lib/common/miscStore';
import type { HasData } from '$lib/common/interfaces';
import { isEncryptedData, encryptData } from '@yakkl/sdk';
import { log } from '$lib/common/logger-wrapper';

export async function verifyEncryption<T extends HasData<any>>(value: T | T[]): Promise<T | T[]> {
  try {
    const miscStore = await getMiscStore();

    if (miscStore) {
      const processItem = async (item: T) => {
        if (!isEncryptedData(item.data)) {
          const result = await encryptData(item.data, miscStore);
          item.data = result as any;
        }
        return item;
      };

      if (Array.isArray(value)) {
        return Promise.all(value.map(processItem));
      } else {
        return processItem(value);
      }
    }

    return value;
  } catch (error) {
    log.error('Error in verifyEncryption:', false, error);
    throw error;
  }
}
