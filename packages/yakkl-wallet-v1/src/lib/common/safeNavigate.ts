import { goto } from '$app/navigation';
import { PATH_LOGOUT } from '$lib/common/constants';

export async function safeNavigate(path: string, delayMs = 0, options: any = {}) {
	if (delayMs > 0) {
		setTimeout(() => goto(path, options), delayMs);
	} else {
		goto(path, options);
	}
}

export async function safeLogout(delayMs = 0, options: any = {}) {
	safeNavigate(PATH_LOGOUT, delayMs, options);
}
