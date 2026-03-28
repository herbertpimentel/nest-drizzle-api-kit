# nest-drizzle-api-kit

Compile-time NestJS REST resource generator for Drizzle/Postgres.

Uses **Hygen** templates for file generation. Resource and root-module output is produced for an API ready to use.

Why ? Just because It boring as fuck to write such code 

## Current state

This repository is not a fully finished production yet.

Implemented:
- TS config and resource definition API
- validation + normalization pipeline
- Hygen-based generation pipeline
- CLI commands: `generate`, `watch`, `check`, `clean`
- runtime base classes
- template-based generation for:
  - controller
  - service
  - module
  - DTOs
  - metadata
  - root module
  - barrels

Still intentionally lightweight:
- deep Drizzle metadata inference
- robust import-path resolution for user-provided filters/guards/base-query classes

Current generated find path:
- generates direct per-resource Drizzle query code
- uses the target project's own schema/table types in generated services

Current limitation:
- `query.baseQuery` is not supported by the direct generated query path yet

## Install

```bash
npm install hygen nest-drizzle-api-kit
```

## Config

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
Generated services inject the database using `@Inject('<token>')`, so yourt NestJS project must register a provider with that exact token.

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
    new/
  root/
    new/
```

Each generator receives a serialized context JSON file and uses EJS inside Hygen templates to output the final source files.
This way the genenated source is predictable and well defined.
