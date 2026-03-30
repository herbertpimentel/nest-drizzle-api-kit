# nest-drizzle-api-kit

Compile-time NestJS REST resource generator for Drizzle/Postgres.

Uses **Hygen** templates for file generation. Resource and root-module output is produced for an API ready to use.

Why ? Just because It is boring as fuck to write such code 

## Current state

This repository is not a fully finished production yet.

Implemented:
- TS config and resource definition API
- validation + hooks pipeline
- Hygen-based generation pipeline
- CLI commands: `init`, `scan`, `generate`, `watch`, `check`, `clean`
- template-based generation for:
  - controller
  - service
  - module
  - DTOs
  - metadata
  - root module


Current generated find path:
- generates direct per-resource Drizzle query code
- uses the target project's own schema/table types in generated services


## Install

```bash
npm install hygen nest-drizzle-api-kit
```

## Config

Quick scaffold:

```bash
npx nest-drizzle-api-kit init
```

`init` setup your project with `nest-drizzle-api-kit.config.ts`, and then offers to scan Drizzle tables to scaffold your resources.

Interactive table scan:

```bash
npx nest-drizzle-api-kit scan
```

`scan` looks for exported Drizzle table definitions, lets you choose which ones should become resource files, scaffolds those `*.resource.ts` files, so you don't have to do it manually.

Minimal config:

```ts
import { defineApiKitConfig } from 'nest-drizzle-api-kit';
import { usersResource } from './src/resources/users.resource';

export default defineApiKitConfig({
  outputPath: './src/generated/api',
  dbProviderToken: 'DRIZZLE_DB',
  resources: [usersResource],
});
```

`dbProviderToken` is required.
Generated services inject the database using `@Inject('<token>')`, so your NestJS project must register a provider with that exact token to save the world.

Example:

```ts
providers: [
  {
    provide: 'DRIZZLE_DB',
    useValue: db,
  },
]
```

If you want the your project to apply its own formatter or lint fixer after generation, set `postGenerateCommand`:

```ts
export default defineApiKitConfig({
  outputPath: './src/generated/api',
  dbProviderToken: 'DRIZZLE_DB',
  postGenerateCommand: 'pnpm exec prettier --write ./src/generated/api',
  resources: [usersResource],
});
```

## Resource

`defineResource()` is the rockstar of this library.

Each Resource is the contract that tells the generator what API to create for one table: route shape, enabled functions, input/output DTOs, query capabilities, guards, docs, validation, and hooks. The generated code changes because of the Resource definition.

Minimal example:

```ts
import { defineResource } from 'nest-drizzle-api-kit';
import { users } from '../db/users';

export const usersResource = defineResource({
  name: 'user',
  table: users,
});
```

That small object already drives:
- file and class names such as `UsersController`, `UsersService`, `FindUsersInputDto`
- default route base path `/users`
- default CRUD functions
- generated DTO fields inferred from the Drizzle table
- id param type is inferred from primary key

### What a Resource can configure today

```ts
import { defineResource } from 'nest-drizzle-api-kit';
import { users } from '../db/users';

export const usersResource = defineResource({
  name: 'user',
  basePath: 'admin/users',
  table: users,
  guards: [AdminGuard],
  docs: {
    enabled: true,
    tags: ['Admin Users'],
    description: 'Administrative users resource.',
  },
  query: {
    pagination: {
      defaultPage: 1,
      defaultPageSize: 20,
      maxPageSize: 100,
    },
    filters: [
      { field: 'name', operators: ['eq', 'ilike'] },
      { field: 'email', operators: ['eq'] },
      { field: 'status', operators: ['eq', 'in', 'isNull'] },
      { field: 'createdAt', operators: ['gte', 'lte'] },
    ],
    sorts: [
      { field: 'name' },
      { field: 'createdAt', defaultOrder: 'desc' },
    ],
    relations: [{ name: 'profile' }],
  },
  functions: {
    find: {
      input: {
        mode: 'generate',
      },
      output: {
        mode: 'generate',
        exclude: ['passwordHash'],
      },
      guards: [ListUsersGuard],
      summary: 'List users',
      description: 'Returns filtered users.',
    },
    findOne: {
      output: {
        mode: 'generate',
        exclude: ['passwordHash'],
      },
      summary: 'Get one user',
      description: 'Returns one user by id.',
    },
    create: {
      transactional: true,
      input: {
        mode: 'generate',
        include: ['name', 'email', 'status'],
        optional: ['status'],
      },
      output: {
        mode: 'generate',
        exclude: ['passwordHash'],
      },
      validation: './users.validation',
      hooks: {
        before: [
          {
            path: './hooks/normalize-user-input',
            name: 'normalizeUserInput',
            description: 'Normalize the create payload before persisting it.',
          },
        ],
        after: ['./hooks/publish-created-event'],
      },
      summary: 'Create a user',
      description: 'Creates a user and returns the inserted row.',
    },
    update: {
      input: {
        mode: 'generate',
        include: ['name', 'email', 'status'],
        optional: ['name', 'email', 'status'],
      },
      output: {
        mode: 'generate',
        exclude: ['passwordHash'],
      },
      summary: 'Patch a user',
    },
    delete: {
      enabled: false,
      summary: 'Remove a user',
    },
  },
});
```

### Capability by capability

- `name`
  Drives singular/plural naming for files, classes, operation ids, and default route path. `name: 'user'` becomes `UsersController`, `findUsers`, and `/users`.
- `basePath`
  Overrides the default route segment. Without it, the generator uses the kebab-cased plural resource name.
- `table`
  Required. This is the Drizzle table used to infer DTO fields and to generate the service/query code.
- `guards`
  Declares resource-wide Nest guards for the generated controller.
- `docs`
  Replaces the old `openApi` block. `docs.tags` drives `@ApiTags(...)`, `docs.enabled` turns method-level Swagger decorators on or off, and `docs.description` is emitted into the generated resource metadata.
- `query.pagination`
  Enables or disables paginated `find`, and lets you set `defaultPage`, `defaultPageSize`, and `maxPageSize`.
- `query.filters`
  Declares which fields can be searched and which operators are allowed per field.
- `query.sorts`
  Declares sortable fields and optional default sort order.
- `query.relations`
  Declares which relation names can be requested through `?include=...`.
- `functions`
  This is the center of the Resource. Every generated API function lives here:
  - `find`
  - `findOne`
  - `create`
  - `update`
  - `delete`

Each function can configure:
- `enabled`
  Turns generation for that function on or off.
- `input`
  The function input DTO. This replaces the old root-level `dto.<function>`.
- `output`
  The function output DTO. This replaces the old root-level `dto.response`.
- `guards`
  Function-specific Nest guards emitted on that controller method.
- `summary`
  Swagger summary for that controller method.
- `description`
  Swagger description for that controller method.
- `validation`
  A direct schema reference or schema module path for that function.
- `hooks`
  Before/after hook references for that function.
- `transactional`
  Only for `create`, `update`, and `delete`. Wraps hooks and the underlying write in the same Drizzle transaction.

### Query capabilities exposed by `Resource.query`

The generated `find` and `findOne` query classes support:
- pagination with `page` and `pageSize`
- `sort` as `field,ASC`, `field,DESC`, or `-field`
- `include` for whitelisted relations
- `search` as a JSON string
- nested `$and` and `$or` groups inside `search`

Supported filter operators in the current implementation:
- `eq`
- `ne`
- `gt`
- `gte`
- `lt`
- `lte`
- `like`
- `ilike`
- `in`
- `isNull`

Example query config:

```ts
query: {
  filters: [
    { field: 'name', operators: ['eq', 'ilike'] },
    { field: 'status', operators: ['eq', 'in'] },
    { field: 'createdAt', operators: ['gte', 'lte'] },
  ],
  sorts: [
    { field: 'name' },
    { field: 'createdAt', defaultOrder: 'desc' },
  ],
  relations: [{ name: 'profile' }, { name: 'roles' }],
}
```

Example requests that this enables:

```txt
GET /users?page=1&pageSize=20
GET /users?sort=createdAt,DESC
GET /users?sort=-createdAt
GET /users?include=profile
GET /users?include=profile,roles
GET /users?search={"name":{"$ilike":"%john%"}}
GET /users?search={"$or":[{"status":{"$eq":"active"}},{"email":{"$eq":"john@example.com"}}]}
```

### DTO generation rules

By default, generated DTOs are inferred from the Drizzle table:
- `functions.find.input`
  Generates the query DTO used by `find`, and reused by `findOne` for the query string.
- `functions.create.input`
  Generates the create body DTO.
- `functions.update.input`
  Generates the update body DTO.
- `functions.find.output`
  Generates the `find` response DTO.
- `functions.findOne.output`
  Generates the `findOne` response DTO.
- `functions.create.output`
  Generates the `create` response DTO.
- `functions.update.output`
  Generates the `update` response DTO.

For generated body DTOs:
- nullable DB columns become `type | null`
- non-null columns without defaults are required
- columns with defaults, nullable columns, and primary keys become optional
- `include`, `exclude`, `required`, and `optional` let you override the default shape

Example:

```ts
functions: {
  create: {
    input: {
      mode: 'generate',
      include: ['name', 'email', 'status'],
      required: ['name', 'email'],
      optional: ['status'],
    },
    output: {
      mode: 'generate',
      exclude: ['passwordHash'],
    },
  },
}
```

### Validation schema

Validation is configured in two places:
- config-level `validation.engine`
- function-level `validation`

Current engine support:
- `zod`
- custom engines through the `ValidationEngine` interface

Default behavior is intentionally minimal:
- if any function declares `validation` and you do nothing else, the generated code uses the built-in Zod engine automatically
- you only need to point to a Zod schema, and the generated service will validate before executing the underlying operation
- advanced custom-engine details live in [CUSTOM_VALIDATION.md](./CUSTOM_VALIDATION.md)

Per-function validation:

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

That module should default-export a Zod schema.

Zero-config default setup:

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

No config-level validation block is required for that setup.

Current generated validation inputs are:
- `find` -> query object
- `findOne` -> `{ params, query }`
- `create` -> body object
- `update` -> `{ params, body }`
- `delete` -> `{ params }`

The generated service emits explicit endpoint-specific schema selection and validates before the underlying operation. If the schema fails, it throws `BadRequestException` with your schema messages.

### Hooks

Hooks are configured in two places:
- config-level `hooks`
- function-level `functions.<name>.hooks`

Hooks gives you the ability to extend the behavior adding your custom code to be executed before or afetr the underliing service operation:
- validation resolves first
- we wrap a context that is passed down for your hook
- then we call your hook code before and after the operation
- advanced hook details live in [CUSTOM_HOOKS.md](./CUSTOM_HOOKS.md)

Example resource function hooks:

```ts
export const usersResource = defineResource({
  name: 'user',
  table: users,
  functions: {
    create: {
      hooks: {
        before: [
          './hooks/measure-execution',
          {
            path: './hooks/normalize-user-input',
            name: 'normalizeUserInput',
            description: 'Normalize the create payload before persisting it.',
          },
        ],
        after: ['./hooks/publish-created-event'],
      },
    },
  },
});
```

Example config-level hooks:

```ts
export default defineApiKitConfig({
  outputPath: './src/generated/api',
  dbProviderToken: 'DRIZZLE_DB',
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
```

Hook behavior:
- hooks can be sync or async
- `before` hooks receive the validated input for that endpoint
- hooks can mutate `context.input`
- `after` hooks can read or mutate `context.result`
- every execution gets a fresh `state: Map<string, unknown>` shared across all hooks in that method call
- hooks also receive `db`, `resourceName`, and `functionName`
- when `create`, `update`, or `delete` is configured with `transactional: true`, `context.db` is the Drizzle transaction object for that execution

Generated order:
- `config.before`
- `config.<function>.before`
- `resource.functions.<function>.hooks.before`
- generated operation
- `resource.functions.<function>.hooks.after`
- `config.<function>.after`
- `config.after`

The generated service keeps this explicit and visible, with direct imports and `await hookName(context)` calls inside each method.

### Transactional mutable endpoints

`create`, `update`, and `delete` can opt into a Drizzle transaction:

```ts
functions: {
  create: {
    transactional: true,
  },
  update: {
    transactional: true,
  },
}
```

When `transactional: true` is enabled:
- the generated service wraps the method body in `this.db.transaction(async (tx) => { ... })`
- hooks for that endpoint also run inside the same transaction
- `context.db` inside hooks points to `tx`
- if every hook and the underlying write finish successfully, Drizzle commits
- if any hook or the generated write throws, Drizzle rolls the transaction back


### Endpoint generation rules

Unless you disable them, a Resource generates:
- `GET /<basePath>` -> `find`
- `GET /<basePath>/:id` -> `findOne`
- `POST /<basePath>` -> `create`
- `PATCH /<basePath>/:id` -> `update`
- `DELETE /<basePath>/:id` -> `delete`

Example:

```ts
functions: {
  delete: {
    enabled: false,
  },
}
```

This disables delete handler code generation from the controller while keeping the rest of the resource intact.

### Current limitations

Based on the current implementation:
- `query.baseQuery` is rejected during validation and cannot be used yet
- the generated `fields` query parameter is exposed in the DTO, but the generated query class does not apply field selection yet

## Local development

```bash
npm install
npm run generate -- ./examples/basic/nest-drizzle-api-kit.config.ts
```

## Templates

Templates live under:

```txt
_templates/
  resource/
  root/
```

Each generator receives a serialized context JSON file and uses EJS inside Hygen templates to output the final source files.
This way the genenated source is predictable and well defined.
