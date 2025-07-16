import { backgroundAPI } from './BackgroundAPI';

export interface AlarmCreateInfo {
  when?: number;
  delayInMinutes?: number;
  periodInMinutes?: number;
}

export interface Alarm {
  name: string;
  scheduledTime: number;
  periodInMinutes?: number;
}

export class AlarmsAPI {
  async create(name: string, alarmInfo: AlarmCreateInfo): Promise<void> {
    const response = await backgroundAPI.sendMessage('alarms.create', { name, alarmInfo });
    if (!response.success) {
      throw new Error(response.error || 'Failed to create alarm');
    }
  }

  async get(name?: string): Promise<Alarm | undefined> {
    const response = await backgroundAPI.sendMessage<Alarm>('alarms.get', { name });
    if (!response.success) {
      throw new Error(response.error || 'Failed to get alarm');
    }
    return response.data;
  }

  async getAll(): Promise<Alarm[]> {
    const response = await backgroundAPI.sendMessage<Alarm[]>('alarms.getAll');
    if (!response.success) {
      throw new Error(response.error || 'Failed to get all alarms');
    }
    return response.data || [];
  }

  async clear(name?: string): Promise<boolean> {
    const response = await backgroundAPI.sendMessage<boolean>('alarms.clear', { name });
    if (!response.success) {
      throw new Error(response.error || 'Failed to clear alarm');
    }
    return response.data || false;
  }

  async clearAll(): Promise<boolean> {
    const response = await backgroundAPI.sendMessage<boolean>('alarms.clearAll');
    if (!response.success) {
      throw new Error(response.error || 'Failed to clear all alarms');
    }
    return response.data || false;
  }

  onAlarm(callback: (alarm: Alarm) => void): () => void {
    return backgroundAPI.onMessage('alarms.onAlarm', (response) => {
      if (response.success && response.data) {
        callback(response.data);
      }
    });
  }
}

export const alarmsAPI = new AlarmsAPI();