import { defineResource } from '../../../src';
import { users } from '../../../examples/basic/src/db/users';
import { createUserValidationSchema } from './validation-schemas';

export const validationMapResource = defineResource({
  name: 'validation-map',
  table: users,
  functions: {
    create: {
      validation: createUserValidationSchema,
    },
  },
});
