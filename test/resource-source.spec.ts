import { describe, expect, it } from 'vitest';
import { resolveResourceImportedValueSource, resolveResourceSource } from '../src/compiler/resource-source';
import { normalizeApiKitConfig } from '../src/compiler/normalize-config';

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

  it('resolves imported function validation references from the resource file', async () => {
    const { validationMapResource } = await import('./fixtures/resource-source/validation-map.resource');
    const source = resolveResourceImportedValueSource(
      validationMapResource,
      ['functions', 'create', 'validation'],
      'functions.create.validation',
    );

    expect(source?.importKind).toBe('named');
    expect(source?.importName).toBe('createUserValidationSchema');
    expect(source?.accessExpression).toBe('createUserValidationSchema');
  });

  it('normalizes string function validation modules as default imports', async () => {
    const { validationStringResource } = await import('./fixtures/resource-source/validation-string.resource');
    const normalized = normalizeApiKitConfig({
      outputPath: './src/generated/api',
      dbProviderToken: 'DATABASE',
      resources: [validationStringResource],
    });

    const validation = normalized.resources[0]?.functions.create.validation;
    expect(validation?.importKind).toBe('default');
    expect(validation?.accessExpression).toBe('validationSchemas');
    expect(validation?.sourceFile.replace(/\\/g, '/')).toMatch(/test\/fixtures\/resource-source\/validation-schemas$/);
  });
});
