import { defineApiKitConfig } from '../../../src';
import { usersResource } from './src/resources/users.resource';

export default defineApiKitConfig({
  outputPath: './src/generated/api',
  dbProviderToken: 'DATABASE',
  hooks: {
    before: ['./src/resources/hooks/measure-execution'],
    after: ['./src/resources/hooks/track-metrics'],
    create: {
      before: [
        {
          path: './src/resources/hooks/attach-audit-stamp',
          name: 'attachAuditStamp',
          description: 'Attach audit metadata to the validated create input.',
        },
      ],
    },
  },
  resources: [usersResource],
});
