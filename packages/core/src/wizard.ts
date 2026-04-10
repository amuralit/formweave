// ─── Wizard page grouping ───

import type { FieldDefinition, FieldGroup, WizardPage } from './types';

/** Default threshold: if more than this many visible fields, enable wizard. */
export const WIZARD_THRESHOLD = 15;

/** Target fields per page */
const MIN_FIELDS_PER_PAGE = 3;
const MAX_FIELDS_PER_PAGE = 8;
const TARGET_PAGES_MIN = 3;
const TARGET_PAGES_MAX = 6;

/**
 * Semantic page labels based on field content.
 */
function inferPageLabel(fields: FieldDefinition[], pageIndex: number): string {
  // Check if all fields in this page share a group
  const groupLabels = new Set(
    fields.filter((f) => f.groupLabel).map((f) => f.groupLabel!)
  );
  if (groupLabels.size === 1) {
    return [...groupLabels][0];
  }

  // Check for common patterns
  const fieldNames = fields.map((f) => f.path.toLowerCase());

  if (fieldNames.some((n) => /^(title|name|summary|subject)$/.test(n))) {
    return 'Basics';
  }
  if (fieldNames.some((n) => /^(start|end|date|time|when|schedule)/.test(n))) {
    return 'Schedule';
  }
  if (fieldNames.some((n) => /^(address|street|city|state|zip|location|venue|place)/.test(n))) {
    return 'Location';
  }
  if (fieldNames.some((n) => /^(email|phone|contact|attendee|participant|guest|invitee)/.test(n))) {
    return 'People';
  }
  if (fieldNames.some((n) => /^(description|notes|body|content|details|instructions)/.test(n))) {
    return 'Details';
  }
  if (fieldNames.some((n) => /^(color|theme|icon|image|logo|avatar|photo)/.test(n))) {
    return 'Appearance';
  }
  if (fieldNames.some((n) => /^(notification|reminder|alert|repeat|recurrence)/.test(n))) {
    return 'Settings';
  }

  // Fallback
  const labels = ['Basics', 'Details', 'Options', 'Settings', 'Advanced', 'Review'];
  return labels[pageIndex] || `Step ${pageIndex + 1}`;
}

/**
 * Group fields into wizard pages.
 *
 * Strategy:
 * 1. Required fields always go on page 1
 * 2. Group semantically related fields together
 * 3. Balance pages to have 3-8 fields each
 * 4. Produce 3-6 pages total
 */
export function groupIntoPages(
  fields: FieldDefinition[],
  groups: FieldGroup[]
): WizardPage[] {
  if (fields.length === 0) return [];

  // Separate required (essential) fields and optional fields
  const essentialFields = fields.filter((f) => f.tier === 'essential');
  const detailFields = fields.filter((f) => f.tier === 'details');
  const advancedFields = fields.filter((f) => f.tier === 'advanced');

  // Build group membership map
  const fieldToGroup = new Map<string, string>();
  for (const group of groups) {
    for (const fieldPath of group.fields) {
      fieldToGroup.set(fieldPath, group.name);
    }
  }

  // Start with required fields on page 1
  const pages: FieldDefinition[][] = [];

  if (essentialFields.length > 0) {
    pages.push([...essentialFields]);
  }

  // Distribute detail fields
  if (detailFields.length > 0) {
    // Try to keep grouped fields together
    const processedDetails = new Set<string>();
    const detailPages: FieldDefinition[][] = [];
    let currentPage: FieldDefinition[] = [];

    for (const field of detailFields) {
      if (processedDetails.has(field.path)) continue;

      // If this field belongs to a group, add all group members together
      const groupName = fieldToGroup.get(field.path);
      if (groupName) {
        const groupMembers = detailFields.filter(
          (f) => fieldToGroup.get(f.path) === groupName && !processedDetails.has(f.path)
        );
        // If adding group would exceed max, start new page
        if (currentPage.length + groupMembers.length > MAX_FIELDS_PER_PAGE && currentPage.length > 0) {
          detailPages.push(currentPage);
          currentPage = [];
        }
        currentPage.push(...groupMembers);
        groupMembers.forEach((f) => processedDetails.add(f.path));
      } else {
        if (currentPage.length >= MAX_FIELDS_PER_PAGE) {
          detailPages.push(currentPage);
          currentPage = [];
        }
        currentPage.push(field);
        processedDetails.add(field.path);
      }
    }

    if (currentPage.length > 0) {
      detailPages.push(currentPage);
    }

    pages.push(...detailPages);
  }

  // Add advanced fields as the last page(s)
  if (advancedFields.length > 0) {
    // Split if too many
    for (let i = 0; i < advancedFields.length; i += MAX_FIELDS_PER_PAGE) {
      pages.push(advancedFields.slice(i, i + MAX_FIELDS_PER_PAGE));
    }
  }

  // Merge small pages if we have too many
  while (pages.length > TARGET_PAGES_MAX) {
    // Find the smallest page and merge it with its neighbor
    let smallestIdx = 0;
    let smallestSize = pages[0].length;
    for (let i = 1; i < pages.length; i++) {
      if (pages[i].length < smallestSize) {
        smallestSize = pages[i].length;
        smallestIdx = i;
      }
    }

    // Merge with neighbor (prefer next, fallback to prev)
    const mergeWith = smallestIdx < pages.length - 1 ? smallestIdx + 1 : smallestIdx - 1;
    if (mergeWith >= 0 && mergeWith < pages.length) {
      pages[Math.min(smallestIdx, mergeWith)] = [
        ...pages[Math.min(smallestIdx, mergeWith)],
        ...pages[Math.max(smallestIdx, mergeWith)],
      ];
      pages.splice(Math.max(smallestIdx, mergeWith), 1);
    } else {
      break;
    }
  }

  // If we ended up with fewer pages than minimum and have enough fields, split page 1
  if (pages.length < TARGET_PAGES_MIN && pages.length === 1 && pages[0].length > MIN_FIELDS_PER_PAGE * 2) {
    const allFields = pages[0];
    const mid = Math.ceil(allFields.length / 2);
    pages[0] = allFields.slice(0, mid);
    pages.push(allFields.slice(mid));
  }

  // Build WizardPage results
  return pages.map((pageFields, index) => ({
    index,
    label: inferPageLabel(pageFields, index),
    fields: pageFields.map((f) => f.path),
  }));
}

/**
 * Determine if wizard mode should be used and compute pages.
 */
export function computeWizard(
  fields: FieldDefinition[],
  groups: FieldGroup[],
  threshold: number = WIZARD_THRESHOLD
): { useWizard: boolean; pages?: WizardPage[] } {
  // Count all fields (wizard should consider all fields, not just essential+details)
  const totalCount = fields.length;

  if (totalCount <= threshold) {
    return { useWizard: false };
  }

  const pages = groupIntoPages(fields, groups);
  return {
    useWizard: true,
    pages,
  };
}
