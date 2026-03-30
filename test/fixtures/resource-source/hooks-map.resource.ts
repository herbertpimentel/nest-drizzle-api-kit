import { defineResource } from '../../../src';
import { schema } from './schema';
import { userHooks } from './hooks-definitions';

export const hooksMapResource = defineResource({
  name: 'hooks-map',
  table: schema.custa,
  hooks: userHooks,
});
