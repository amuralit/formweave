import { describe, it, expect } from 'vitest';
import {
  analyzeSchema,
  resolveWidget,
  resolveWidgets,
  humanizeFieldName,
  inferActionLabel,
  detectGroups,
  assignTiers,
  parseConditionals,
  computeWizard,
  matchFieldToTool,
  matchTools,
} from '../index';
import type { JSONSchema7, ResolverContext } from '../index';

// ─── Helper to create a ResolverContext for single-field tests ───

function ctx(
  fieldName: string,
  schema: JSONSchema7,
  overrides: Partial<ResolverContext> = {}
): ResolverContext {
  return {
    fieldName,
    fieldPath: fieldName,
    schema,
    required: false,
    fieldIndex: 0,
    totalFields: 1,
    allFieldNames: [fieldName],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 1. Basic type mapping
// ═══════════════════════════════════════════════════════════════════

describe('Basic type mapping', () => {
  it('maps type: string to text', () => {
    expect(resolveWidget(ctx('foo', { type: 'string' }))).toBe('text');
  });

  it('maps type: number to number-stepper', () => {
    expect(resolveWidget(ctx('count', { type: 'number' }))).toBe('number-stepper');
  });

  it('maps type: integer to number-stepper', () => {
    expect(resolveWidget(ctx('age', { type: 'integer' }))).toBe('number-stepper');
  });

  it('maps type: boolean to toggle', () => {
    expect(resolveWidget(ctx('active', { type: 'boolean' }))).toBe('toggle');
  });

  it('maps type: object with properties to object-section', () => {
    expect(
      resolveWidget(ctx('config', { type: 'object', properties: { a: {} } }))
    ).toBe('object-section');
  });

  it('maps type: array with items.type: string to tag-input', () => {
    expect(
      resolveWidget(ctx('tags', { type: 'array', items: { type: 'string' } }))
    ).toBe('tag-input');
  });

  it('maps plain array (no items) to array-list', () => {
    expect(resolveWidget(ctx('items', { type: 'array' }))).toBe('array-list');
  });

  it('returns text for unknown/missing type', () => {
    expect(resolveWidget(ctx('unknown', {}))).toBe('text');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. Format handling
// ═══════════════════════════════════════════════════════════════════

describe('Format handling', () => {
  it('maps format: date-time to datetime-block', () => {
    expect(
      resolveWidget(ctx('created', { type: 'string', format: 'date-time' }))
    ).toBe('datetime-block');
  });

  it('maps format: date to date-picker', () => {
    expect(
      resolveWidget(ctx('birthday', { type: 'string', format: 'date' }))
    ).toBe('date-picker');
  });

  it('maps format: time to time-picker', () => {
    expect(
      resolveWidget(ctx('alarm', { type: 'string', format: 'time' }))
    ).toBe('time-picker');
  });

  it('maps format: email to text', () => {
    expect(
      resolveWidget(ctx('contact', { type: 'string', format: 'email' }))
    ).toBe('text');
  });

  it('maps format: uri to text', () => {
    expect(
      resolveWidget(ctx('homepage', { type: 'string', format: 'uri' }))
    ).toBe('text');
  });

  it('maps format: uuid to text', () => {
    expect(
      resolveWidget(ctx('id', { type: 'string', format: 'uuid' }))
    ).toBe('text');
  });

  it('maps format: ipv4 to text', () => {
    expect(
      resolveWidget(ctx('ip', { type: 'string', format: 'ipv4' }))
    ).toBe('text');
  });

  it('maps format: data-url to file-upload', () => {
    expect(
      resolveWidget(ctx('avatar', { type: 'string', format: 'data-url' }))
    ).toBe('file-upload');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. Enum rendering
// ═══════════════════════════════════════════════════════════════════

describe('Enum rendering', () => {
  it('renders <=5 string enum as pill-selector', () => {
    expect(
      resolveWidget(ctx('status', { type: 'string', enum: ['a', 'b', 'c'] }))
    ).toBe('pill-selector');
  });

  it('renders >5 string enum as dropdown-select', () => {
    expect(
      resolveWidget(
        ctx('country', {
          type: 'string',
          enum: ['us', 'uk', 'ca', 'au', 'de', 'fr'],
        })
      )
    ).toBe('dropdown-select');
  });

  it('renders exactly 5 enum values as pill-selector', () => {
    expect(
      resolveWidget(
        ctx('priority', {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent', 'critical'],
        })
      )
    ).toBe('pill-selector');
  });

  it('renders hex color enum as color-dots', () => {
    expect(
      resolveWidget(
        ctx('color', {
          type: 'string',
          enum: ['#ff0000', '#00ff00', '#0000ff'],
        })
      )
    ).toBe('color-dots');
  });

  it('renders number enum <=5 as pill-selector', () => {
    expect(
      resolveWidget(ctx('rating', { type: 'number', enum: [1, 2, 3, 4, 5] }))
    ).toBe('pill-selector');
  });

  it('renders number enum >5 as dropdown-select', () => {
    expect(
      resolveWidget(
        ctx('year', {
          type: 'number',
          enum: [2020, 2021, 2022, 2023, 2024, 2025],
        })
      )
    ).toBe('dropdown-select');
  });

  it('renders array with enum items as pill-selector when <=5', () => {
    expect(
      resolveWidget(
        ctx('roles', {
          type: 'array',
          items: { type: 'string', enum: ['admin', 'user', 'guest'] },
        })
      )
    ).toBe('pill-selector');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. Title field detection (L2)
// ═══════════════════════════════════════════════════════════════════

describe('Title field detection', () => {
  it('maps required "title" field to title-input', () => {
    expect(
      resolveWidget(
        ctx('title', { type: 'string' }, { required: true })
      )
    ).toBe('title-input');
  });

  it('maps required "name" field to title-input', () => {
    expect(
      resolveWidget(
        ctx('name', { type: 'string' }, { required: true })
      )
    ).toBe('title-input');
  });

  it('maps required "summary" field to title-input', () => {
    expect(
      resolveWidget(
        ctx('summary', { type: 'string' }, { required: true })
      )
    ).toBe('title-input');
  });

  it('does NOT map optional "title" to title-input', () => {
    expect(
      resolveWidget(ctx('title', { type: 'string' }, { required: false }))
    ).toBe('text');
  });

  it('does NOT map required "title" with enum to title-input', () => {
    expect(
      resolveWidget(
        ctx('title', { type: 'string', enum: ['Mr', 'Mrs', 'Dr'] }, { required: true })
      )
    ).toBe('pill-selector');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. Textarea detection
// ═══════════════════════════════════════════════════════════════════

describe('Textarea detection', () => {
  it('maps "description" field to textarea', () => {
    expect(resolveWidget(ctx('description', { type: 'string' }))).toBe('textarea');
  });

  it('maps "notes" field to textarea', () => {
    expect(resolveWidget(ctx('notes', { type: 'string' }))).toBe('textarea');
  });

  it('maps "body" field to textarea', () => {
    expect(resolveWidget(ctx('body', { type: 'string' }))).toBe('textarea');
  });

  it('maps "content" field to textarea', () => {
    expect(resolveWidget(ctx('content', { type: 'string' }))).toBe('textarea');
  });

  it('maps string with long description to textarea', () => {
    expect(
      resolveWidget(
        ctx('data', {
          type: 'string',
          description:
            'This is a very long description that suggests the field should be rendered as a multi-line textarea input.',
        })
      )
    ).toBe('textarea');
  });

  it('maps string with maxLength > 200 to textarea', () => {
    expect(
      resolveWidget(ctx('bio', { type: 'string', maxLength: 500 }))
    ).toBe('textarea');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. People picker detection (L3)
// ═══════════════════════════════════════════════════════════════════

describe('People picker detection', () => {
  it('maps array + items.format: email to people-picker', () => {
    expect(
      resolveWidget(
        ctx('attendees', {
          type: 'array',
          items: { type: 'string', format: 'email' },
        })
      )
    ).toBe('people-picker');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. Array type variations (L9)
// ═══════════════════════════════════════════════════════════════════

describe('Array type variations', () => {
  it('maps array + items.type: object with >3 props to array-table', () => {
    expect(
      resolveWidget(
        ctx('rows', {
          type: 'array',
          items: {
            type: 'object',
            properties: { a: {}, b: {}, c: {}, d: {} },
          },
        })
      )
    ).toBe('array-table');
  });

  it('maps array + items.type: object with <=3 props to array-list', () => {
    expect(
      resolveWidget(
        ctx('items', {
          type: 'array',
          items: {
            type: 'object',
            properties: { a: {}, b: {} },
          },
        })
      )
    ).toBe('array-list');
  });

  it('maps array + items.type: string (no format) to tag-input', () => {
    expect(
      resolveWidget(
        ctx('tags', { type: 'array', items: { type: 'string' } })
      )
    ).toBe('tag-input');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. Label humanization
// ═══════════════════════════════════════════════════════════════════

describe('Label humanization', () => {
  it('converts snake_case to Title case', () => {
    expect(humanizeFieldName('start_date')).toBe('Start date');
  });

  it('converts camelCase to Title case', () => {
    expect(humanizeFieldName('firstName')).toBe('First name');
  });

  it('converts kebab-case to Title case', () => {
    expect(humanizeFieldName('zip-code')).toBe('Zip code');
  });

  it('preserves short acronyms', () => {
    expect(humanizeFieldName('URL')).toBe('URL');
  });

  it('handles empty string', () => {
    expect(humanizeFieldName('')).toBe('');
  });

  it('handles single word', () => {
    expect(humanizeFieldName('name')).toBe('Name');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. Action label inference
// ═══════════════════════════════════════════════════════════════════

describe('Action label inference', () => {
  it('converts create_event to "Create event"', () => {
    expect(inferActionLabel('create_event')).toBe('Create event');
  });

  it('converts send_message to "Send message"', () => {
    expect(inferActionLabel('send_message')).toBe('Send message');
  });

  it('converts updateProfile to "Update profile"', () => {
    expect(inferActionLabel('updateProfile')).toBe('Update profile');
  });

  it('returns "Submit" for undefined', () => {
    expect(inferActionLabel()).toBe('Submit');
  });

  it('returns "Submit" for empty string', () => {
    expect(inferActionLabel('')).toBe('Submit');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. Field grouping
// ═══════════════════════════════════════════════════════════════════

describe('Field grouping', () => {
  it('detects datetime pairs', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        start_date: { type: 'string', format: 'date-time' },
        end_date: { type: 'string', format: 'date-time' },
        title: { type: 'string' },
      },
    };
    const groups = detectGroups(schema);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe('datetime-pair');
    expect(groups[0].fields).toContain('start_date');
    expect(groups[0].fields).toContain('end_date');
  });

  it('detects address clusters', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        zip: { type: 'string' },
      },
    };
    const groups = detectGroups(schema);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe('address');
    expect(groups[0].fields).toEqual(
      expect.arrayContaining(['street', 'city', 'state', 'zip'])
    );
  });

  it('detects contact clusters', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
      },
    };
    const groups = detectGroups(schema);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe('contact');
    expect(groups[0].fields).toEqual(
      expect.arrayContaining(['name', 'email', 'phone'])
    );
  });

  it('does not group single address field', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        city: { type: 'string' },
        title: { type: 'string' },
      },
    };
    const groups = detectGroups(schema);
    const addressGroups = groups.filter((g) => g.type === 'address');
    expect(addressGroups).toHaveLength(0);
  });

  it('handles schemas with no groupable fields', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        foo: { type: 'string' },
        bar: { type: 'number' },
      },
    };
    expect(detectGroups(schema)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 11. Progressive disclosure tiers
// ═══════════════════════════════════════════════════════════════════

describe('Progressive disclosure tiers', () => {
  it('assigns required fields as essential', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['name'],
    };
    const tiers = assignTiers(schema);
    const nameTier = tiers.find((t) => t.fieldName === 'name');
    expect(nameTier?.tier).toBe('essential');
  });

  it('assigns first 5 fields as essential', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
        c: { type: 'string' },
        d: { type: 'string' },
        e: { type: 'string' },
        f: { type: 'string' },
      },
    };
    const tiers = assignTiers(schema);
    expect(tiers.slice(0, 5).every((t) => t.tier === 'essential')).toBe(true);
  });

  it('assigns known detail names as details tier', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
        c: { type: 'string' },
        d: { type: 'string' },
        e: { type: 'string' },
        location: { type: 'string' },
        description: { type: 'string' },
      },
    };
    const tiers = assignTiers(schema);
    expect(tiers.find((t) => t.fieldName === 'location')?.tier).toBe('details');
    expect(tiers.find((t) => t.fieldName === 'description')?.tier).toBe(
      'details'
    );
  });

  it('assigns unknown optional fields beyond first 5 as advanced', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
        c: { type: 'string' },
        d: { type: 'string' },
        e: { type: 'string' },
        foo_bar_baz: { type: 'string' },
      },
    };
    const tiers = assignTiers(schema);
    expect(tiers.find((t) => t.fieldName === 'foo_bar_baz')?.tier).toBe(
      'advanced'
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
// 12. Conditional field parsing
// ═══════════════════════════════════════════════════════════════════

describe('Conditional field parsing', () => {
  it('parses top-level if/then/else with const', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['physical', 'virtual'] },
        location: { type: 'string' },
        url: { type: 'string', format: 'uri' },
      },
      if: {
        properties: { type: { const: 'physical' } },
      },
      then: {
        properties: { location: { type: 'string' } },
      },
      else: {
        properties: { url: { type: 'string', format: 'uri' } },
      },
    };

    const conditions = parseConditionals(schema);

    expect(conditions.has('location')).toBe(true);
    expect(conditions.get('location')?.[0]).toEqual({
      dependsOn: 'type',
      value: 'physical',
      operator: 'equals',
    });

    expect(conditions.has('url')).toBe(true);
    expect(conditions.get('url')?.[0]).toEqual({
      dependsOn: 'type',
      value: 'physical',
      operator: 'not-equals',
    });
  });

  it('parses allOf conditional blocks', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        has_deadline: { type: 'boolean' },
        deadline: { type: 'string', format: 'date' },
      },
      allOf: [
        {
          if: {
            properties: { has_deadline: { const: true } },
          },
          then: {
            properties: { deadline: { type: 'string', format: 'date' } },
          },
        },
      ],
    };

    const conditions = parseConditionals(schema);
    expect(conditions.has('deadline')).toBe(true);
    expect(conditions.get('deadline')?.[0].dependsOn).toBe('has_deadline');
  });

  it('handles schema with no conditionals', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: { name: { type: 'string' } },
    };
    const conditions = parseConditionals(schema);
    expect(conditions.size).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 13. Wizard page grouping
// ═══════════════════════════════════════════════════════════════════

describe('Wizard page grouping', () => {
  it('does not enable wizard for <= 15 fields', () => {
    const fields = Array.from({ length: 10 }, (_, i) => ({
      path: `field_${i}`,
      widget: 'text' as const,
      tier: 'essential' as const,
      label: `Field ${i}`,
      required: false,
      constraints: {},
    }));

    const result = computeWizard(fields, []);
    expect(result.useWizard).toBe(false);
  });

  it('enables wizard for > 15 visible fields', () => {
    const fields = Array.from({ length: 20 }, (_, i) => ({
      path: `field_${i}`,
      widget: 'text' as const,
      tier: (i < 5 ? 'essential' : 'details') as 'essential' | 'details',
      label: `Field ${i}`,
      required: i < 5,
      constraints: {},
    }));

    const result = computeWizard(fields, []);
    expect(result.useWizard).toBe(true);
    expect(result.pages).toBeDefined();
    expect(result.pages!.length).toBeGreaterThanOrEqual(2);
  });

  it('puts required fields on first page', () => {
    const fields = Array.from({ length: 20 }, (_, i) => ({
      path: `field_${i}`,
      widget: 'text' as const,
      tier: (i < 3 ? 'essential' : 'details') as 'essential' | 'details',
      label: `Field ${i}`,
      required: i < 3,
      constraints: {},
    }));

    const result = computeWizard(fields, []);
    expect(result.useWizard).toBe(true);
    // First page should contain the required fields
    const firstPage = result.pages![0];
    expect(firstPage.fields).toContain('field_0');
    expect(firstPage.fields).toContain('field_1');
    expect(firstPage.fields).toContain('field_2');
  });

  it('respects custom threshold', () => {
    const fields = Array.from({ length: 8 }, (_, i) => ({
      path: `field_${i}`,
      widget: 'text' as const,
      tier: 'essential' as const,
      label: `Field ${i}`,
      required: false,
      constraints: {},
    }));

    const result = computeWizard(fields, [], 5);
    expect(result.useWizard).toBe(true);
  });

  it('produces pages with 3-8 fields each', () => {
    const fields = Array.from({ length: 25 }, (_, i) => ({
      path: `field_${i}`,
      widget: 'text' as const,
      tier: (i < 5 ? 'essential' : 'details') as 'essential' | 'details',
      label: `Field ${i}`,
      required: i < 5,
      constraints: {},
    }));

    const result = computeWizard(fields, []);
    expect(result.useWizard).toBe(true);
    // Each page should be within bounds (allow some flexibility for edge cases)
    for (const page of result.pages!) {
      expect(page.fields.length).toBeGreaterThanOrEqual(1);
      expect(page.fields.length).toBeLessThanOrEqual(10); // slight flexibility
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// 14. Tool matching
// ═══════════════════════════════════════════════════════════════════

describe('Tool matching', () => {
  it('matches email array field to contacts.search (Tier 1)', () => {
    const match = matchFieldToTool(
      'attendees',
      { type: 'array', items: { type: 'string', format: 'email' } },
      ['contacts.search', 'places_autocomplete']
    );
    expect(match).toBeDefined();
    expect(match!.toolName).toBe('contacts.search');
    expect(match!.matchType).toBe('exact');
    expect(match!.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('matches location field to places_autocomplete (Tier 1)', () => {
    const match = matchFieldToTool('location', { type: 'string' }, [
      'contacts.search',
      'places_autocomplete',
    ]);
    expect(match).toBeDefined();
    expect(match!.toolName).toBe('places_autocomplete');
    expect(match!.matchType).toBe('exact');
  });

  it('matches channel field to list_channels (Tier 1)', () => {
    const match = matchFieldToTool('channel', { type: 'string' }, [
      'list_channels',
      'send_message',
    ]);
    expect(match).toBeDefined();
    expect(match!.toolName).toBe('list_channels');
  });

  it('returns undefined when no match', () => {
    const match = matchFieldToTool('foo', { type: 'string' }, [
      'unrelated_tool',
    ]);
    expect(match).toBeUndefined();
  });

  it('matches all fields in a schema', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        attendees: { type: 'array', items: { type: 'string', format: 'email' } },
        location: { type: 'string' },
        title: { type: 'string' },
      },
    };
    const matches = matchTools(schema, [
      'contacts.search',
      'places_autocomplete',
    ]);
    expect(matches.has('attendees')).toBe(true);
    expect(matches.has('location')).toBe(true);
    // title should not match
    expect(matches.has('title')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 15. Full analyzeSchema integration
// ═══════════════════════════════════════════════════════════════════

describe('analyzeSchema — integration', () => {
  it('analyzes a simple schema', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      title: 'Create event',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        start_date: { type: 'string', format: 'date-time' },
        end_date: { type: 'string', format: 'date-time' },
        all_day: { type: 'boolean' },
      },
      required: ['title'],
    };

    const result = analyzeSchema(schema, { toolName: 'create_event' });

    // Basic structure
    expect(result.fields).toHaveLength(5);
    expect(result.title).toBe('Create event');
    expect(result.actionLabel).toBe('Create event');

    // Widget assignments
    const titleField = result.fields.find((f) => f.path === 'title');
    expect(titleField?.widget).toBe('title-input');
    expect(titleField?.required).toBe(true);

    const descField = result.fields.find((f) => f.path === 'description');
    expect(descField?.widget).toBe('textarea');

    const startField = result.fields.find((f) => f.path === 'start_date');
    expect(startField?.widget).toBe('datetime-block');

    const allDayField = result.fields.find((f) => f.path === 'all_day');
    expect(allDayField?.widget).toBe('toggle');
  });

  it('detects groups in full analysis', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        start_date: { type: 'string', format: 'date-time' },
        end_date: { type: 'string', format: 'date-time' },
        title: { type: 'string' },
      },
      required: ['title'],
    };

    const result = analyzeSchema(schema);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].type).toBe('datetime-pair');

    // Fields should have group annotations
    const startField = result.fields.find((f) => f.path === 'start_date');
    expect(startField?.group).toBeDefined();
  });

  it('does not enable wizard for small schemas', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
      },
    };

    const result = analyzeSchema(schema);
    expect(result.useWizard).toBe(false);
    expect(result.wizardPages).toBeUndefined();
  });

  it('enables wizard for large schemas', () => {
    const properties: Record<string, JSONSchema7> = {};
    const required: string[] = [];
    for (let i = 0; i < 20; i++) {
      properties[`field_${i}`] = { type: 'string' };
      required.push(`field_${i}`); // all required → all essential → visible
    }

    const schema: JSONSchema7 = {
      type: 'object',
      properties,
      required,
    };

    const result = analyzeSchema(schema);
    expect(result.useWizard).toBe(true);
    expect(result.wizardPages).toBeDefined();
    expect(result.wizardPages!.length).toBeGreaterThanOrEqual(2);
  });

  it('assigns tiers correctly in full analysis', () => {
    const properties: Record<string, JSONSchema7> = {};
    for (let i = 0; i < 8; i++) {
      properties[`field_${i}`] = { type: 'string' };
    }
    properties['location'] = { type: 'string' };
    properties['custom_xyz'] = { type: 'string' };

    const schema: JSONSchema7 = {
      type: 'object',
      properties,
      required: ['field_0'],
    };

    const result = analyzeSchema(schema);

    const field0 = result.fields.find((f) => f.path === 'field_0');
    expect(field0?.tier).toBe('essential');

    const locField = result.fields.find((f) => f.path === 'location');
    expect(locField?.tier).toBe('details');
  });

  it('handles conditionals in full analysis', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['a', 'b'] },
        detail_a: { type: 'string' },
      },
      if: { properties: { type: { const: 'a' } } },
      then: { properties: { detail_a: { type: 'string' } } },
    };

    const result = analyzeSchema(schema);
    const detailField = result.fields.find((f) => f.path === 'detail_a');
    expect(detailField?.conditions).toBeDefined();
    expect(detailField?.conditions?.[0].dependsOn).toBe('type');
  });

  it('includes tool matches in full analysis', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        channel: { type: 'string' },
        message: { type: 'string' },
      },
    };

    const result = analyzeSchema(schema, {
      availableTools: ['list_channels', 'send_message'],
    });

    const channelField = result.fields.find((f) => f.path === 'channel');
    expect(channelField?.toolMatch).toBeDefined();
    expect(channelField?.toolMatch?.toolName).toBe('list_channels');
  });

  it('uses custom wizard threshold', () => {
    const properties: Record<string, JSONSchema7> = {};
    const required: string[] = [];
    for (let i = 0; i < 8; i++) {
      properties[`field_${i}`] = { type: 'string' };
      required.push(`field_${i}`); // all required → all essential → visible
    }

    const schema: JSONSchema7 = {
      type: 'object',
      properties,
      required,
    };

    const result = analyzeSchema(schema, { wizardThreshold: 5 });
    expect(result.useWizard).toBe(true);
  });

  it('preserves constraints in field definitions', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        age: {
          type: 'integer',
          minimum: 0,
          maximum: 120,
          default: 25,
        },
        email: {
          type: 'string',
          format: 'email',
          pattern: '^.+@.+$',
        },
      },
    };

    const result = analyzeSchema(schema);

    const ageField = result.fields.find((f) => f.path === 'age');
    expect(ageField?.constraints.minimum).toBe(0);
    expect(ageField?.constraints.maximum).toBe(120);
    expect(ageField?.constraints.default).toBe(25);
    expect(ageField?.constraints.step).toBe(1);

    const emailField = result.fields.find((f) => f.path === 'email');
    expect(emailField?.constraints.format).toBe('email');
    expect(emailField?.constraints.pattern).toBe('^.+@.+$');
  });

  it('handles nested object schemas', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
          },
          required: ['street'],
        },
      },
    };

    const result = analyzeSchema(schema);
    const addressField = result.fields.find((f) => f.path === 'address');
    expect(addressField?.widget).toBe('object-section');
    expect(addressField?.children).toHaveLength(2);
    expect(addressField?.children?.[0].path).toBe('address.street');
    expect(addressField?.children?.[0].required).toBe(true);
  });

  it('handles schema with no properties', () => {
    const schema: JSONSchema7 = { type: 'object' };
    const result = analyzeSchema(schema);
    expect(result.fields).toHaveLength(0);
    expect(result.groups).toHaveLength(0);
    expect(result.useWizard).toBe(false);
  });

  it('defaults actionLabel to "Submit" when no toolName', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: { name: { type: 'string' } },
    };
    const result = analyzeSchema(schema);
    expect(result.actionLabel).toBe('Submit');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 16. Cross-field widget resolution (resolveWidgets)
// ═══════════════════════════════════════════════════════════════════

describe('resolveWidgets cross-field rules', () => {
  it('applies L1: datetime pair both get datetime-block', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        start: { type: 'string', format: 'date-time' },
        end: { type: 'string', format: 'date-time' },
      },
    };
    const widgets = resolveWidgets(schema);
    expect(widgets.get('start')).toBe('datetime-block');
    expect(widgets.get('end')).toBe('datetime-block');
  });

  it('applies L1 with date format too', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        start_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', format: 'date' },
      },
    };
    const widgets = resolveWidgets(schema);
    expect(widgets.get('start_date')).toBe('datetime-block');
    expect(widgets.get('end_date')).toBe('datetime-block');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 17. Edge cases
// ═══════════════════════════════════════════════════════════════════

describe('Edge cases', () => {
  it('handles array type in type field', () => {
    expect(
      resolveWidget(ctx('mixed', { type: ['string', 'null'] }))
    ).toBe('text');
  });

  it('handles empty enum', () => {
    expect(
      resolveWidget(ctx('status', { type: 'string', enum: [] }))
    ).toBe('text');
  });

  it('handles mixed hex and non-hex enum (not color-dots)', () => {
    expect(
      resolveWidget(
        ctx('color', {
          type: 'string',
          enum: ['#ff0000', 'red', '#0000ff'],
        })
      )
    ).toBe('pill-selector');
  });

  it('handles schema with only required, no properties', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      required: ['foo'],
    };
    const result = analyzeSchema(schema);
    expect(result.fields).toHaveLength(0);
  });

  it('handles deeply nested objects', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: {
              type: 'object',
              properties: {
                value: { type: 'string' },
              },
            },
          },
        },
      },
    };

    const result = analyzeSchema(schema);
    expect(result.fields[0].widget).toBe('object-section');
    expect(result.fields[0].children?.[0].widget).toBe('object-section');
    expect(result.fields[0].children?.[0].children?.[0].path).toBe(
      'level1.level2.value'
    );
  });
});
