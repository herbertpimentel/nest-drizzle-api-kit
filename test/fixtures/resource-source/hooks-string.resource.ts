import { defineResource } from '../../../src';
import { schema } from './schema';

export const hooksStringResource = defineResource({
  name: 'hooks-string',
  table: schema.custa,
  hooks: './hooks-definitions',
});
