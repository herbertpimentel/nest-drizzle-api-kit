import type { ApiKitConfig, ResourceDefinition, ResourceEndpointName } from '../definition/types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function validateResource(resource: ResourceDefinition): void {
  assert(resource.name.trim().length > 0, 'Resource name is required.');
  assert(resource.table && typeof resource.table === 'object', `Resource "${resource.name}" must provide a table object.`);
  if (resource.validation) {
    assert(
      typeof resource.validation.schema === 'string' || typeof resource.validation.schema === 'object',
      `Resource "${resource.name}" validation.schema must be a string module path or an imported schema reference.`,
    );
    if (typeof resource.validation.schema === 'string') {
      assert(resource.validation.schema.trim().length > 0, `Resource "${resource.name}" validation.schema cannot be empty.`);
    } else {
      assert(resource.validation.schema !== null, `Resource "${resource.name}" validation.schema cannot be null.`);
    }
  }

  const endpointNames: ResourceEndpointName[] = ['find', 'findOne', 'create', 'update', 'delete'];

  for (const endpointName of endpointNames) {
    const endpoint = resource.endpoints?.[endpointName];
    const endpointGuards = resource.guards?.byEndpoint?.[endpointName];
    if (endpoint === false && endpointGuards?.length) {
      throw new Error(`Resource "${resource.name}" configures guards for disabled endpoint "${endpointName}".`);
    }
  }

  for (const filter of resource.query?.filters ?? []) {
    assert(filter.field.trim().length > 0, `Resource "${resource.name}" has a filter without a field.`);
    assert(filter.operators.length > 0, `Resource "${resource.name}" filter "${filter.field}" must declare at least one operator.`);
  }

  for (const sort of resource.query?.sorts ?? []) {
    assert(sort.field.trim().length > 0, `Resource "${resource.name}" has a sort without a field.`);
  }

  for (const relation of resource.query?.relations ?? []) {
    assert(relation.name.trim().length > 0, `Resource "${resource.name}" has an empty relation include name.`);
  }

  const baseQuery = resource.query?.baseQuery;
  if (baseQuery) {
    throw new Error(
      `Resource "${resource.name}" uses query.baseQuery, which is not supported by the direct generated query path yet.`,
    );
  }
}

export function validateApiKitConfig(config: ApiKitConfig): void {
  assert(config.outputPath.trim().length > 0, 'outputPath is required.');
  assert(Array.isArray(config.resources) && config.resources.length > 0, 'resources must be a non-empty array.');
  assert(
    typeof config.dbProviderToken === 'string' && config.dbProviderToken.trim().length > 0,
    'dbProviderToken is required. Your target NestJS project must provide a matching provider token.',
  );
  if (config.dbSchema !== undefined) {
    assert(
      typeof config.dbSchema === 'string' || typeof config.dbSchema === 'object',
      'dbSchema, when provided, must be either a string module path or an imported schema object.',
    );
    if (typeof config.dbSchema === 'string') {
      assert(config.dbSchema.trim().length > 0, 'dbSchema, when provided as a string, must be a non-empty module path.');
    }
  }
  if (config.postGenerateCommand !== undefined) {
    assert(
      typeof config.postGenerateCommand === 'string' && config.postGenerateCommand.trim().length > 0,
      'postGenerateCommand, when provided, must be a non-empty string.',
    );
  }
  if (config.validation !== undefined) {
    assert(typeof config.validation === 'object' && config.validation !== null, 'validation, when provided, must be an object.');
    if (config.validation.engine !== undefined) {
      assert(
        typeof config.validation.engine === 'string' || typeof config.validation.engine === 'object',
        'validation.engine must be "zod", a module path string, or an imported validation engine reference.',
      );
      if (typeof config.validation.engine === 'string') {
        assert(config.validation.engine.trim().length > 0, 'validation.engine cannot be empty.');
      } else {
        assert(config.validation.engine !== null, 'validation.engine cannot be null.');
        assert(
          'validate' in config.validation.engine && typeof config.validation.engine.validate === 'function',
          'validation.engine objects must implement a validate({ schema, input }) function.',
        );
      }
    }
  }

  const concreteResources = config.resources.filter((item): item is ResourceDefinition => typeof item !== 'string');

  const seenNames = new Set<string>();
  for (const resource of concreteResources) {
    validateResource(resource);
    if (seenNames.has(resource.name)) {
      throw new Error(`Duplicate resource name "${resource.name}".`);
    }
    seenNames.add(resource.name);
  }
}
