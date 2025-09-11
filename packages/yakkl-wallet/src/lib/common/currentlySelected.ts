import { STORAGE_YAKKL_CURRENTLY_SELECTED } from "./constants";
import type { YakklCurrentlySelected } from "./interfaces";
import { getObjectFromLocalStorage } from "./storage";
import { detectBrowserContext } from "./browserContext";
import { log } from "$lib/managers/Logger";
import { yakklCurrentlySelected } from "../models/dataModels";


export async function getYakklCurrentlySelected(
	id?: string,
	persona?: string
): Promise<YakklCurrentlySelected> {
	try {
		// Use context-aware storage for background context
		const context = detectBrowserContext();
		const isBackground = context === 'background';
		console.log(
			'[getYakklCurrentlySelected] Browser context:',
			context,
			'isBackground:',
			isBackground
		);

		// const value = isBackground
		// 	? await getFromStorage<YakklCurrentlySelected>(STORAGE_YAKKL_CURRENTLY_SELECTED)
		// 	: await getObjectFromLocalStorage<YakklCurrentlySelected>(STORAGE_YAKKL_CURRENTLY_SELECTED);

		const value = await getObjectFromLocalStorage<YakklCurrentlySelected>(
			STORAGE_YAKKL_CURRENTLY_SELECTED
		);

		console.log('[getYakklCurrentlySelected] Raw value from storage:', value);
		console.log('[getYakklCurrentlySelected] Value type:', typeof value);

		if (id && persona) {
			// TODO: Implement this later
		}

		// If no value or value is a string, return default values
		if (!value || typeof value === 'string') {
			console.warn(
				'[getYakklCurrentlySelected] No currently selected Yakkl found, using defaults',
				value
			);
			return yakklCurrentlySelected; // Default values - models/dataModels.ts
		}
		return value;
	} catch (error) {
		log.error('Error in getYakklCurrentlySelected:', false, error);
		throw error;
	}
}
