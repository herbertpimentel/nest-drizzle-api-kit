import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateProject } from '../src';
import { loadApiKitConfig } from '../src/compiler/load-config';
import { UsersQuery } from '../examples/basic/src/generated/api/users/users.query';

function buildPaginatedDb() {
  let capturedFindManyConfig: Record<string, unknown> | undefined;
  let capturedTotalWhere: unknown;

  const totalQuery = {
    where(condition: unknown) {
      capturedTotalWhere = condition;
      return Promise.resolve([{ total: 2 }]);
    },
    then: Promise.resolve([{ total: 2 }]).then.bind(Promise.resolve([{ total: 2 }])),
  };

  const db = {
    query: {
      users: {
        async findMany(config: Record<string, unknown>) {
          capturedFindManyConfig = config;
          return [];
        },
        async findFirst() {
          return undefined;
        },
      },
    },
    select: () => ({
      from: () => ({
        $dynamic: () => totalQuery,
      }),
    }),
  } as never;

  return {
    db,
    getCapturedFindManyConfig: () => capturedFindManyConfig,
    getCapturedTotalWhere: () => capturedTotalWhere,
  };
}

describe('generated query classes', () => {
  it('applies pagination, sorting, and filters in the paginated query path', async () => {
    const { db, getCapturedFindManyConfig, getCapturedTotalWhere } = buildPaginatedDb();
    const query = new UsersQuery(db);

    const result = await query.findMany({
      page: '3',
      pageSize: '20',
      sort: 'name,DESC',
      search: encodeURIComponent(
        JSON.stringify({
          name: { $ilike: '%john%' },
        }),
      ),
    });

    const capturedFindManyConfig = getCapturedFindManyConfig();

    expect(capturedFindManyConfig?.limit).toBe(20);
    expect(capturedFindManyConfig?.offset).toBe(40);
    expect(capturedFindManyConfig?.orderBy).toBeDefined();
    expect(capturedFindManyConfig?.where).toBeDefined();
    expect(getCapturedTotalWhere()).toBeDefined();
    expect(result.total).toBe(2);
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(20);
  });

  it('omits pagination but still applies sorting and filters when pagination is disabled', async () => {
    const fixtureDir = path.resolve(__dirname, 'fixtures/load-config-pagination-disabled');
    const generatedOutputDir = path.join(fixtureDir, 'src', 'generated');
    const previousCwd = process.cwd();

    await fs.rm(generatedOutputDir, { recursive: true, force: true });
    process.chdir(fixtureDir);

    try {
      const config = await loadApiKitConfig();
      await generateProject(config);

      const moduleUrl = `${pathToFileURL(path.join(generatedOutputDir, 'api', 'users', 'users.query.ts')).href}?t=${Date.now()}`;
      const { UsersQuery: NoPaginationUsersQuery } = (await import(moduleUrl)) as {
        UsersQuery: typeof UsersQuery;
      };

      let capturedFindManyConfig: Record<string, unknown> | undefined;
      const items = [{ id: 1, name: 'John' }];

      const query = new NoPaginationUsersQuery({
        query: {
          users: {
            async findMany(config: Record<string, unknown>) {
              capturedFindManyConfig = config;
              return items;
            },
            async findFirst() {
              return undefined;
            },
          },
        },
      } as never);

      const result = await query.findMany({
        sort: 'name,DESC',
        search: encodeURIComponent(
          JSON.stringify({
            name: { $ilike: '%john%' },
          }),
        ),
      });

      expect(result).toEqual(items);
      expect(Array.isArray(result)).toBe(true);
      expect(capturedFindManyConfig?.limit).toBeUndefined();
      expect(capturedFindManyConfig?.offset).toBeUndefined();
      expect(capturedFindManyConfig?.orderBy).toBeDefined();
      expect(capturedFindManyConfig?.where).toBeDefined();
    } finally {
      process.chdir(previousCwd);
      await fs.rm(generatedOutputDir, { recursive: true, force: true });
    }
  }, 20000);
});
