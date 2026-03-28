import { defineApiKitConfig } from '../../../src';
import { schema } from './src/db';
import { usersResource } from '../../../examples/basic/src/resources/users.resource';

export default defineApiKitConfig({
  outputPath: './src/generated/api',
  dbProviderToken: 'DATABASE',
  dbSchema: schema,
  resources: [usersResource],
});
