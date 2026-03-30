# nest-drizzle-api-kit

Compile-time NestJS REST resource generator for Drizzle/Postgres.

Uses **Hygen** templates for file generation. Resource and root-module output is produced for an API ready to use.

Why ? Just because It is boring as fuck to write such code 

## Current state

This repository is not a fully finished production yet.

Implemented:
- TS config and resource definition API
- validation + normalization pipeline
- Hygen-based generation pipeline
- CLI commands: `init`, `scan`, `generate`, `watch`, `check`, `clean`
- runtime base classes
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

Each Resource is the contract that tells the generator what API to create for one table: route shape, enabled endpoints, DTO shape, query features, guards to apply, and OpenAPI metadata. The generated code changes because of the Resource definition.

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
- file and class names such as `UsersController`, `UsersService`, `FindUsersQueryDto`
- default route base path `/users`
- default CRUD endpoints
- generated DTO fields inferred from the Drizzle table
- id param type is inferred from primary key

### What a Resource can configure today

```ts
import { defineResource } from 'nest-drizzle-api-kit';
import { users } from '../db/users';

export const usersResource = defineResource({
  name: 'user',
  table: users,
  route: {
    basePath: 'admin/users',
  },
  endpoints: {
    find: { enabled: true },
    findOne: { enabled: true },
    create: { enabled: true },
    update: { enabled: true },
    delete: false,
  },
  dto: {
    create: {
      include: ['name', 'email', 'status'],
      optional: ['status'],
    },
    response: {
      exclude: ['passwordHash'],
    },
  },
  validation: {
    schema: './users.validation',
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
  openApi: {
    tag: 'Admin Users',
    summaryByEndpoint: {
      find: 'List users',
      findOne: 'Get one user',
      create: 'Create a user',
      update: 'Patch a user',
      delete: 'Remove a user',
    },
  },
});
```

### Capability by capability

- `name`
  Drives singular/plural naming for files, classes, operation ids, and default route path. `name: 'user'` becomes `UsersController`, `findUsers`, and `/users`.
- `table`
  Required. This is the Drizzle table used to infer DTO fields and to generate the service/query code.
- `route.basePath`
  Overrides the default route segment. Without it, the generator uses the kebab-cased plural resource name.
- `endpoints`
  Controls which CRUD handlers are emitted. Disabled endpoints are not generated into the controller.
- `dto.create`
  Controls the generated create DTO from table columns. You can use `include`, `exclude`, `required`, and `optional`.
- `dto.response`
  Controls which table columns appear in the generated response DTO.
- `validation.schema`
  Adds a validation step before the generated endpoint calls the service. It can point to a module path whose default export is a Zod schema, or to an imported schema object. It can also point to an object keyed by endpoint name such as `create`, `update`, or `find`.
- `query.pagination`
  Enables or disables paginated `find`, and lets you set `defaultPage`, `defaultPageSize`, and `maxPageSize`.
- `query.filters`
  Declares which fields can be searched and which operators are allowed per field.
- `query.sorts`
  Declares sortable fields and optional default sort order.
- `query.relations`
  Declares which relation names can be requested through `?include=...`.
- `guards.resource`
  Declares resource-wide Nest guards for the generated controller.
- `openApi.tag`
  Changes the `@ApiTags()` value on the generated controller.
- `openApi.summaryByEndpoint`
  Changes the `@ApiOperation({ summary })` text for each generated endpoint.

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

By default, DTOs are inferred from the Drizzle table:
- create DTO fields come from table columns
- nullable DB columns become `type | null`
- non-null columns without defaults are required in create DTOs
- columns with defaults, nullable columns, and primary keys become optional in create DTOs
- response DTO fields are generated from table columns too
- the id params DTO uses the primary key column, or falls back to `id`

Example of narrowing the create and response payloads:

```ts
dto: {
  create: {
    include: ['name', 'email', 'status'],
    required: ['name', 'email'],
    optional: ['status'],
  },
  response: {
    exclude: ['passwordHash'],
  },
}
```

### Validation schema

Validation is configured in two places:
- config-level `validation.engine`
- resource-level `validation.schema`

Current engine support:
- `zod`
- custom engines through the `ValidationEngine` interface

Default behavior is intentionally minimal:
- if a resource declares `validation.schema` and you do nothing else, the generated code uses the built-in Zod engine automatically
- You need to point to a Zod schema and the generated code will ensure it pass your validation schema before execute the underling endpoint code
- advanced custom-engine details live in [CUSTOM_VALIDATION.md](./CUSTOM_VALIDATION.md)

Shared schema for the whole resource:

```ts
export const usersResource = defineResource({
  name: 'user',
  table: users,
  validation: {
    schema: './users.validation',
  },
});
```

That module should default-export a Zod schema.

Zero-config default setup:

```ts
export const usersResource = defineResource({
  name: 'user',
  table: users,
  validation: {
    schema: './users.validation',
  },
});
```

No config-level validation block is required for that setup.

Endpoint-based schemas:

```ts
import { userValidationSchemas } from './users.validation';

export const usersResource = defineResource({
  name: 'user',
  table: users,
  validation: {
    schema: userValidationSchemas,
  },
});
```

Example endpoint map:

```ts
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

Current generated validation inputs are:
- `find` -> query object
- `findOne` -> `{ params, query }`
- `create` -> body object
- `update` -> `{ params, body }`
- `delete` -> `{ params }`

The generated controller adds a simple validation call before the underlying service operation. If the schema fails, it throws `BadRequestException` with your schema messages.


### Endpoint generation rules

Unless you disable them, a Resource generates:
- `GET /<basePath>` -> `find`
- `GET /<basePath>/:id` -> `findOne`
- `POST /<basePath>` -> `create`
- `PATCH /<basePath>/:id` -> `update`
- `DELETE /<basePath>/:id` -> `delete`

Example:

```ts
endpoints: {
  delete: false,
}
```

This disables delete handler code generation from the controller, while keeping the rest of the resource intact.

### TODO Road Map and Working in progress Fix

The Resource type already exposes some future-facing options, but they are not fully wired into the generated output yet. Based on the current implementation:
- `query.baseQuery` is rejected during validation and cannot be used yet
- `guards.byEndpoint` is typed and validated, but controller generation currently applies only `guards.resource`
- `dto.find`, `dto.findOne`, `dto.delete`, and custom DTO classes are typed, but the current templates still generate the query/id/update DTO files instead of swapping in custom classes
- `openApi.enabled`, `openApi.description`, and `openApi.descriptionByEndpoint` exist in the type surface, but current templates only use `openApi.tag` and `openApi.summaryByEndpoint`
- the generated find query DTO exposes `fields`, but the current generated query class does not apply field selection yet

So the safest mental model is:
- use Resource to drive route naming, endpoint enabling, generated create/response DTO shape, search/sort/include/pagination, controller guards at resource level, and OpenAPI tags/summaries
- treat the items in the list above as not implemented yet, even if they already appear in TypeScript types

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
