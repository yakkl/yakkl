import type { PlanType } from "./types";

export const PlanMetadata: Record<PlanType, {
  label: string;
  color: string;
  priority: number;
  description: string;
}> = {
  trial: {
    label: 'Trial',
    color: 'yellow',
    priority: 1,
    description: 'Free 14-day access to Pro features',
  },
  standard: {
    label: 'Standard',
    color: 'red',
    priority: 2,
    description: 'Basic plan for all users',
  },
  pro: {
    label: 'Pro',
    color: 'green',
    priority: 3,
    description: 'Advanced wallet and analytics',
  },
  business: {
    label: 'Business',
    color: 'blue',
    priority: 4,
    description: 'Multi-account tools for teams',
  },
  institution: {
    label: 'Institution',
    color: 'indigo',
    priority: 5,
    description: 'Access controls and audit logging',
  },
  enterprise: {
    label: 'Enterprise',
    color: 'purple',
    priority: 6,
    description: 'Custom contracts and integrations',
  },
};

