import { defineResource } from '../../../src';
import { tabelaCusta } from './tables';

export const custasResource = defineResource({
  name: 'custa',
  table: tabelaCusta as any,
});
