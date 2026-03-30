import { defineResource } from '../../../src';
import { tabelaCusta } from './tables';
import { userValidationSchemas } from './validation-schemas';

export const validationMapResource = defineResource({
  name: 'validation-map',
  table: tabelaCusta as any,
  validation: {
    schema: userValidationSchemas,
  },
});
