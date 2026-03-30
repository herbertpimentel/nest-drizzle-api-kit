# Custom Hooks

This document covers the hook extension points of `nest-drizzle-api-kit`.

If you only want the default path, stay in the main [README](./README.md): define a hook object, point `config.hooks` or `resource.hooks` to it, and the generated service will emit explicit `await hook(context)` calls around the operation.

## Default model

Hooks are plain functions.

They run in the generated service:
- after validation
- before the underlying query or mutation
- and again after the operation when `after` hooks are configured

You can configure them:
- globally in the config with `hooks`
- per resource with `resource.hooks`

## Hook definition shape

The hook shape is the same in config and resources.

```ts
import type { ResourceHooksDefinition } from 'nest-drizzle-api-kit';

export const userHooks = {
  before: [measureExecution],
  after: [trackMetrics],
  create: {
    before: [normalizeUserInput],
    after: [publishCreatedEvent],
  },
  update: {
    before: [checkCanUpdate],
  },
} satisfies ResourceHooksDefinition;
```

Supported keys:
- `before`
- `after`
- `find`
- `findOne`
- `create`
- `update`
- `delete`

Each endpoint key can contain:
- `before`
- `after`

## Hook entry forms

A hook entry can be:
- a hook function
- or an object with metadata

Plain function:

```ts
before: [measureExecution]
```

Metadata form:

```ts
before: [
  {
    use: normalizeUserInput,
    name: 'normalizeUserInput',
    description: 'Normalize the create payload before persisting it.',
  },
]
```

Metadata fields:
- `use`
  The actual hook function.
- `name`
  Optional emitted constant name in generated code. If omitted, the generator uses the function name when available.
- `description`
  Optional comment emitted above the generated hook call.

## Hook context

Hook functions receive a mutable context object:

```ts
import type { ResourceHookContext } from 'nest-drizzle-api-kit';

export async function normalizeUserInput(context: ResourceHookContext) {
  const input = context.input as { email?: string };

  if (typeof input.email === 'string') {
    input.email = input.email.trim().toLowerCase();
  }
}
```

Context fields:
- `db`
  The generated service database instance. When the endpoint is transactional, this is the Drizzle transaction object for that execution.
- `resourceName`
  The resource name from `defineResource({ name })`.
- `endpoint`
  One of `find`, `findOne`, `create`, `update`, `delete`.
- `state`
  A fresh `Map<string, unknown>` created for that one execution and shared across every hook in that method call.
- `input`
  The validated endpoint input when validation exists, otherwise the raw generated input.
- `result`
  Available after the underlying operation. `after` hooks can read or mutate it.

Hooks can be sync or async. The generated service always awaits them.

## Transactional endpoints

Only mutable endpoints support transactions:
- `create`
- `update`
- `delete`

Enable it per endpoint:

```ts
export const usersResource = defineResource({
  name: 'user',
  table: users,
  endpoints: {
    create: {
      transactional: true,
    },
    update: {
      transactional: true,
    },
  },
  hooks: userHooks,
});
```

When `transactional: true` is enabled:
- the generated service wraps the method in `this.db.transaction(async (tx) => { ... })`
- all hooks for that endpoint run inside the same transaction
- `context.db` points to `tx`
- the generated write uses `tx.insert(...)`, `tx.update(...)`, or `tx.delete(...)`
- if anything throws during hooks or the generated write, Drizzle rolls back the transaction
- if everything finishes successfully, Drizzle commits it

## Input shapes

The input shape matches the same shapes used by validation:
- `find` -> query object
- `findOne` -> `{ params, query }`
- `create` -> body object
- `update` -> `{ params, body }`
- `delete` -> `{ params }`

## Global and resource hooks together

Config hooks and resource hooks can be combined.

The generated order is:
- `config.before`
- `config.<endpoint>.before`
- `resource.before`
- `resource.<endpoint>.before`
- generated operation
- `resource.<endpoint>.after`
- `resource.after`
- `config.<endpoint>.after`
- `config.after`

That makes config hooks the outermost wrapper and resource hooks the more local wrapper.


## Module path vs imported object

Like validation, `hooks` can be configured as:
- a string module path
- an imported object reference

Module path:

```ts
hooks: './users.hooks'
```

That module should default-export the hook definition object.

Imported reference:

```ts
import { userHooks } from './users.hooks';

hooks: userHooks
```

## Recommended mental model

- use hooks for cross-cutting behavior around the generated operation
- use validation first, then let hooks work on already validated input
- put reusable metrics/audit/timing hooks in config-level `hooks`
- put business-specific behavior in `resource.hooks`
- use metadata only when you want clearer emitted names or comments
