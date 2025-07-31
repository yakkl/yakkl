import type { PlanType } from './types';

export const PlanMetadata: Record<
	PlanType,
	{
		label: string;
		color: string;
		priority: number;
		description: string;
	}
> = {
	trial: {
		label: 'Trial',
		color: 'yellow',
		priority: 1,
		description: 'Free 14-day access to Pro features'
	},
	founding_member: {
		label: 'Founding Member',
		color: 'blue',
		priority: 2,
		description: 'Founding member plan which includes the YAKKL PRO plan'
	},
	early_adopter: {
		label: 'Early Adopter',
		color: 'red',
		priority: 3,
		description: 'Early adopter plan which includes the YAKKL PRO plan'
	},
	explorer_member: {
		label: 'Basic Member',
		color: 'red',
		priority: 4,
		description: 'Basic member plan for all users'
	},
	yakkl_pro: {
		label: 'YAKKL PRO',
		color: 'green',
		priority: 5,
		description: 'Advanced wallet security and analytics'
	},
	business: {
		label: 'Business',
		color: 'blue',
		priority: 6,
		description: 'Multi-account tools for teams'
	},
	institution: {
		label: 'Institution',
		color: 'indigo',
		priority: 7,
		description: 'Access controls and audit logging'
	},
	enterprise: {
		label: 'Enterprise',
		color: 'purple',
		priority: 8,
		description: 'Custom contracts and integrations'
	}
};
