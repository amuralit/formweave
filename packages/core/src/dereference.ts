// ─── $ref / $defs resolver ───
// Recursively resolves all internal $ref pointers (#/$defs/... and #/definitions/...)
// before schema analysis. Handles circular references with a visited set.

import type { JSONSchema7 } from './types';

/**
 * Resolve a single $ref string against the root schema's $defs or definitions.
 * Returns the resolved schema or undefined if not found.
 */
function resolveRef(
  ref: string,
  root: JSONSchema7,
): JSONSchema7 | undefined {
  // Only handle internal references
  if (!ref.startsWith('#/')) return undefined;

  const segments = ref
    .slice(2) // remove '#/'
    .split('/');

  let current: any = root;
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[seg];
  }

  return current as JSONSchema7 | undefined;
}

/**
 * Recursively dereference a schema node, resolving all $ref pointers.
 * Uses a visited set (keyed by $ref string) to break circular references.
 */
function dereferenceNode(
  node: JSONSchema7,
  root: JSONSchema7,
  visited: Set<string>,
): JSONSchema7 {
  if (node.$ref) {
    // Circular reference guard
    if (visited.has(node.$ref)) {
      // Return the node without resolving to avoid infinite recursion.
      // Strip the $ref so downstream code doesn't attempt resolution again.
      const { $ref, ...rest } = node;
      return rest;
    }

    visited.add(node.$ref);

    const resolved = resolveRef(node.$ref, root);
    if (!resolved) {
      // Unresolvable ref — return the node as-is minus the $ref
      const { $ref, ...rest } = node;
      return rest;
    }

    // Merge sibling properties (everything except $ref) with the resolved schema.
    // Sibling properties take precedence over resolved ones (per JSON Schema spec convention).
    const { $ref, ...siblings } = node;
    const merged: JSONSchema7 = { ...resolved, ...siblings };

    // Recurse into the merged result
    return dereferenceNode(merged, root, visited);
  }

  // No $ref — recurse into sub-schemas
  const result: JSONSchema7 = { ...node };

  // properties
  if (result.properties) {
    const props: Record<string, JSONSchema7> = {};
    for (const [key, value] of Object.entries(result.properties)) {
      props[key] = dereferenceNode(value, root, new Set(visited));
    }
    result.properties = props;
  }

  // items (single schema or tuple)
  if (result.items) {
    if (Array.isArray(result.items)) {
      result.items = result.items.map((item) =>
        dereferenceNode(item, root, new Set(visited)),
      );
    } else {
      result.items = dereferenceNode(result.items, root, new Set(visited));
    }
  }

  // additionalProperties
  if (result.additionalProperties && typeof result.additionalProperties === 'object') {
    result.additionalProperties = dereferenceNode(
      result.additionalProperties,
      root,
      new Set(visited),
    );
  }

  // Composition keywords
  if (result.oneOf) {
    result.oneOf = result.oneOf.map((s) =>
      dereferenceNode(s, root, new Set(visited)),
    );
  }
  if (result.anyOf) {
    result.anyOf = result.anyOf.map((s) =>
      dereferenceNode(s, root, new Set(visited)),
    );
  }
  if (result.allOf) {
    result.allOf = result.allOf.map((s) =>
      dereferenceNode(s, root, new Set(visited)),
    );
  }

  // Conditional keywords
  if (result.if) {
    result.if = dereferenceNode(result.if, root, new Set(visited));
  }
  if (result.then) {
    result.then = dereferenceNode(result.then, root, new Set(visited));
  }
  if (result.else) {
    result.else = dereferenceNode(result.else, root, new Set(visited));
  }

  // $defs / definitions — recurse into definition schemas too
  if (result.$defs) {
    const defs: Record<string, JSONSchema7> = {};
    for (const [key, value] of Object.entries(result.$defs)) {
      defs[key] = dereferenceNode(value, root, new Set(visited));
    }
    result.$defs = defs;
  }
  if (result.definitions) {
    const defs: Record<string, JSONSchema7> = {};
    for (const [key, value] of Object.entries(result.definitions)) {
      defs[key] = dereferenceNode(value, root, new Set(visited));
    }
    result.definitions = defs;
  }

  return result;
}

/**
 * Dereference all internal $ref pointers in a JSON Schema.
 *
 * Resolves `#/$defs/...` and `#/definitions/...` references recursively.
 * Handles circular references gracefully by returning the node without
 * the $ref when a cycle is detected.
 *
 * @param schema - The raw JSON Schema with potential $ref pointers
 * @returns A new schema object with all internal $refs resolved
 */
export function dereferenceSchema(schema: JSONSchema7): JSONSchema7 {
  return dereferenceNode(schema, schema, new Set());
}
