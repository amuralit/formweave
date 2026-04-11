// ─── Conditional field visibility ───
// Evaluates if/then/else conditions based on current form values.
// Shows/hides fields with CSS transitions. Preserves values of hidden fields.

import { useMemo, useRef, useSyncExternalStore } from 'react';
import type { FieldCondition } from '@formweave/core';
import { useFormContext } from './FormContext';

/**
 * Evaluate whether a single condition is met.
 */
function evaluateCondition(
  condition: FieldCondition,
  values: Record<string, any>,
): boolean {
  const depValue = values[condition.dependsOn];

  switch (condition.operator) {
    case 'equals':
      if (Array.isArray(condition.value)) {
        return condition.value.includes(depValue);
      }
      return depValue === condition.value;

    case 'not-equals':
      if (Array.isArray(condition.value)) {
        return !condition.value.includes(depValue);
      }
      return depValue !== condition.value;

    case 'truthy':
      return Boolean(depValue);

    case 'falsy':
      return !depValue;

    default:
      return true;
  }
}

/**
 * Evaluate all conditions for a field.
 * All conditions must be met (AND logic) for the field to be visible.
 */
export function evaluateConditions(
  conditions: FieldCondition[],
  values: Record<string, any>,
): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, values));
}

/**
 * Hook: subscribe only to the specific dependency fields (not the whole values object).
 * This prevents re-renders when unrelated fields change.
 */
export function useFieldVisibility(conditions?: FieldCondition[]): boolean {
  const { store } = useFormContext();

  // Extract the list of fields this condition depends on
  const depFields = useMemo(
    () => conditions?.map(c => c.dependsOn) ?? [],
    [conditions],
  );

  // Subscribe to only the dependency values — returns a stable reference
  // when unrelated fields change
  const prevRef = useRef<any[]>([]);
  const depValues = useSyncExternalStore(
    store.subscribe,
    () => {
      if (depFields.length === 0) return prevRef.current;
      const vals = store.getState().values;
      const next = depFields.map(f => vals[f]);
      // Shallow compare to avoid unnecessary re-renders
      const prev = prevRef.current;
      if (prev.length === next.length && prev.every((v, i) => v === next[i])) {
        return prev;
      }
      prevRef.current = next;
      return next;
    },
  );

  return useMemo(() => {
    if (!conditions || conditions.length === 0) return true;
    // Build a minimal values object with just the dependencies
    const vals: Record<string, any> = {};
    for (let i = 0; i < depFields.length; i++) {
      vals[depFields[i]] = depValues[i];
    }
    return evaluateConditions(conditions, vals);
  }, [conditions, depFields, depValues]);
}

// ─── ConditionalWrapper component ───

interface ConditionalWrapperProps {
  conditions?: FieldCondition[];
  children: React.ReactNode;
}

/**
 * Wraps a field with conditional visibility.
 * Uses CSS transitions for smooth show/hide.
 * Hidden fields are rendered but visually collapsed to preserve their values.
 */
export function ConditionalWrapper({
  conditions,
  children,
}: ConditionalWrapperProps) {
  const visible = useFieldVisibility(conditions);

  if (!conditions || conditions.length === 0) {
    return <>{children}</>;
  }

  return (
    <div
      className={`fw-conditional ${visible ? 'fw-conditional--visible' : 'fw-conditional--hidden'}`}
      aria-hidden={!visible}
      style={{
        display: 'grid',
        gridTemplateRows: visible ? '1fr' : '0fr',
        opacity: visible ? 1 : 0,
        transition: 'grid-template-rows 200ms ease-out, opacity 150ms ease-out',
      }}
    >
      <div style={{ overflow: 'hidden', pointerEvents: visible ? 'auto' : 'none' }}>
        {children}
      </div>
    </div>
  );
}
