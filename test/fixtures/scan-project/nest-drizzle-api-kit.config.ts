import { defineApiKitConfig } from '../../../src';

export default defineApiKitConfig({
  outputPath: './src/resources/generated/api',
  dbProviderToken: 'database_connection',
  dbSchema: './src/db/db',
  resources: [],
});
