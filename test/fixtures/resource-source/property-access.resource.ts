import { defineResource } from '../../../src';
import { schema } from './schema';

export const custaResource = defineResource({
  name: 'custa',
  table: schema.custa,
});
