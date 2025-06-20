import { TIMER_CONNECTION_INTERVAL_TIME } from "$lib/common";
import { yakklConnectionStore } from "$lib/common/stores";
import { getTimerManager } from "$lib/managers/TimerManager";
import { isOnline } from '$lib/utilities/utilities';
import { log } from "$lib/managers/Logger";

let urlCheck: string | undefined;

async function checkConnectionCB() {
  try {
    if (await isOnline(urlCheck) !== true) {
      yakklConnectionStore.set(false);
    } else {
      yakklConnectionStore.set(true);
    }
  } catch (e) {
    log.error(e);
  }
}

export function stopCheckConnection() {
  try {
    getTimerManager().stopTimer('connection_checkConnection');
  } catch(e) {
    log.error(e);
  }
}

export function startCheckConnection(url='https://github.com/yakkl', ms=TIMER_CONNECTION_INTERVAL_TIME) {
  try {
    if (ms > 0) {
      urlCheck = url;
      if (getTimerManager().isRunning('connection_checkConnection')) {
        return; // Already running
      }
      getTimerManager().addTimer('connection_checkConnection', checkConnectionCB, ms);
      getTimerManager().startTimer('connection_checkConnection');
  }
  } catch (e) {
    log.error(e);
    getTimerManager().stopTimer('connection_checkConnection');
  }
}
