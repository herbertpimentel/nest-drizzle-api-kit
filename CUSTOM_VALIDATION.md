# Custom Validation

This document covers the advanced validation extension points of `nest-drizzle-api-kit`.

If you only want the default setup, stay in the main [README](./README.md): point `resource.validation.schema` to a Zod schema and the built-in Zod engine will be used automatically.

## Default model

The default flow is:
- define `validation.schema` in the Resource
- export a Zod schema, or an object keyed by endpoint name

Example:

```ts
import { defineResource } from 'nest-drizzle-api-kit';
import { users } from '../db/users';

export const usersResource = defineResource({
  name: 'user',
  table: users,
  validation: {
    schema: './users.validation',
  },
});
```

That module should default-export either:
- one Zod schema for the whole resource
- or an object keyed by endpoint name such as `find`, `findOne`, `create`, `update`, `delete`

## Validation input shape

The generated service calls validation before the service underlining operation.

The input shape passed into validation depends on the endpoint:
- `find` -> `query`
- `findOne` -> `{ params, query }`
- `create` -> `body`
- `update` -> `{ params, body }`
- `delete` -> `{ params }`

## Resource schema options

`resource.validation.schema` can be:
- a string module path
- an imported object reference

Example with module path:

```ts
validation: {
  schema: './users.validation',
}
```

Example with imported value:

```ts
import { userValidationSchemas } from './users.validation';

validation: {
  schema: userValidationSchemas,
}
```

Example endpoint map:

```ts
import { z } from 'zod';

export const userValidationSchemas = {
  find: z.object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).optional(),
  }),
  create: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  update: z.object({
    params: z.object({
      id: z.number().int().positive(),
    }),
    body: z.object({
      name: z.string().min(1).optional(),
    }),
  }),
};
```

## Custom engines

Custom engines are an advanced feature.

Use them when:
- you want to replace Zod with another library
- you want custom business validation code
- you want to interpret `validation.schema` with your own rules

The engine interface is:

```ts
import type { ValidationEngine } from 'nest-drizzle-api-kit';

export const customValidationEngine: ValidationEngine = {
  validate({ schema, input }) {
    return {
      success: true,
      data: input,
    };
  },
};
```

The engine receives:
- `schema`
  The final schema selected by the generator
- `input`
  The generated input payload for that endpoint

The engine must return:
- `{ success: true, data }`
- or `{ success: false, errors }`

If validation fails, the generated code throws `BadRequestException(errors)`.

## Configuring a custom engine

You can configure a custom engine by import reference:

```ts
import { defineApiKitConfig } from 'nest-drizzle-api-kit';
import { usersResource } from './src/resources/users.resource';
import { customValidationEngine } from './src/validation/custom-engine';

export default defineApiKitConfig({
  outputPath: './src/generated/api',
  dbProviderToken: 'DRIZZLE_DB',
  validation: {
    engine: customValidationEngine,
  },
  resources: [usersResource],
});
```

Or by module path:

```ts
export default defineApiKitConfig({
  outputPath: './src/generated/api',
  dbProviderToken: 'DRIZZLE_DB',
  validation: {
    engine: './src/validation/custom-engine',
  },
  resources: [usersResource],
});
```

For a module path, the module should default-export the engine.

## Replacing Zod with another library

To replace Zod with another library, keep the same Resource API and just change the engine.

Example with a `.parse()`-style validator:

```ts
import type { ValidationEngine } from 'nest-drizzle-api-kit';

export const parseBasedValidationEngine: ValidationEngine = {
  validate({ schema, input }) {
    try {
      return {
        success: true,
        data: (schema as { parse: (value: unknown) => unknown }).parse(input),
      };
    } catch (error) {
      return {
        success: false,
        errors: error,
      };
    }
  },
};
```

With this model:
- the Resource still points to `validation.schema`
- the generator resolves endpoint-based schema maps before calling the engine
- the engine only validates the final schema and input

## Important nuance

For the built-in Zod engine:
- one shared Zod schema validates the whole endpoint input
- an endpoint-keyed object is resolved by endpoint name
- if no matching schema exists for an endpoint, validation is skipped for that endpoint

For custom engines:
- the generator resolves which schema should be used
- the engine receives only the final schema and input
- the engine does not need to care which endpoint is being validated

## Recommended mental model

- use the default Zod flow unless you have a real reason not to
- keep `validation.schema` close to the Resource
- treat custom engines as an integration boundary, not the common path
