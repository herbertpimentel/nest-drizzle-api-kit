import { defineResource } from '../../../../src';
import { users } from '../db/users';

export const usersResource = defineResource({
  name: 'user',
  table: users,
  query: {
    filters: [
      { field: 'name', operators: ['eq', 'ilike'] },
      { field: 'email', operators: ['eq'] },
    ],
    sorts: [{ field: 'name' }],
    relations: [{ name: 'profile' }],
  },
});
