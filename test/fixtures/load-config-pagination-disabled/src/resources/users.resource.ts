import { defineResource } from '../../../../../src';
import { users } from '../db/users';

export const usersResource = defineResource({
  name: 'users',
  table: users,
  query: {
    pagination: false,
    filters: [{ field: 'name', operators: ['eq', 'ilike'] }],
    sorts: [{ field: 'name' }],
  },
});
