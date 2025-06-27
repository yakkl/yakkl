/**
 * Error thrown when a premium feature is accessed without proper plan
 */
export class UpgradeRequiredError extends Error {
	public readonly feature: string;
	public readonly planRequired: string;
	public readonly code: string = 'UPGRADE_REQUIRED';

	constructor(message: string, feature?: string, planRequired: string = 'PRO') {
		super(message);
		this.name = 'UpgradeRequiredError';
		this.feature = feature || 'Unknown Feature';
		this.planRequired = planRequired;

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, UpgradeRequiredError);
		}
	}

	/**
	 * Convert to a plain object for serialization
	 */
	toJSON() {
		return {
			name: this.name,
			message: this.message,
			feature: this.feature,
			planRequired: this.planRequired,
			code: this.code,
			stack: this.stack
		};
	}

	/**
	 * Create user-friendly error message
	 */
	getUserMessage(): string {
		return `This feature requires a ${this.planRequired} plan. Please upgrade to continue.`;
	}
}
