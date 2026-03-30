import { describe, expect, it } from 'vitest';
import { resolveResourceHooksSource, resolveResourceSource, resolveResourceValidationSchemaSource } from '../src/compiler/resource-source';

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

  it('resolves imported validation schema maps from the resource file', async () => {
    const { validationMapResource } = await import('./fixtures/resource-source/validation-map.resource');
    const source = resolveResourceValidationSchemaSource(validationMapResource);

    expect(source?.importKind).toBe('named');
    expect(source?.importName).toBe('userValidationSchemas');
    expect(source?.accessExpression).toBe('userValidationSchemas');
  });

  it('resolves string validation schema modules as default imports', async () => {
    const { validationStringResource } = await import('./fixtures/resource-source/validation-string.resource');
    const source = resolveResourceValidationSchemaSource(validationStringResource);

    expect(source?.importKind).toBe('default');
    expect(source?.importName).toBe('__apiKitValidationSchema');
    expect(source?.accessExpression).toBe('__apiKitValidationSchema');
    expect(source?.sourceFile.replace(/\\/g, '/')).toMatch(/test\/fixtures\/resource-source\/validation-schemas$/);
  });

  it('resolves imported hooks definitions from the resource file', async () => {
    const { hooksMapResource } = await import('./fixtures/resource-source/hooks-map.resource');
    const source = resolveResourceHooksSource(hooksMapResource);

    expect(source?.importKind).toBe('named');
    expect(source?.importName).toBe('userHooks');
    expect(source?.accessExpression).toBe('userHooks');
  });

  it('resolves string hooks modules as default imports', async () => {
    const { hooksStringResource } = await import('./fixtures/resource-source/hooks-string.resource');
    const source = resolveResourceHooksSource(hooksStringResource);

    expect(source?.importKind).toBe('default');
    expect(source?.importName).toBe('__apiKitResourceHooks');
    expect(source?.accessExpression).toBe('__apiKitResourceHooks');
    expect(source?.sourceFile.replace(/\\/g, '/')).toMatch(/test\/fixtures\/resource-source\/hooks-definitions$/);
  });
});
