import type { ResourceHooksDefinition } from '../../../src';

export function measureExecution() {}

export function normalizeUserInput() {}

export const userHooks = {
  before: [measureExecution],
  create: {
    before: [
      {
        use: normalizeUserInput,
        description: 'Normalize the create payload before insert.',
      },
    ],
  },
} satisfies ResourceHooksDefinition;

export default userHooks;
