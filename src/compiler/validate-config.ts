import type {
  ApiKitConfig,
  ApiKitHooksDefinition,
  BodyInputDefinition,
  OutputDefinition,
  ParamsInputDefinition,
  QueryInputDefinition,
  ResourceDefinition,
  ResourceFunctionCommonDefinition,
  ResourceFunctionHooksDefinition,
  ResourceFunctionName,
  ResourceHookReference,
} from '../definition/types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function validateHookReference(entry: ResourceHookReference, messagePrefix: string): void {
  if (typeof entry === 'string') {
    assert(entry.trim().length > 0, `${messagePrefix} cannot be empty.`);
    return;
  }

  assert(typeof entry === 'object' && entry !== null, `${messagePrefix} must be a string path or an object with path/name/description.`);
  assert(typeof entry.path === 'string' && entry.path.trim().length > 0, `${messagePrefix}.path must be a non-empty string.`);

  if (entry.name !== undefined) {
    assert(typeof entry.name === 'string' && entry.name.trim().length > 0, `${messagePrefix}.name must be a non-empty string.`);
  }

  if (entry.description !== undefined) {
    assert(typeof entry.description === 'string' && entry.description.trim().length > 0, `${messagePrefix}.description must be a non-empty string.`);
  }
}

function validateHookPhase(phase: ResourceFunctionHooksDefinition | undefined, messagePrefix: string): void {
  if (!phase) {
    return;
  }

  if (phase.before !== undefined) {
    assert(Array.isArray(phase.before), `${messagePrefix}.before must be an array.`);
    phase.before.forEach((entry, index) => validateHookReference(entry, `${messagePrefix}.before[${index}]`));
  }

  if (phase.after !== undefined) {
    assert(Array.isArray(phase.after), `${messagePrefix}.after must be an array.`);
    phase.after.forEach((entry, index) => validateHookReference(entry, `${messagePrefix}.after[${index}]`));
  }
}

function validateConfigHooks(hooks: ApiKitHooksDefinition, messagePrefix: string): void {
  validateHookPhase(hooks, messagePrefix);

  const functionNames: ResourceFunctionName[] = ['find', 'findOne', 'create', 'update', 'delete'];
  for (const functionName of functionNames) {
    validateHookPhase(hooks[functionName], `${messagePrefix}.${functionName}`);
  }
}

function validateDtoDefinition(
  definition: BodyInputDefinition | QueryInputDefinition | ParamsInputDefinition | OutputDefinition | undefined,
  messagePrefix: string,
): void {
  if (!definition) {
    return;
  }

  assert(typeof definition === 'object' && definition !== null, `${messagePrefix} must be an object.`);

  if (definition.mode === 'custom') {
    assert('class' in definition && typeof definition.class === 'function', `${messagePrefix}.class must be a class reference.`);
    return;
  }

  if ('include' in definition && definition.include !== undefined) {
    assert(Array.isArray(definition.include), `${messagePrefix}.include must be an array.`);
  }

  if ('exclude' in definition && definition.exclude !== undefined) {
    assert(Array.isArray(definition.exclude), `${messagePrefix}.exclude must be an array.`);
  }

  if ('required' in definition && definition.required !== undefined) {
    assert(Array.isArray(definition.required), `${messagePrefix}.required must be an array.`);
  }

  if ('optional' in definition && definition.optional !== undefined) {
    assert(Array.isArray(definition.optional), `${messagePrefix}.optional must be an array.`);
  }
}

function validateFunctionCommon(
  definition: ResourceFunctionCommonDefinition | undefined,
  functionName: ResourceFunctionName,
  resourceName: string,
): void {
  if (!definition) {
    return;
  }

  if (definition.guards !== undefined) {
    assert(Array.isArray(definition.guards), `Resource "${resourceName}" function "${functionName}" guards must be an array.`);
  }

  if (definition.summary !== undefined) {
    assert(typeof definition.summary === 'string' && definition.summary.trim().length > 0, `Resource "${resourceName}" function "${functionName}" summary must be a non-empty string.`);
  }

  if (definition.description !== undefined) {
    assert(typeof definition.description === 'string' && definition.description.trim().length > 0, `Resource "${resourceName}" function "${functionName}" description must be a non-empty string.`);
  }

  if (definition.validation !== undefined) {
    assert(
      typeof definition.validation === 'string' || typeof definition.validation === 'object',
      `Resource "${resourceName}" function "${functionName}" validation must be a string module path or an imported schema reference.`,
    );

    if (typeof definition.validation === 'string') {
      assert(definition.validation.trim().length > 0, `Resource "${resourceName}" function "${functionName}" validation cannot be empty.`);
    } else {
      assert(definition.validation !== null, `Resource "${resourceName}" function "${functionName}" validation cannot be null.`);
    }
  }

  validateHookPhase(definition.hooks, `Resource "${resourceName}" function "${functionName}" hooks`);
}

function validateResource(resource: ResourceDefinition): void {
  assert(resource.name.trim().length > 0, 'Resource name is required.');
  assert(resource.table && typeof resource.table === 'object', `Resource "${resource.name}" must provide a table object.`);

  if (resource.basePath !== undefined) {
    assert(typeof resource.basePath === 'string' && resource.basePath.trim().length > 0, `Resource "${resource.name}" basePath must be a non-empty string.`);
  }

  if (resource.guards !== undefined) {
    assert(Array.isArray(resource.guards), `Resource "${resource.name}" guards must be an array.`);
  }

  if (resource.docs !== undefined) {
    assert(typeof resource.docs === 'object' && resource.docs !== null, `Resource "${resource.name}" docs must be an object.`);

    if (resource.docs.enabled !== undefined) {
      assert(typeof resource.docs.enabled === 'boolean', `Resource "${resource.name}" docs.enabled must be a boolean.`);
    }

    if (resource.docs.tags !== undefined) {
      assert(Array.isArray(resource.docs.tags), `Resource "${resource.name}" docs.tags must be an array of strings.`);
    }

    if (resource.docs.description !== undefined) {
      assert(typeof resource.docs.description === 'string' && resource.docs.description.trim().length > 0, `Resource "${resource.name}" docs.description must be a non-empty string.`);
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

  if (resource.query?.baseQuery) {
    throw new Error(`Resource "${resource.name}" uses query.baseQuery, which is not supported by the direct generated query path yet.`);
  }

  const find = resource.functions?.find;
  validateFunctionCommon(find, 'find', resource.name);
  validateDtoDefinition(find?.input, `Resource "${resource.name}" function "find" input`);
  validateDtoDefinition(find?.output, `Resource "${resource.name}" function "find" output`);

  const findOne = resource.functions?.findOne;
  validateFunctionCommon(findOne, 'findOne', resource.name);
  validateDtoDefinition(findOne?.input, `Resource "${resource.name}" function "findOne" input`);
  validateDtoDefinition(findOne?.output, `Resource "${resource.name}" function "findOne" output`);

  const create = resource.functions?.create;
  validateFunctionCommon(create, 'create', resource.name);
  validateDtoDefinition(create?.input, `Resource "${resource.name}" function "create" input`);
  validateDtoDefinition(create?.output, `Resource "${resource.name}" function "create" output`);
  if (create?.transactional !== undefined) {
    assert(typeof create.transactional === 'boolean', `Resource "${resource.name}" function "create" transactional must be a boolean.`);
  }

  const update = resource.functions?.update;
  validateFunctionCommon(update, 'update', resource.name);
  validateDtoDefinition(update?.input, `Resource "${resource.name}" function "update" input`);
  validateDtoDefinition(update?.output, `Resource "${resource.name}" function "update" output`);
  if (update?.transactional !== undefined) {
    assert(typeof update.transactional === 'boolean', `Resource "${resource.name}" function "update" transactional must be a boolean.`);
  }

  const deleteFunction = resource.functions?.delete;
  validateFunctionCommon(deleteFunction, 'delete', resource.name);
  validateDtoDefinition(deleteFunction?.input, `Resource "${resource.name}" function "delete" input`);
  if (deleteFunction?.transactional !== undefined) {
    assert(typeof deleteFunction.transactional === 'boolean', `Resource "${resource.name}" function "delete" transactional must be a boolean.`);
  }
}

export function validateApiKitConfig(config: ApiKitConfig): void {
  assert(config.outputPath.trim().length > 0, 'outputPath is required.');
  assert(Array.isArray(config.resources) && config.resources.length > 0, 'resources must be a non-empty array.');
  assert(
    typeof config.dbProviderToken === 'string' && config.dbProviderToken.trim().length > 0,
    'dbProviderToken is required. Your NestJS project must provide a matching provider token.',
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
    assert(typeof config.hooks === 'object' && config.hooks !== null, 'hooks, when provided, must be an object.');
    validateConfigHooks(config.hooks, 'hooks');
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
