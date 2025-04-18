import { openPopups, openWindows } from "$lib/common/reload";
import { updateScreenPreferences } from "$lib/extensions/chrome/ui";
import { setIconLock } from "$lib/utilities/utilities";

export async function onPortInternalListener(event: any): Promise<void> {
  if (event && event.method) {
    switch(event.method) {
      case 'int_screen':
        updateScreenPreferences(event);
        break;
      case 'close':
        await setIconLock();
        openPopups.clear();
        openWindows.clear();
        break;
      default:
        break;
    }
  }
}
