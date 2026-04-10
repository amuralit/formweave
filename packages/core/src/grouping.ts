// ─── Field grouping detection ───

import type { JSONSchema7, FieldGroup } from './types';
import { isStartDatetimeField, isEndDatetimeField, isAddressField } from './widget-resolver';

// ─── Contact cluster patterns ───

const CONTACT_NAME_FIELDS = /^(name|full_name|fullName|first_name|firstName|last_name|lastName|display_name|displayName|contact_name|contactName)$/i;
const CONTACT_EMAIL_FIELDS = /^(email|email_address|emailAddress|contact_email|contactEmail)$/i;
const CONTACT_PHONE_FIELDS = /^(phone|phone_number|phoneNumber|telephone|tel|mobile|cell|contact_phone|contactPhone)$/i;
const CONTACT_TITLE_FIELDS = /^(title|job_title|jobTitle|role|position)$/i;

function isContactField(name: string): boolean {
  return (
    CONTACT_NAME_FIELDS.test(name) ||
    CONTACT_EMAIL_FIELDS.test(name) ||
    CONTACT_PHONE_FIELDS.test(name) ||
    CONTACT_TITLE_FIELDS.test(name)
  );
}

/**
 * Detect datetime pairs: two fields with format date-time matching start/end patterns.
 */
function detectDatetimePairs(
  properties: Record<string, JSONSchema7>,
  fieldNames: string[]
): FieldGroup[] {
  const groups: FieldGroup[] = [];

  const startFields = fieldNames.filter(
    (n) =>
      isStartDatetimeField(n) &&
      (properties[n].format === 'date-time' || properties[n].format === 'date')
  );

  const endFields = fieldNames.filter(
    (n) =>
      isEndDatetimeField(n) &&
      (properties[n].format === 'date-time' || properties[n].format === 'date')
  );

  // Pair them up: take first start with first end
  const pairCount = Math.min(startFields.length, endFields.length);
  for (let i = 0; i < pairCount; i++) {
    groups.push({
      name: `datetime-pair-${i}`,
      label: '',
      fields: [startFields[i], endFields[i]],
      type: 'datetime-pair',
    });
  }

  return groups;
}

/**
 * Detect address clusters: fields named address/street/city/state/zip/country.
 */
function detectAddressClusters(
  _properties: Record<string, JSONSchema7>,
  fieldNames: string[]
): FieldGroup[] {
  const addressFields = fieldNames.filter((n) => isAddressField(n));

  // Need at least 2 address fields to form a group
  if (addressFields.length < 2) return [];

  return [
    {
      name: 'address',
      label: 'Address',
      fields: addressFields,
      type: 'address',
    },
  ];
}

/**
 * Detect contact clusters: name + email + phone + title.
 */
function detectContactClusters(
  _properties: Record<string, JSONSchema7>,
  fieldNames: string[]
): FieldGroup[] {
  const contactFields = fieldNames.filter((n) => isContactField(n));

  // Need at least 2 contact fields to form a group
  if (contactFields.length < 2) return [];

  return [
    {
      name: 'contact',
      label: 'Contact information',
      fields: contactFields,
      type: 'contact',
    },
  ];
}

/**
 * Detect all field groups in a schema.
 * Returns groups in priority order: datetime pairs, address, contact.
 *
 * A field can only belong to one group. If groups overlap,
 * higher-priority groups (listed first) win.
 */
export function detectGroups(schema: JSONSchema7): FieldGroup[] {
  const properties = schema.properties || {};
  const fieldNames = Object.keys(properties);

  const allGroups: FieldGroup[] = [
    ...detectDatetimePairs(properties, fieldNames),
    ...detectAddressClusters(properties, fieldNames),
    ...detectContactClusters(properties, fieldNames),
  ];

  // Deduplicate: a field can only belong to one group
  const assignedFields = new Set<string>();
  const result: FieldGroup[] = [];

  for (const group of allGroups) {
    const unassigned = group.fields.filter((f) => !assignedFields.has(f));
    if (unassigned.length >= 2) {
      const finalGroup = { ...group, fields: unassigned };
      result.push(finalGroup);
      unassigned.forEach((f) => assignedFields.add(f));
    }
  }

  return result;
}
