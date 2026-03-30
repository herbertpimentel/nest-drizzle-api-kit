import { defineResource } from '../../../../../src';
import { users } from '../db/users';

export const usersResource = defineResource({
  name: 'user',
  table: users,
  docs: {
    enabled: true,
    tags: ['Users'],
  },
  functions: {
    create: {
      transactional: true,
      hooks: {
        before: [
          {
            path: './hooks/normalize-user-input',
            name: 'normalizeUserInput',
            description: 'Normalize the create payload before persisting it.',
          },
        ],
        after: ['./hooks/publish-created-event'],
      },
    },
  },
});
