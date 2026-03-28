import { describe, expect, it } from 'vitest';
import { resolveResourceSource } from '../src/compiler/resource-source';

describe('resolveResourceSource', () => {
  it('supports a direct table identifier', async () => {
    const { usersResource } = await import('../examples/basic/src/resources/users.resource');
    const source = resolveResourceSource(usersResource);

    expect(source.table.kind).toBe('named');
    expect(source.table.importName).toBe('users');
    expect(source.tableAccessExpression).toBe('users');
    expect(source.tableQueryName).toBe('users');
  });

  it('supports property-access table references', async () => {
    const { custaResource } = await import('./fixtures/resource-source/property-access.resource');
    const source = resolveResourceSource(custaResource);

    expect(source.table.kind).toBe('named');
    expect(source.table.importName).toBe('schema');
    expect(source.tableAccessExpression).toBe('schema.custa');
    expect(source.tableQueryName).toBe('custa');
  });

  it('supports casted table identifiers', async () => {
    const { custasResource } = await import('./fixtures/resource-source/cast-table.resource');
    const source = resolveResourceSource(custasResource);

    expect(source.table.kind).toBe('named');
    expect(source.table.localName).toBe('tabelaCusta');
    expect(source.tableAccessExpression).toBe('tabelaCusta');
    expect(source.tableQueryName).toBe('tabelaCusta');
  });
});
