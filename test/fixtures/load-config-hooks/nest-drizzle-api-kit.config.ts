import { defineApiKitConfig } from '../../../src';
import { globalHooks } from './src/resources/global-hooks';
import { usersResource } from './src/resources/users.resource';

export default defineApiKitConfig({
  outputPath: './src/generated/api',
  dbProviderToken: 'DATABASE',
  hooks: globalHooks,
  resources: [usersResource],
});
