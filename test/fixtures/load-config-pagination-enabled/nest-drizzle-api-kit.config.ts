import { defineApiKitConfig } from '../../../src';
import { usersResource } from './src/resources/users.resource';

export default defineApiKitConfig({
  outputPath: './src/generated/api',
  dbProviderToken: 'DATABASE',
  resources: [usersResource],
});
