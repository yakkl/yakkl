import type { YakklBlocked } from '$lib/common/interfaces';
import { getObjectFromLocalStorage } from '$lib/common/storage';
import { log } from '$lib/common/logger-wrapper';
import Dexie from 'dexie';

// class YakklDatabase extends Dexie {
//   domains: Dexie.Table<DomainEntry, string>;

//   constructor() {
//     super("YakklDatabase");
//     this.version(1).stores({
//         domains: 'domain'
//     });
//     this.domains = this.table("domains");
//   }
// }
// const yakklDb = new YakklDatabase();

// export function initializeYakklDatabase() {
//   const yakklDb = new YakklDatabase();
//   yakklDb.version(1).stores({
//     domains: 'domain'
//   });
//   yakklDb.domains = yakklDb.table("domains");
// }

interface DomainEntry {
	domain: string;
}

class BlacklistDatabase extends Dexie {
	domains: Dexie.Table<DomainEntry, string>;

	constructor() {
		super('BlacklistDatabase');
		this.version(1).stores({
			domains: 'domain'
		});
		this.domains = this.table('domains');
	}
}

const db = new BlacklistDatabase();

export async function initializeBlacklistDatabase(override = false) {
	try {
		if (override) await db.domains.clear();
		const count = await db.domains.count();
		if (count === 0) {
			const response = await fetch('/data/lists.json');
			const data = await response.json();
			await db.domains.bulkAdd(data.blacklist.map((domain: string) => ({ domain })));
		}
	} catch (error) {
		log.warn('Warning initializing database', false, error);
	}
}

export async function isBlacklisted(domain: string): Promise<boolean> {
	try {
		const result = await db.domains.get({ domain });
		return !!result;
	} catch (error) {
		log.warn('Warning checking blacklist', false, error);
		return false;
	}
}

export async function checkDomain(domain: any): Promise<boolean | undefined> {
	try {
		const yakklBlockList = (await getObjectFromLocalStorage('yakklBlockList')) as YakklBlocked[];
		if (yakklBlockList) {
			if (
				yakklBlockList.find((obj: { domain: any }) => {
					return obj.domain === domain;
				})
			) {
				return Promise.resolve(true);
			}
		}
		return Promise.resolve(false);
	} catch (e) {
		log.error(e);
		Promise.reject(e);
	}
}
