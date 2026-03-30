import { defineResource } from '../../../src';
import { users } from '../../../examples/basic/src/db/users';
import { userValidationSchemas } from './validation-schemas';

export const validationUsersResource = defineResource({
  name: 'validated-user',
  table: users,
  validation: {
    schema: userValidationSchemas,
  },
});
