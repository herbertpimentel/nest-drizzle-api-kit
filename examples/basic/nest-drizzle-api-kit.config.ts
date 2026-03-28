import { defineApiKitConfig } from '../../src';
import { usersResource } from './src/resources/users.resource';
import { schema } from './src/db/db';

export default defineApiKitConfig({
  outputPath: './examples/basic/src/generated/api',
  dbProviderToken: 'DRIZZLE_DB',
  dbSchema: schema,
  // Optional: run the target project's formatter/linter after generation.
  // postGenerateCommand: 'pnpm exec prettier --write ./examples/basic/src/generated/api',
  resources: [usersResource],
});
