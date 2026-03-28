import { defineResource } from '../../../../src';
import { users, usersRelations } from '../db/users';

export const usersResource = defineResource({
  name: 'user',
  table: users,
  relations: usersRelations,
  query: {
    filters: [
      { field: 'name', operators: ['eq', 'ilike'] },
      { field: 'email', operators: ['eq'] },
    ],
    sorts: [{ field: 'name' }],
    relations: [{ name: 'profile' }],
  },
});
