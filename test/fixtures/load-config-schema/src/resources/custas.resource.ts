import { defineResource } from '../../../../../src';
import { schema } from '../db';

export const custasResource = defineResource({
  name: 'custas',
  table: schema.custas as any,
});
