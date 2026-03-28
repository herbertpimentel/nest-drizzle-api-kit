import { defineApiKitConfig } from '../../../src';
import { custasResource } from './src/resources/custas.resource';

export default defineApiKitConfig({
  outputPath: './src/generated/api',
  dbProviderToken: 'DATABASE',
  resources: [custasResource],
});
