import { defineResource } from '../../../../../src';
import { users } from '../db/users';
import { userHooks } from './users.hooks';

export const usersResource = defineResource({
  name: 'user',
  table: users,
  endpoints: {
    create: {
      transactional: true,
    },
  },
  hooks: userHooks,
});
