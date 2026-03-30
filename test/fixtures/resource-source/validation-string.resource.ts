import { defineResource } from '../../../src';
import { tabelaCusta } from './tables';

export const validationStringResource = defineResource({
  name: 'validation-string',
  table: tabelaCusta as any,
  validation: {
    schema: './validation-schemas',
  },
});
