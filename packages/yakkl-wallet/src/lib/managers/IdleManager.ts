import type { IdleConfig } from '$lib/common/idle/types';
import { SystemWideIdleManager } from './IdleManagerSystemWide';
import { AppWideIdleManager } from './IdleManagerAppWide';
import type { IdleManagerBase } from './IdleManagerBase';
import { log } from './Logger';

export class IdleManager {
  private static instance: IdleManagerBase;

  static initialize(config: Partial<IdleConfig> = {}): IdleManagerBase {
    const width = config.width || 'app-wide';

    if (IdleManager.instance) {
      IdleManager.instance.stop();
    }

    IdleManager.instance = width === 'system-wide'
      ? new SystemWideIdleManager(config as IdleConfig)
      : new AppWideIdleManager(config as IdleConfig);

    console.log('IdleManager - initialized:', IdleManager.instance);
    log.info('IdleManager - initialized:', false, IdleManager.instance);

    return IdleManager.instance;
  }

  static getInstance(): IdleManagerBase {
    if (!IdleManager.instance) {
      return IdleManager.initialize();
    }
    return IdleManager.instance;
  }
}

