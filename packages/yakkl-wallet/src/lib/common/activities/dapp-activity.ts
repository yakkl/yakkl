import { log } from '$lib/managers/Logger';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from '../storage';

export interface DAppActivity {
  id: string;
  persona: string; // The persona that is associated with the activity
  timestamp: number;
  method: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  domain: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
  // Future enterprise features
  userId?: string;        // For multi-user support
  organizationId?: string; // For enterprise/organization tracking
  environment?: string;    // For different environments (prod, staging, etc.)
  tags?: string[];        // For categorizing activities
}

export interface DAppActivityHistory {
  activities: DAppActivity[];
  lastCleanup?: number;
  settings?: {
    retentionDays?: number;
    autoCleanup?: boolean;
  };
}

const STORAGE_KEY = 'yakklDappActivity';

export async function addDAppActivity(activity: DAppActivity): Promise<void> {
  try {
    const history = await getDAppActivityHistory();

    log.info('addDAppActivity - history', false, history);

    history.activities.push(activity);
    await setObjectInLocalStorage(STORAGE_KEY, history);
  } catch (error) {
    log.error('Failed to add DApp activity:', false, error);
  }
}

export async function getDAppActivityHistory(): Promise<DAppActivityHistory> {
  try {
    const history = await getObjectFromLocalStorage(STORAGE_KEY) as DAppActivityHistory;
    if (!history) {
      return {
        activities: [],
        settings: {
          retentionDays: 30, // Default retention period
          autoCleanup: false // Default to manual cleanup
        }
      };
    }
    return history;
  } catch (error) {
    log.error('Failed to get DApp activity history:', false,error);
    return {
      activities: [],
      settings: {
        retentionDays: 30,
        autoCleanup: false
      }
    };
  }
}

export async function cleanupDAppActivityHistory(options?: {
  retentionDays?: number;
  beforeDate?: number;
}): Promise<void> {
  try {
    const history = await getDAppActivityHistory();
    const now = Date.now();

    // Use provided retention days or default from settings
    const retentionDays = options?.retentionDays || history.settings?.retentionDays || 30;
    const cutoffTime = options?.beforeDate || (now - (retentionDays * 24 * 60 * 60 * 1000));

    history.activities = history.activities.filter(activity => activity.timestamp > cutoffTime);
    history.lastCleanup = now;

    await setObjectInLocalStorage(STORAGE_KEY, history);
  } catch (error) {
    log.error('Failed to cleanup DApp activity history:', false, error);
  }
}

export async function updateActivitySettings(settings: {
  retentionDays?: number;
  autoCleanup?: boolean;
}): Promise<void> {
  try {
    const history = await getDAppActivityHistory();
    history.settings = {
      ...history.settings,
      ...settings
    };
    await setObjectInLocalStorage(STORAGE_KEY, history);
  } catch (error) {
    log.error('Failed to update activity settings:', false, error);
  }
}

// Remove automatic cleanup initialization
// cleanupDAppActivityHistory();
