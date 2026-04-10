// ─── Progressive disclosure: tier assignment ───

import type { JSONSchema7 } from './types';

export type Tier = 'essential' | 'details' | 'advanced';

/** Field names commonly shown in the "details" tier even when optional. */
const DETAILS_TIER_NAMES = /^(location|venue|place|description|notes|note|memo|comment|comments|instructions|details|category|categories|tags|labels|priority|status|type|kind|group|department|team|project|due|due_date|dueDate|deadline|reminder|notification|timezone|time_zone|timeZone|attendees|participants|guests|invitees|organizer|recurrence|repeat|frequency|visibility|access|permissions|color|icon|url|link|website|image|photo|avatar|logo|attachment|attachments|file|files)$/i;

export interface TierAssignment {
  fieldName: string;
  tier: Tier;
}

/**
 * Assign progressive disclosure tiers to all fields.
 *
 * Tier rules:
 * - 'essential': required fields + first 5 fields (regardless of required)
 * - 'details': optional fields with common names (location, description, etc.)
 * - 'advanced': everything else
 */
export function assignTiers(
  schema: JSONSchema7
): TierAssignment[] {
  const properties = schema.properties || {};
  const requiredSet = new Set(schema.required || []);
  const fieldNames = Object.keys(properties);

  return fieldNames.map((name, index) => {
    const isRequired = requiredSet.has(name);
    const isInFirstFive = index < 5;

    let tier: Tier;

    if (isRequired || isInFirstFive) {
      tier = 'essential';
    } else if (DETAILS_TIER_NAMES.test(name)) {
      tier = 'details';
    } else if (!isRequired && properties[name].default === undefined) {
      // L4: not required, no default, not in first 5 → advanced
      tier = 'advanced';
    } else {
      tier = 'details';
    }

    return { fieldName: name, tier };
  });
}

/**
 * Get the count of visible (non-advanced) fields.
 */
export function visibleFieldCount(assignments: TierAssignment[]): number {
  return assignments.filter((a) => a.tier !== 'advanced').length;
}
