import { writable } from 'svelte/store';

let warningTimeSecondsExt = 30;

export interface SecurityWarningState {
	show: boolean;
	warningTime: number;
	onComplete?: () => void;
}

export const securityWarningStore = writable<SecurityWarningState>({
	show: false,
	warningTime: warningTimeSecondsExt,
	onComplete: undefined
});

export function showSecurityWarning(warningTimeSeconds: number, onComplete?: () => void) {
	securityWarningStore.set({
		show: true,
		warningTime: (warningTimeSecondsExt = warningTimeSeconds),
		onComplete
	});
}

export function hideSecurityWarning() {
	securityWarningStore.set({
		show: false,
		warningTime: warningTimeSecondsExt,
		onComplete: undefined
	});
}
