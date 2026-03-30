import { defineApiKitConfig } from '../../../src';
import { usersResource } from '../../../examples/basic/src/resources/users.resource';
import { customValidationEngine } from './custom-engine';

export default defineApiKitConfig({
  outputPath: './src/generated/api',
  dbProviderToken: 'DATABASE',
  validation: {
    engine: customValidationEngine,
  },
  resources: [usersResource],
});
