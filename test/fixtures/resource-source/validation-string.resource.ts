import { defineResource } from '../../../src';
import { users } from '../../../examples/basic/src/db/users';

export const validationStringResource = defineResource({
  name: 'validation-string',
  table: users,
  functions: {
    create: {
      validation: './validation-schemas',
    },
  },
});
