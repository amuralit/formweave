# FormWeave — Post-Build Improvement Plan

> Addresses 15 specific code-level findings from initial review.  
> Priority-ordered by real-world adoption risk.  
> Every fix includes exact code changes, affected files, and test criteria.

---

## Priority Classification

| Priority | Meaning | Timeline |
|----------|---------|----------|
| 🔴 P0 — Launch blocker | Will break real MCP integrations. Fix before any public release. | Immediate |
| 🟡 P1 — Pre-launch | Will degrade quality or cause bugs in common scenarios. Fix before Show HN. | Within 48h |
| 🟢 P2 — Post-launch | Won't break anything but should be fixed for credibility. | Week 1 post-launch |

---

## Fix #1: useFormField re-render cascade 🔴 P0

### The problem

Every `useFormField` call creates 4 separate `useSyncExternalStore` subscriptions. Zustand's `subscribe` fires on **every** state update (any field change). The snapshot function `() => store.getState().values[path]` returns a new object reference on each call because `getState()` creates a new snapshot. This means:

- User types in field A
- Zustand fires `subscribe` for ALL subscribers
- Every field's `useSyncExternalStore` runs its snapshot function
- React compares old vs new snapshot — but since it's a new object each time, it always differs
- **Every field re-renders on every keystroke in any field**

This is exactly the performance catastrophe RJSF has, and the #1 reason we built FormWeave.

### Affected files

- `packages/react/src/hooks/useFormField.ts`

### Exact fix

Replace all 4 separate `useSyncExternalStore` calls with a single `useStoreWithEqualityFn` call using Zustand's `shallow` comparator:

```typescript
// packages/react/src/hooks/useFormField.ts

import { useStoreWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import { useFormContext } from './useFormContext';
import type { FormFieldState } from '@formweave/core';

export function useFormField(path: string): FormFieldState {
  const { store } = useFormContext();

  // Single subscription with shallow equality — only re-renders when THIS field's data changes
  const fieldState = useStoreWithEqualityFn(
    store,
    (state) => ({
      value: state.values[path],
      error: state.errors[path],
      touched: state.touched[path] ?? false,
      aiPrefilled: state.aiPrefilled[path] ?? false,
    }),
    shallow, // shallow compare each property — won't re-render if values are identical
  );

  const setValue = useCallback(
    (value: unknown) => {
      store.getState().setValue(path, value);
    },
    [store, path],
  );

  const setTouched = useCallback(
    (touched: boolean) => {
      store.getState().setTouched(path, touched);
    },
    [store, path],
  );

  return {
    ...fieldState,
    setValue,
    setTouched,
  };
}
```

### Why this works

- `useStoreWithEqualityFn` is Zustand's recommended approach for derived selectors
- `shallow` compares each property of the returned object individually
- When field B changes, field A's selector returns `{ value: "same", error: undefined, touched: false, aiPrefilled: false }` — shallow compare sees no difference — **no re-render**
- Only when field A's own value, error, touched, or aiPrefilled changes does it re-render

### Additional dependency

Add `zustand/traditional` and `zustand/shallow` to the package dependencies. These are already included in the `zustand` package but need explicit imports:

```json
// packages/react/package.json
{
  "dependencies": {
    "zustand": "^5.0.0"
  }
}
```

No additional install needed — `zustand/traditional` and `zustand/shallow` are subpath exports of the main `zustand` package.

### Test criteria

```typescript
// packages/react/src/__tests__/useFormField.test.tsx

it('should not re-render field B when field A changes', () => {
  const renderCountA = { current: 0 };
  const renderCountB = { current: 0 };

  function FieldA() {
    renderCountA.current++;
    const { value, setValue } = useFormField('fieldA');
    return <input value={value || ''} onChange={(e) => setValue(e.target.value)} />;
  }

  function FieldB() {
    renderCountB.current++;
    const { value } = useFormField('fieldB');
    return <span>{value}</span>;
  }

  render(
    <FormProvider schema={schema} values={{ fieldA: '', fieldB: 'hello' }}>
      <FieldA />
      <FieldB />
    </FormProvider>
  );

  // Type in field A
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } });

  expect(renderCountA.current).toBe(2); // initial + change
  expect(renderCountB.current).toBe(1); // initial only — NO re-render
});
```

### Effort: 1 hour

---

## Fix #2: Nested path validation 🔴 P0

### The problem

`validateField` does `schema.properties?.[path]` which only resolves top-level fields. Nested paths like `address.street` or `config.timeout` — which appear in every schema with `type: "object"` properties — silently skip validation.

### Affected files

- `packages/core/src/validation.ts`
- `packages/core/src/utils.ts` (new file for path utilities)

### Exact fix

Create a `getFieldSchema` utility that walks dot-separated paths:

```typescript
// packages/core/src/utils.ts

import type { JSONSchema7 } from 'json-schema';

/**
 * Resolves a dot-separated path to the sub-schema for that field.
 * e.g., getFieldSchema(schema, 'address.street') walks:
 *   schema.properties.address.properties.street
 */
export function getFieldSchema(
  rootSchema: JSONSchema7,
  path: string,
): JSONSchema7 | undefined {
  const segments = path.split('.');
  let current: JSONSchema7 | undefined = rootSchema;

  for (const segment of segments) {
    if (!current) return undefined;

    // Handle object properties
    if (current.type === 'object' && current.properties) {
      current = current.properties[segment] as JSONSchema7 | undefined;
      continue;
    }

    // Handle array items (segment is numeric index — skip to items schema)
    if (current.type === 'array' && current.items && !isNaN(Number(segment))) {
      current = current.items as JSONSchema7;
      continue;
    }

    // Handle array items properties (e.g., 'attendees.0.email')
    if (current.type === 'array' && current.items) {
      const itemSchema = current.items as JSONSchema7;
      if (itemSchema.properties) {
        current = itemSchema.properties[segment] as JSONSchema7 | undefined;
        continue;
      }
    }

    return undefined;
  }

  return current;
}

/**
 * Checks if a field at the given path is required.
 * Must check the PARENT schema's `required` array, not the field schema itself.
 */
export function isFieldRequired(
  rootSchema: JSONSchema7,
  path: string,
): boolean {
  const segments = path.split('.');
  const fieldName = segments.pop()!;
  
  // Walk to the parent schema
  let parent: JSONSchema7 | undefined = rootSchema;
  for (const segment of segments) {
    if (!parent?.properties) return false;
    parent = parent.properties[segment] as JSONSchema7 | undefined;
  }

  return Array.isArray(parent?.required) && parent.required.includes(fieldName);
}
```

Update `validateField`:

```typescript
// packages/core/src/validation.ts

import { getFieldSchema, isFieldRequired } from './utils';

export function validateField(
  rootSchema: JSONSchema7,
  path: string,
  value: unknown,
): string | undefined {
  const fieldSchema = getFieldSchema(rootSchema, path);
  if (!fieldSchema) return undefined;

  // Required check — look at parent's required array
  if (isFieldRequired(rootSchema, path)) {
    if (value === undefined || value === null || value === '') {
      return `${humanizeFieldName(path.split('.').pop()!)} is required`;
    }
  }

  // Type-specific validation using the resolved field schema
  // ... rest of validation logic uses fieldSchema instead of schema.properties[path]
}
```

### Test criteria

```typescript
it('validates nested paths correctly', () => {
  const schema = {
    type: 'object',
    properties: {
      address: {
        type: 'object',
        required: ['street'],
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
        },
      },
    },
  };

  expect(validateField(schema, 'address.street', '')).toBe('Street is required');
  expect(validateField(schema, 'address.city', '')).toBeUndefined();
  expect(validateField(schema, 'address.street', '123 Main St')).toBeUndefined();
});
```

### Effort: 2 hours

---

## Fix #3: $ref / $defs resolution 🔴 P0

### The problem

Real MCP tool schemas use `$ref` extensively. Example from a real GitHub MCP server:

```json
{
  "type": "object",
  "properties": {
    "assignee": { "$ref": "#/$defs/GitHubUser" },
    "labels": { "type": "array", "items": { "$ref": "#/$defs/Label" } }
  },
  "$defs": {
    "GitHubUser": { "type": "string", "description": "GitHub username" },
    "Label": { "type": "string", "description": "Label name" }
  }
}
```

FormWeave currently passes `$ref` through without resolving it, producing broken forms with no widgets for those fields.

### Affected files

- `packages/core/src/dereference.ts` (new file)
- `packages/core/src/analyze.ts` (add dereferencing as Step 0)

### Exact fix

```typescript
// packages/core/src/dereference.ts

import type { JSONSchema7 } from 'json-schema';

/**
 * Recursively resolves all $ref pointers in a JSON Schema.
 * Only handles internal references (#/$defs/... and #/definitions/...).
 * External $ref (URLs) are left as-is with a console warning.
 * 
 * Handles circular references by tracking visited $ref paths
 * and returning the original $ref on the second encounter.
 */
export function dereferenceSchema(schema: JSONSchema7): JSONSchema7 {
  const defs = schema.$defs || schema.definitions || {};
  const visited = new Set<string>();

  function resolve(node: unknown): unknown {
    if (node === null || node === undefined || typeof node !== 'object') {
      return node;
    }

    if (Array.isArray(node)) {
      return node.map(resolve);
    }

    const obj = node as Record<string, unknown>;

    // Handle $ref
    if (typeof obj.$ref === 'string') {
      const ref = obj.$ref;

      // Only handle internal references
      if (!ref.startsWith('#/')) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[FormWeave] External $ref not supported: ${ref}`);
        }
        return obj;
      }

      // Circular reference guard
      if (visited.has(ref)) {
        return obj;
      }
      visited.add(ref);

      // Resolve the reference
      const path = ref.replace('#/', '').split('/');
      let resolved: unknown = schema;
      for (const segment of path) {
        if (resolved && typeof resolved === 'object') {
          resolved = (resolved as Record<string, unknown>)[segment];
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[FormWeave] Could not resolve $ref: ${ref}`);
          }
          visited.delete(ref);
          return obj;
        }
      }

      visited.delete(ref);

      // Merge any sibling properties with the resolved schema
      // (e.g., { "$ref": "#/$defs/User", "description": "The assignee" })
      const { $ref, ...siblings } = obj;
      const resolvedNode = resolve(resolved);
      if (typeof resolvedNode === 'object' && resolvedNode !== null && Object.keys(siblings).length > 0) {
        return { ...resolvedNode, ...siblings };
      }
      return resolvedNode;
    }

    // Recursively resolve all properties
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip $defs and definitions — they're lookup tables, not rendered
      if (key === '$defs' || key === 'definitions') {
        result[key] = value;
        continue;
      }
      result[key] = resolve(value);
    }
    return result;
  }

  return resolve(schema) as JSONSchema7;
}
```

Add to the analysis pipeline:

```typescript
// packages/core/src/analyze.ts — modify analyzeSchema

import { dereferenceSchema } from './dereference';

export function analyzeSchema(rawSchema: JSONSchema7, options?: AnalyzeOptions): FieldDefinition[] {
  // Step 0: Dereference all $ref pointers
  const schema = dereferenceSchema(rawSchema);

  // Step 1: Extract top-level fields (existing code)
  // ... rest of pipeline works on dereferenced schema
}
```

### Test criteria

```typescript
it('resolves $ref to $defs', () => {
  const schema = {
    type: 'object',
    properties: {
      user: { $ref: '#/$defs/User' },
    },
    $defs: {
      User: { type: 'string', description: 'Username' },
    },
  };

  const result = dereferenceSchema(schema);
  expect(result.properties.user).toEqual({ type: 'string', description: 'Username' });
});

it('resolves nested $ref in arrays', () => {
  const schema = {
    type: 'object',
    properties: {
      labels: { type: 'array', items: { $ref: '#/$defs/Label' } },
    },
    $defs: {
      Label: { type: 'object', properties: { name: { type: 'string' }, color: { type: 'string' } } },
    },
  };

  const result = dereferenceSchema(schema);
  expect(result.properties.labels.items.type).toBe('object');
  expect(result.properties.labels.items.properties.name.type).toBe('string');
});

it('handles circular $ref without infinite loop', () => {
  const schema = {
    type: 'object',
    properties: {
      node: { $ref: '#/$defs/TreeNode' },
    },
    $defs: {
      TreeNode: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          children: { type: 'array', items: { $ref: '#/$defs/TreeNode' } },
        },
      },
    },
  };

  // Should not throw or hang
  const result = dereferenceSchema(schema);
  expect(result.properties.node.type).toBe('object');
});

it('merges sibling properties with $ref', () => {
  const schema = {
    type: 'object',
    properties: {
      assignee: { $ref: '#/$defs/User', description: 'Who to assign' },
    },
    $defs: {
      User: { type: 'string' },
    },
  };

  const result = dereferenceSchema(schema);
  expect(result.properties.assignee.type).toBe('string');
  expect(result.properties.assignee.description).toBe('Who to assign');
});
```

### Effort: 3 hours

---

## Fix #4: oneOf / anyOf discriminated unions 🟡 P1

### The problem

Schemas using `oneOf` for discriminated unions are very common in MCP tools:

```json
{
  "properties": {
    "notification_type": { "type": "string", "enum": ["email", "sms", "push"] }
  },
  "oneOf": [
    { "if": { "properties": { "notification_type": { "const": "email" } } },
      "then": { "properties": { "email_address": { "type": "string", "format": "email" } } } },
    { "if": { "properties": { "notification_type": { "const": "sms" } } },
      "then": { "properties": { "phone_number": { "type": "string" } } } }
  ]
}
```

Currently, FormWeave ignores `oneOf` except in the `if`/`then`/`else` conditional handler, which only handles `allOf`-wrapped conditionals.

### Affected files

- `packages/core/src/conditionals.ts`
- `packages/core/src/analyze.ts`

### Exact fix

Detect discriminated unions in `oneOf`/`anyOf` and generate conditional field visibility:

```typescript
// packages/core/src/discriminated-union.ts (new file)

import type { JSONSchema7 } from 'json-schema';
import type { ConditionalRule } from './types';

/**
 * Detect discriminated unions in oneOf/anyOf.
 * A discriminated union has:
 * - A shared discriminator property (e.g., "type") with const/enum values
 * - Different properties in each branch based on the discriminator value
 */
export function extractDiscriminatedUnions(schema: JSONSchema7): ConditionalRule[] {
  const rules: ConditionalRule[] = [];
  const variants = schema.oneOf || schema.anyOf;

  if (!variants || !Array.isArray(variants)) return rules;

  // Strategy 1: Each variant has a property with a `const` value (explicit discriminator)
  const discriminator = findDiscriminator(variants as JSONSchema7[]);
  if (discriminator) {
    for (const variant of variants as JSONSchema7[]) {
      const constValue = getConstValue(variant, discriminator);
      if (constValue === undefined) continue;

      const branchFields = extractBranchFields(variant, discriminator);
      if (branchFields.length === 0) continue;

      rules.push({
        controllingField: discriminator,
        condition: { const: constValue },
        showFields: branchFields,
        hideFields: [], // computed by the renderer by diffing against other branches
      });
    }
  }

  // Strategy 2: Variants wrapped in if/then (common pattern)
  for (const variant of variants as JSONSchema7[]) {
    if (variant.if && variant.then) {
      const ifProps = (variant.if as JSONSchema7).properties;
      if (ifProps) {
        const controllingField = Object.keys(ifProps)[0];
        const condition = ifProps[controllingField] as JSONSchema7;
        const thenProps = ((variant.then as JSONSchema7).properties) || {};
        rules.push({
          controllingField,
          condition: { const: condition.const ?? condition.enum?.[0] },
          showFields: Object.keys(thenProps),
          hideFields: [],
        });
      }
    }
  }

  return rules;
}

function findDiscriminator(variants: JSONSchema7[]): string | undefined {
  // Find a property name that appears in every variant with a `const` value
  if (variants.length === 0) return undefined;

  const firstProps = Object.keys((variants[0] as JSONSchema7).properties || {});
  
  for (const prop of firstProps) {
    const allHaveConst = variants.every((v) => {
      const schema = (v as JSONSchema7).properties?.[prop] as JSONSchema7 | undefined;
      return schema && (schema.const !== undefined || schema.enum?.length === 1);
    });
    if (allHaveConst) return prop;
  }

  return undefined;
}

function getConstValue(variant: JSONSchema7, discriminator: string): unknown {
  const propSchema = variant.properties?.[discriminator] as JSONSchema7 | undefined;
  if (!propSchema) return undefined;
  return propSchema.const ?? propSchema.enum?.[0];
}

function extractBranchFields(variant: JSONSchema7, exclude: string): string[] {
  const props = variant.properties || {};
  return Object.keys(props).filter((k) => k !== exclude);
}
```

Wire into the analysis pipeline:

```typescript
// packages/core/src/analyze.ts

import { extractDiscriminatedUnions } from './discriminated-union';

// In analyzeSchema, after extractConditionals:
const conditionals = [
  ...extractConditionals(schema),
  ...extractDiscriminatedUnions(schema),
];
```

### Test criteria

```typescript
it('detects oneOf discriminated union', () => {
  const schema = {
    type: 'object',
    properties: { type: { type: 'string', enum: ['email', 'sms'] } },
    oneOf: [
      { properties: { type: { const: 'email' }, email: { type: 'string' } } },
      { properties: { type: { const: 'sms' }, phone: { type: 'string' } } },
    ],
  };

  const rules = extractDiscriminatedUnions(schema);
  expect(rules).toHaveLength(2);
  expect(rules[0].controllingField).toBe('type');
  expect(rules[0].condition).toEqual({ const: 'email' });
  expect(rules[0].showFields).toContain('email');
});
```

### Effort: 4 hours

---

## Fix #5: Stale values prop sync 🔴 P0

### The problem

When an agent streams updated tool arguments (the primary use case in Glean, CopilotKit, etc.), the `values` prop changes but the Zustand store doesn't update. The form shows stale data.

### Affected files

- `packages/react/src/components/Form.tsx`

### Exact fix

```typescript
// packages/react/src/components/Form.tsx

// After store creation, add a sync effect:
const mergedInitialValues = useMemo(
  () => ({ ...(defaultValues || {}), ...(initialValues || {}) }),
  [defaultValues, initialValues],
);

// Sync store when values prop changes (agent streaming updates)
useEffect(() => {
  if (storeRef.current) {
    const currentValues = storeRef.current.getState().values;
    const newValues = mergedInitialValues;

    // Only update fields that the user hasn't touched
    const touched = storeRef.current.getState().touched;
    const updates: Record<string, unknown> = {};
    let hasUpdates = false;

    for (const [key, value] of Object.entries(newValues)) {
      if (!touched[key] && currentValues[key] !== value) {
        updates[key] = value;
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      storeRef.current.getState().setValues({
        ...currentValues,
        ...updates,
      });
      // Mark newly synced fields as AI-prefilled
      for (const key of Object.keys(updates)) {
        storeRef.current.getState().setAiPrefilled(key, true);
      }
    }
  }
}, [mergedInitialValues]);
```

### Why "only untouched fields"

If the user has already edited the `summary` field and the agent sends a new `summary` value, we should NOT overwrite the user's edit. Only fields the user hasn't touched get updated. This is the correct human-in-the-loop UX — the user's intent takes priority over the agent's updates.

### Test criteria

```typescript
it('syncs new values for untouched fields', () => {
  const { rerender } = render(
    <Form schema={schema} values={{ summary: 'Meeting' }} />
  );

  // Agent sends updated values
  rerender(<Form schema={schema} values={{ summary: 'Updated Meeting', location: 'Room 5' }} />);

  expect(screen.getByDisplayValue('Updated Meeting')).toBeTruthy();
  expect(screen.getByDisplayValue('Room 5')).toBeTruthy();
});

it('does not overwrite user-touched fields', () => {
  const { rerender } = render(
    <Form schema={schema} values={{ summary: 'Meeting' }} />
  );

  // User edits the summary
  fireEvent.change(screen.getByDisplayValue('Meeting'), { target: { value: 'My Custom Title' } });

  // Agent sends update — should NOT overwrite user's edit
  rerender(<Form schema={schema} values={{ summary: 'Agent Updated', location: 'Room 5' }} />);

  expect(screen.getByDisplayValue('My Custom Title')).toBeTruthy(); // preserved
  expect(screen.getByDisplayValue('Room 5')).toBeTruthy(); // new field synced
});
```

### Effort: 2 hours

---

## Fix #6: CI/CD, linting, formatting 🟡 P1

### The problem

No automated quality gates. Contributors will introduce inconsistencies on the first PR.

### Affected files (new)

- `.github/workflows/ci.yml`
- `.eslintrc.cjs`
- `.prettierrc`
- `.prettierignore`
- `turbo.json` (add lint task)

### Exact fix

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo typecheck
      - run: pnpm turbo lint
      - run: pnpm turbo test
      - run: pnpm turbo build
      - run: pnpm turbo size

  a11y:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build
      - run: npx playwright install --with-deps chromium
      - run: pnpm turbo test:e2e
```

```javascript
// .eslintrc.cjs
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // must be last — disables rules that conflict with prettier
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-hooks/exhaustive-deps': 'error',
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js'],
};
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

Add to turbo.json:

```json
{
  "pipeline": {
    "lint": { "dependsOn": [] },
    "typecheck": { "dependsOn": [] },
    "test": { "dependsOn": ["build"] },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "size": { "dependsOn": ["build"] },
    "test:e2e": { "dependsOn": ["build"] }
  }
}
```

### Effort: 2 hours

---

## Fix #7: ConditionalWrapper maxHeight clip 🟡 P1

### The problem

Hardcoded `maxHeight: 500px` in the expand animation clips content taller than 500px.

### Affected files

- `packages/widgets/src/components/ConditionalWrapper.tsx`

### Exact fix

Replace the `maxHeight` hack with modern `grid-template-rows` animation:

```typescript
// ConditionalWrapper.tsx

export function ConditionalWrapper({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: visible ? '1fr' : '0fr',
        opacity: visible ? 1 : 0,
        transition: 'grid-template-rows 200ms ease-out, opacity 150ms ease-out',
      }}
    >
      <div style={{ overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
```

### Why `grid-template-rows` is better

- `0fr → 1fr` animates to the natural content height — no fixed maximum
- Works for any content height (5 fields, 50 fields, nested objects)
- GPU-accelerated via the compositor
- No JavaScript height measurement needed
- Supported in all modern browsers (Chrome 107+, Firefox 110+, Safari 16.4+)

### Test criteria

Render a conditional section with 20 fields (height > 500px). Verify all fields are visible and none are clipped.

### Effort: 30 minutes

---

## Fix #8: Email validation regex 🟢 P2

### The problem

Current regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` accepts invalid emails like `a@b.c` and `"@"@.x`.

### Affected files

- `packages/core/src/validation.ts`

### Exact fix

Delegate to the browser's built-in validation, with a regex fallback for non-browser environments:

```typescript
// packages/core/src/validation.ts

export function validateEmail(value: string): boolean {
  // Prefer browser's built-in validation (most spec-compliant)
  if (typeof document !== 'undefined') {
    const input = document.createElement('input');
    input.type = 'email';
    input.value = value;
    return input.validity.valid;
  }

  // Fallback for SSR/Node: RFC 5322 simplified
  // Intentionally stricter than the current regex
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(value);
}
```

### Effort: 30 minutes

---

## Fix #9: IPv6 validation 🟢 P2

### The problem

Regex only matches full-form IPv6, rejecting `::1`, `fe80::1`, etc.

### Affected files

- `packages/core/src/validation.ts`

### Exact fix

```typescript
// packages/core/src/validation.ts

export function validateIPv6(value: string): boolean {
  // Handle :: shorthand by expanding it
  const parts = value.split(':');
  
  // Basic structure check
  if (parts.length < 3 || parts.length > 8) return false;
  
  // Count :: occurrences (max 1)
  const doubleColonCount = (value.match(/::/g) || []).length;
  if (doubleColonCount > 1) return false;
  
  // Each part must be 0-4 hex chars (empty string allowed for ::)
  for (const part of parts) {
    if (part.length > 4) return false;
    if (part.length > 0 && !/^[0-9a-fA-F]+$/.test(part)) return false;
  }
  
  // Without ::, must have exactly 8 groups
  if (doubleColonCount === 0 && parts.length !== 8) return false;
  
  return true;
}
```

### Effort: 30 minutes

---

## Fix #10: Dead API surface (toolCacheTTL, toolTimeout, toolPolicy) 🟡 P1

### The problem

Props declared in FormProps type but never read or used. Consumers will see them in TypeScript autocomplete and try to use them.

### Affected files

- `packages/react/src/components/Form.tsx`
- `packages/core/src/types.ts`

### Decision: Implement, don't remove

These are important features documented in the implementation plan (Section 16). They should work.

### Exact fix

Wire the props into the tool enhancement layer:

```typescript
// packages/react/src/hooks/useToolEnhancement.ts

export function useToolEnhancement(
  fields: FieldDefinition[],
  tools: MCPTool[],
  onToolCall?: OnToolCallFn,
  options?: {
    cacheTTL?: number;    // default: 300 (seconds)
    timeout?: number;     // default: 2000 (ms)
    policy?: { allowed?: string[]; denied?: string[] };
  }
) {
  const cache = useRef(new Map<string, { data: unknown; expiry: number }>());
  const { cacheTTL = 300, timeout = 2000, policy } = options || {};

  // Filter tools by policy
  const allowedTools = useMemo(() => {
    if (!policy) return tools;
    return tools.filter((tool) => {
      if (policy.denied?.some((p) => matchGlob(tool.name, p))) return false;
      if (policy.allowed && !policy.allowed.some((p) => matchGlob(tool.name, p))) return false;
      return true;
    });
  }, [tools, policy]);

  // Tool call wrapper with cache + timeout
  const cachedToolCall = useCallback(async (name: string, args: Record<string, unknown>) => {
    const cacheKey = `${name}:${JSON.stringify(args)}`;
    const cached = cache.current.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    if (!onToolCall) return undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const result = await Promise.race([
        onToolCall(name, args),
        new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new Error('timeout')));
        }),
      ]);
      
      cache.current.set(cacheKey, { data: result, expiry: Date.now() + cacheTTL * 1000 });
      clearTimeout(timeoutId);
      return result;
    } catch {
      clearTimeout(timeoutId);
      return undefined; // graceful degradation
    }
  }, [onToolCall, cacheTTL, timeout]);

  // ... rest of tool matching logic
}

function matchGlob(name: string, pattern: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  return regex.test(name);
}
```

### Effort: 3 hours

---

## Fix #11: Key stability in GroupedFieldRenderer 🟢 P2

### Affected files

- `packages/react/src/components/GroupedFieldRenderer.tsx`

### Exact fix

Use unique group identifiers based on sorted field paths:

```typescript
// Replace group-${field.group} with deterministic key
const groupKey = `group-${groupFields.map(f => f.path).sort().join(',')}`;
```

### Effort: 15 minutes

---

## Fix #12: SSR theme flash 🟡 P1

### The problem

During SSR, `detectTheme()` runs in a `useEffect` (client-only), so the initial server render has no theme tokens. On hydration, the form flashes from unstyled to styled.

### Affected files

- `packages/react/src/components/Form.tsx`
- `packages/theme/src/defaults.ts`

### Exact fix

Inject default theme tokens as inline styles during initial render (before useEffect runs):

```typescript
// packages/react/src/components/Form.tsx

const DEFAULT_INLINE_STYLES = {
  '--fw-primary': '#2563EB',
  '--fw-radius': '8px',
  '--fw-font': '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  '--fw-bg-card': '#FFFFFF',
  '--fw-bg-surface': '#F9F9FB',
  '--fw-border': '#E2E2E8',
  '--fw-text': '#1A1A1A',
  '--fw-text-muted': '#8C8C96',
} as React.CSSProperties;

// In the render:
<div
  className={cn('formweave', className)}
  style={{
    ...DEFAULT_INLINE_STYLES, // always present — even on SSR
    ...detectedThemeVars,     // overridden on client after useEffect
    ...style,                 // user overrides
  }}
>
```

### Why this works

- Server render includes default tokens → no unstyled content
- Client `useEffect` detects the actual host theme → overwrites defaults
- Transition from defaults to detected theme is invisible (same values in most cases, tiny visual shift in edge cases)

### Effort: 1 hour

---

## Fix #13: aria-describedby for errors 🔴 P0

### The problem

Error messages render below fields but aren't linked via `aria-describedby`. Screen readers can't associate the error with the field. This violates the WCAG 2.2 AA claim.

### Affected files

- All widget components in `packages/widgets/src/`
- `packages/react/src/components/FieldWrapper.tsx` (if exists)

### Exact fix

Every widget must generate a deterministic error ID and link it:

```typescript
// In each widget component (e.g., TextInput)

const errorId = error ? `fw-error-${path.replace(/\./g, '-')}` : undefined;

return (
  <div>
    <input
      id={`fw-field-${path.replace(/\./g, '-')}`}
      aria-invalid={!!error}
      aria-describedby={errorId}
      // ... other props
    />
    {error && (
      <div id={errorId} role="alert" aria-live="polite">
        {error}
      </div>
    )}
  </div>
);
```

If using a `FieldWrapper` component that wraps all widgets:

```typescript
// FieldWrapper.tsx
export function FieldWrapper({ path, error, children }: FieldWrapperProps) {
  const fieldId = `fw-field-${path.replace(/\./g, '-')}`;
  const errorId = error ? `fw-error-${path.replace(/\./g, '-')}` : undefined;

  return (
    <div>
      {React.cloneElement(children, {
        id: fieldId,
        'aria-invalid': !!error,
        'aria-describedby': errorId,
      })}
      {error && (
        <div id={errorId} role="alert" aria-live="polite" style={errorStyles}>
          {error}
        </div>
      )}
    </div>
  );
}
```

### Test criteria

```typescript
it('links error to field via aria-describedby', () => {
  render(<TextInput path="email" error="Invalid email" />);
  
  const input = screen.getByRole('textbox');
  const error = screen.getByRole('alert');
  
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAttribute('aria-describedby', error.id);
});
```

### Effort: 2 hours (across all widgets)

---

## Fix #14: Changeset / release tooling 🟡 P1

### Affected files (new)

- `.changeset/config.json`
- `package.json` (add changeset scripts)

### Exact fix

```bash
pnpm add -Dw @changesets/cli @changesets/changelog-github
pnpm changeset init
```

```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "formweave/formweave" }],
  "commit": false,
  "fixed": [],
  "linked": [
    ["formweave", "@formweave/core", "@formweave/react", "@formweave/widgets", "@formweave/theme"]
  ],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch"
}
```

```json
// package.json (root)
{
  "scripts": {
    "changeset": "changeset",
    "version": "changeset version",
    "release": "pnpm turbo build && changeset publish"
  }
}
```

Add to CI:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm, registry-url: 'https://registry.npmjs.org' }
      - run: pnpm install --frozen-lockfile
      - uses: changesets/action@v1
        with:
          publish: pnpm release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Effort: 1 hour

---

## Fix #15: sideEffects on umbrella package 🔴 P0

### The problem

`"sideEffects": false` in the umbrella package's `package.json` tells bundlers (webpack, Rollup, esbuild) that everything can be tree-shaken. But the package re-exports CSS from `@formweave/theme`. Bundlers will tree-shake away the CSS import, leaving forms completely unstyled.

### Affected files

- `packages/formweave/package.json`

### Exact fix

```json
// packages/formweave/package.json
{
  "sideEffects": ["*.css", "dist/styles.css"]
}
```

### Test criteria

```bash
# Build a test app with webpack/vite in production mode
# Verify that dist/styles.css is included in the output bundle
# Verify that the form renders with styles applied
```

### Effort: 5 minutes

---

## Execution order (dependency graph)

```
IMMEDIATE (before any testing):
├── Fix #15 sideEffects: false (5 min) — blocks CSS from working
├── Fix #3 $ref resolution (3 hr) — blocks most real schemas
├── Fix #1 re-render cascade (1 hr) — blocks performance claim  
├── Fix #5 values prop sync (2 hr) — blocks agent streaming
└── Fix #13 aria-describedby (2 hr) — blocks WCAG claim

NEXT (before Show HN):
├── Fix #2 nested validation (2 hr)
├── Fix #6 CI/CD + linting (2 hr)
├── Fix #7 maxHeight clip (30 min)
├── Fix #10 tool props (3 hr)
├── Fix #12 SSR flash (1 hr)
└── Fix #14 changesets (1 hr)

THEN (week 1 post-launch):
├── Fix #4 oneOf/anyOf unions (4 hr)
├── Fix #8 email regex (30 min)
├── Fix #9 IPv6 regex (30 min)
└── Fix #11 key stability (15 min)
```

**Total estimated effort: ~23 hours**

---

## Summary

| # | Issue | Priority | Effort | Risk if unfixed |
|---|-------|----------|--------|----------------|
| 1 | useFormField re-renders all fields | 🔴 P0 | 1h | Performance is no better than RJSF |
| 2 | Nested path validation broken | 🔴 P0 | 2h | Nested object schemas silently skip validation |
| 3 | $ref never resolved | 🔴 P0 | 3h | Most real MCP schemas produce broken forms |
| 4 | oneOf/anyOf ignored | 🟡 P1 | 4h | Discriminated union schemas don't work |
| 5 | values prop doesn't sync | 🔴 P0 | 2h | Agent streaming updates are lost |
| 6 | No CI/CD | 🟡 P1 | 2h | Inconsistency on first PR |
| 7 | maxHeight clips content | 🟡 P1 | 30m | Long conditional sections get cut off |
| 8 | Email regex too permissive | 🟢 P2 | 30m | Invalid emails accepted |
| 9 | IPv6 validation broken | 🟢 P2 | 30m | All shorthand IPv6 rejected |
| 10 | Tool props declared but unused | 🟡 P1 | 3h | Dead API confuses consumers |
| 11 | Key stability in groups | 🟢 P2 | 15m | Potential reconciliation bugs |
| 12 | SSR theme flash | 🟡 P1 | 1h | Unstyled flash on hydration |
| 13 | Missing aria-describedby | 🔴 P0 | 2h | Fails WCAG 2.2 AA claim |
| 14 | No changeset tooling | 🟡 P1 | 1h | Can't do coordinated releases |
| 15 | sideEffects: false on CSS | 🔴 P0 | 5m | CSS tree-shaken away, forms unstyled |
