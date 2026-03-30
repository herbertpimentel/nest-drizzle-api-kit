import type {
  ApiKitConfig,
  ResourceDefinition,
  ResourceEndpointName,
  ResourceHookEntry,
  ResourceHookPhaseDefinition,
  ResourceHooksDefinition,
} from '../definition/types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function validateHookEntry(entry: ResourceHookEntry, messagePrefix: string): void {
  if (typeof entry === 'function') {
    return;
  }

  assert(typeof entry === 'object' && entry !== null, `${messagePrefix} must be a hook function or a { use, name?, description? } object.`);
  assert('use' in entry && typeof entry.use === 'function', `${messagePrefix}.use must be a hook function.`);

  if ('name' in entry && entry.name !== undefined) {
    assert(typeof entry.name === 'string' && entry.name.trim().length > 0, `${messagePrefix}.name must be a non-empty string.`);
  }

  if ('description' in entry && entry.description !== undefined) {
    assert(
      typeof entry.description === 'string' && entry.description.trim().length > 0,
      `${messagePrefix}.description must be a non-empty string.`,
    );
  }
}

function validateHookPhase(phase: ResourceHookPhaseDefinition | undefined, messagePrefix: string): void {
  if (!phase) {
    return;
  }

  if (phase.before !== undefined) {
    assert(Array.isArray(phase.before), `${messagePrefix}.before must be an array of hook entries.`);
    phase.before.forEach((entry, index) => validateHookEntry(entry, `${messagePrefix}.before[${index}]`));
  }

  if (phase.after !== undefined) {
    assert(Array.isArray(phase.after), `${messagePrefix}.after must be an array of hook entries.`);
    phase.after.forEach((entry, index) => validateHookEntry(entry, `${messagePrefix}.after[${index}]`));
  }
}

function validateHooksDefinition(hooks: ResourceHooksDefinition, messagePrefix: string): void {
  validateHookPhase(hooks, messagePrefix);

  const endpointNames: ResourceEndpointName[] = ['find', 'findOne', 'create', 'update', 'delete'];
  for (const endpointName of endpointNames) {
    validateHookPhase(hooks[endpointName], `${messagePrefix}.${endpointName}`);
  }
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

  if (resource.hooks !== undefined) {
    assert(
      typeof resource.hooks === 'string' || typeof resource.hooks === 'object',
      `Resource "${resource.name}" hooks must be a string module path or an imported hooks definition reference.`,
    );
    if (typeof resource.hooks === 'string') {
      assert(resource.hooks.trim().length > 0, `Resource "${resource.name}" hooks cannot be empty.`);
    } else {
      assert(resource.hooks !== null, `Resource "${resource.name}" hooks cannot be null.`);
      validateHooksDefinition(resource.hooks, `Resource "${resource.name}" hooks`);
    }
  }

  const endpointNames: ResourceEndpointName[] = ['find', 'findOne', 'create', 'update', 'delete'];

  for (const endpointName of endpointNames) {
    const endpointValue = resource.endpoints ? (resource.endpoints as Partial<Record<ResourceEndpointName, unknown>>)[endpointName] : undefined;
    const endpoint = typeof endpointValue === 'object' && endpointValue !== null
      ? endpointValue as { enabled?: boolean; transactional?: boolean }
      : undefined;
    const endpointGuards = resource.guards?.byEndpoint?.[endpointName];
    const endpointHooks = typeof resource.hooks === 'object' && resource.hooks !== null ? resource.hooks[endpointName] : undefined;
    const endpointDisabled = endpointValue === false || endpoint?.enabled === false;
    if (endpointDisabled && endpointGuards?.length) {
      throw new Error(`Resource "${resource.name}" configures guards for disabled endpoint "${endpointName}".`);
    }
    if (endpointDisabled && (endpointHooks?.before?.length || endpointHooks?.after?.length)) {
      throw new Error(`Resource "${resource.name}" configures hooks for disabled endpoint "${endpointName}".`);
    }

    if (endpoint && ('transactional' in endpoint)) {
      assert(typeof endpoint.transactional === 'boolean', `Resource "${resource.name}" endpoint "${endpointName}" transactional must be a boolean.`);
      assert(
        endpointName === 'create' || endpointName === 'update' || endpointName === 'delete',
        `Resource "${resource.name}" endpoint "${endpointName}" does not support transactional.`,
      );
    }

    if (endpointDisabled && endpoint && 'transactional' in endpoint && endpoint.transactional) {
      throw new Error(`Resource "${resource.name}" configures transactional for disabled endpoint "${endpointName}".`);
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
  if (config.hooks !== undefined) {
    assert(typeof config.hooks === 'string' || typeof config.hooks === 'object', 'hooks, when provided, must be a string module path or an imported hooks definition reference.');
    if (typeof config.hooks === 'string') {
      assert(config.hooks.trim().length > 0, 'hooks cannot be empty.');
    } else {
      assert(config.hooks !== null, 'hooks cannot be null.');
      validateHooksDefinition(config.hooks, 'hooks');
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
