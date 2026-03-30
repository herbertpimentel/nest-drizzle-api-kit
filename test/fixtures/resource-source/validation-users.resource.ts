import { defineResource } from '../../../src';
import { users } from '../../../examples/basic/src/db/users';
import { createUserValidationSchema } from './validation-schemas';

export const validationUsersResource = defineResource({
  name: 'validated-user',
  table: users,
  functions: {
    create: {
      validation: createUserValidationSchema,
    },
  },
});
