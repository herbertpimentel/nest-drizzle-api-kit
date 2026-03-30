import type { ResourceHooksDefinition } from '../../../../../src';

export function normalizeUserInput() {}

export function publishCreatedEvent() {}

export const userHooks = {
  create: {
    before: [
      {
        use: normalizeUserInput,
        description: 'Normalize the create payload before persisting it.',
      },
    ],
    after: [publishCreatedEvent],
  },
} satisfies ResourceHooksDefinition;
