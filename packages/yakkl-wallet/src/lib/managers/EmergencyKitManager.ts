// This is a placeholder for the EmergencyKitManager
// The actual implementation is in the yakkl-security private package
// During build, this file will be replaced with the real implementation

import type {
  EmergencyKitAccountData,
  EmergencyKitData,
  EmergencyKitMetaData,
  EncryptedData,
  YakklAccount,
  YakklPrimaryAccount,
  YakklContact,
  YakklConnectedDomain,
  Preferences,
  Settings,
  Profile,
  YakklWatch,
  YakklChat,
  YakklBlocked,
  ProfileData,
  TokenData
} from '$lib/common';

interface BulkEmergencyKitData {
  meta: EmergencyKitMetaData;
  data: any;
  cs: string;
}

// Placeholder implementation that throws errors
export class EmergencyKitManager {
  static async createEmergencyKit(
    accountData: EmergencyKitAccountData[],
    encryptDownload: boolean,
    passwordOrSaltedKey: string | any
  ): Promise<EmergencyKitData> {
    throw new Error('EmergencyKitManager is not available in the public build');
  }

  static async createBulkEmergencyKit(
    preferences: Preferences,
    settings: Settings,
    profile: Profile,
    currentlySelected: any,
    contacts: YakklContact[],
    chats: YakklChat[],
    accounts: YakklAccount[],
    primaryAccounts: YakklPrimaryAccount[],
    watchList: YakklWatch[],
    blockedList: YakklBlocked[],
    connectedDomains: YakklConnectedDomain[],
    passwordOrSaltedKey: string | any,
    tokenData: TokenData[],
    tokenDataCustom: TokenData[],
    combinedTokenStore: TokenData[],
    walletProviders: string[],
    walletBlockchains: string[]
  ): Promise<BulkEmergencyKitData> {
    throw new Error('EmergencyKitManager is not available in the public build');
  }

  static async downloadBulkEmergencyKit(kit: BulkEmergencyKitData): Promise<string> {
    throw new Error('EmergencyKitManager is not available in the public build');
  }

  static async downloadEmergencyKit(kit: EmergencyKitData): Promise<void> {
    throw new Error('EmergencyKitManager is not available in the public build');
  }

  static async restoreEmergencyKit(
    fileData: string | ArrayBuffer,
    passwordOrSaltedKey: string | any
  ): Promise<EmergencyKitData> {
    throw new Error('EmergencyKitManager is not available in the public build');
  }

  static async restoreBulkEmergencyKit(
    fileData: string | ArrayBuffer,
    passwordOrSaltedKey: string | any
  ): Promise<any> {
    throw new Error('EmergencyKitManager is not available in the public build');
  }

  static generateId(): string {
    throw new Error('EmergencyKitManager is not available in the public build');
  }

  static async createHash(data: string): Promise<string> {
    throw new Error('EmergencyKitManager is not available in the public build');
  }

  private static async encryptWithChecksum(data: any, passwordOrSaltedKey: string | any): Promise<EncryptedData> {
    throw new Error('EmergencyKitManager is not available in the public build');
  }

  static async readBulkEmergencyKitMetadata(file: File): Promise<EmergencyKitMetaData> {
    throw new Error('EmergencyKitManager is not available in the public build');
  }

  static async importBulkEmergencyKit(
    file: File,
    passwordOrSaltedKey: string | any
  ): Promise<{ newData: any; existingData: any }> {
    throw new Error('EmergencyKitManager is not available in the public build');
  }
}