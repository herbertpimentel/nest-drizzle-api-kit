# Custom Validation

This document covers the advanced validation extension points of `nest-drizzle-api-kit`.

If you only want the default setup, stay in the main [README](./README.md): point `functions.<name>.validation` to a Zod schema and the built-in Zod engine will be used automatically.

## Default model

Validation is configured per function:

```ts
export const usersResource = defineResource({
  name: 'user',
  table: users,
  functions: {
    create: {
      validation: './users.validation',
    },
  },
});
```

That module should default-export one schema for that function.

You can also use an imported schema reference:

```ts
import { createUserValidationSchema } from './users.validation';

export const usersResource = defineResource({
  name: 'user',
  table: users,
  functions: {
    create: {
      validation: createUserValidationSchema,
    },
  },
});
```

## Validation input shapes

The generated service validates these payloads:
- `find` -> query object
- `findOne` -> `{ params, query }`
- `create` -> body object
- `update` -> `{ params, body }`
- `delete` -> `{ params }`

## Default engine

The default engine is Zod.

You do not need to configure anything at the config level for the common case:
- if at least one function defines `validation`
- and you do not override `validation.engine`
- the generated code uses the built-in Zod engine

## Custom engines

Use a custom engine when:
- you want another validation library
- you want custom business validation code
- you want to interpret the schema value yourself

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
  The exact schema configured on that function.
- `input`
  The generated payload for that function.

The engine must return:
- `{ success: true, data }`
- or `{ success: false, errors }`

If validation fails, the generated service throws `BadRequestException(errors)`.

## Configuring a custom engine

Import reference:

```ts
export default defineApiKitConfig({
  outputPath: './src/generated/api',
  dbProviderToken: 'DRIZZLE_DB',
  validation: {
    engine: customValidationEngine,
  },
  resources: [usersResource],
});
```

Module path:

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

## Replacing Zod

Example with a `.parse()` style validator:

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

## Recommended mental model

- keep validation close to the function that uses it
- use the built-in Zod path unless you have a real reason not to
- treat custom engines as an integration boundary, not the common path
