import type { ResourceHooksDefinition } from '../../../../../src';

export function measureExecution() {}

export function attachAuditStamp() {}

export function trackMetrics() {}

export const globalHooks = {
  before: [measureExecution],
  after: [trackMetrics],
  create: {
    before: [
      {
        use: attachAuditStamp,
        description: 'Attach audit metadata to the validated create input.',
      },
    ],
  },
} satisfies ResourceHooksDefinition;
