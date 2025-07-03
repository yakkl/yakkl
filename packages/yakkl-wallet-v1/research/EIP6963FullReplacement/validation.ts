// src/background/utils/validation.ts
export function validateTransaction(transaction: any): void {
	if (!transaction || typeof transaction !== 'object') {
		throw new Error('Invalid transaction object');
	}

	const requiredFields = ['from', 'to'];
	for (const field of requiredFields) {
		if (!transaction[field]) {
			throw new Error(`Missing required field: ${field}`);
		}
	}

	if (transaction.value) {
		if (!/^0x[0-9a-fA-F]+$/.test(transaction.value)) {
			throw new Error('Invalid transaction value format');
		}
	}
}
