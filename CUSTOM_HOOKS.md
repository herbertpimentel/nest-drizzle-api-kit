# Custom Hooks

This document covers the hook extension points of `nest-drizzle-api-kit`.

If you only want the common path, stay in the main [README](./README.md): define config hooks in `defineApiKitConfig({ hooks })`, define function hooks in `defineResource({ functions: { ... } })`, and the generated service will emit direct `await hook(context)` calls around the operation.

## Default model

Hooks are configured in two places:
- config-level `hooks`
- function-level `functions.<name>.hooks`

Config hooks wrap every resource or one specific function:

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

Resource function hooks stay local to that function:

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

## Hook entry forms

A hook entry can be:
- a string path to the hook file
- or an object with metadata

String path:

```ts
before: ['./hooks/measure-execution']
```

Metadata form:

```ts
before: [
  {
    path: './hooks/normalize-user-input',
    name: 'normalizeUserInput',
    description: 'Normalize the create payload before persisting it.',
  },
]
```

The hook module should default-export the hook function.

Metadata fields:
- `path`
  Path to the hook file.
- `name`
  Optional friendly emitted import/call name.
- `description`
  Optional comment emitted above the generated hook call.

## Hook context

Hook functions receive a mutable context object:

```ts
import type { ResourceHookContext } from 'nest-drizzle-api-kit';

export default async function normalizeUserInput(context: ResourceHookContext) {
  const input = context.input as { email?: string };

  if (typeof input.email === 'string') {
    input.email = input.email.trim().toLowerCase();
  }
}
```

Context fields:
- `db`
  The generated service database instance. When the function is transactional, this is the Drizzle transaction object for that execution.
- `resourceName`
  The resource name from `defineResource({ name })`.
- `functionName`
  One of `find`, `findOne`, `create`, `update`, `delete`.
- `state`
  A fresh `Map<string, unknown>` created for that one execution and shared across every hook in that method call.
- `input`
  The validated input when validation exists, otherwise the raw generated input.
- `result`
  Available after the underlying operation. `after` hooks can read or mutate it.

Hooks can be sync or async. The generated service always awaits them.

## Hook ordering

The generated order is:
- `config.before`
- `config.<function>.before`
- `resource.functions.<function>.hooks.before`
- generated operation
- `resource.functions.<function>.hooks.after`
- `config.<function>.after`
- `config.after`

That keeps config hooks as the outer wrapper and resource hooks as the local wrapper.

## Input shapes

The hook input shape matches validation:
- `find` -> query object
- `findOne` -> `{ params, query }`
- `create` -> body object
- `update` -> `{ params, body }`
- `delete` -> `{ params }`

## Transactional functions

Only mutable functions support transactions:
- `create`
- `update`
- `delete`

Enable it per function:

```ts
export const usersResource = defineResource({
  name: 'user',
  table: users,
  functions: {
    create: {
      transactional: true,
      hooks: {
        before: ['./hooks/normalize-user-input'],
      },
    },
  },
});
```

When `transactional: true` is enabled:
- the generated service wraps the method in `this.db.transaction(async (tx) => { ... })`
- all hooks for that function run inside the same transaction
- `context.db` points to `tx`
- if anything throws during hooks or the generated write, Drizzle rolls back
- if everything finishes successfully, Drizzle commits

## Recommended mental model

- use config hooks for cross-cutting concerns like metrics, timing, and audit stamping
- use function hooks for resource-specific behavior
- let validation run first, then let hooks work on already validated input
- use metadata only when you want clearer emitted names or comments
