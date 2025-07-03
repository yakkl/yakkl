export * from './BackgroundAPI';
export * from './StorageAPI';
export * from './TabsAPI';
export * from './WindowsAPI';
export * from './NotificationsAPI';
export * from './RuntimeAPI';
export * from './ActionAPI';
export * from './AlarmsAPI';
export * from './SidePanelAPI';

import { storageAPI } from './StorageAPI';
import { tabsAPI } from './TabsAPI';
import { windowsAPI } from './WindowsAPI';
import { notificationsAPI } from './NotificationsAPI';
import { runtimeAPI } from './RuntimeAPI';
import { actionAPI } from './ActionAPI';
import { alarmsAPI } from './AlarmsAPI';
import { sidePanelAPI } from './SidePanelAPI';

export const clientAPI = {
  storage: storageAPI,
  tabs: tabsAPI,
  windows: windowsAPI,
  notifications: notificationsAPI,
  runtime: runtimeAPI,
  action: actionAPI,
  alarms: alarmsAPI,
  sidePanel: sidePanelAPI
};