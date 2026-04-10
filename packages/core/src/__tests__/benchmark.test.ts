import { describe, it, expect } from 'vitest';
import {
  analyzeSchema,
  resolveWidget,
  resolveWidgets,
  matchFieldToTool,
  matchTools,
  detectGroups,
  assignTiers,
  parseConditionals,
  computeWizard,
  humanizeFieldName,
} from '../index';
import type { JSONSchema7, ResolverContext } from '../index';

// ─── Helpers ───

/** Generate a schema with N string/number/boolean/enum fields */
function generateSchema(fieldCount: number): JSONSchema7 {
  const properties: Record<string, JSONSchema7> = {};
  const required: string[] = [];

  for (let i = 0; i < fieldCount; i++) {
    const variant = i % 7;
    const name = `field_${i}`;

    switch (variant) {
      case 0:
        properties[name] = { type: 'string' };
        break;
      case 1:
        properties[name] = { type: 'number', minimum: 0, maximum: 100 };
        break;
      case 2:
        properties[name] = { type: 'boolean' };
        break;
      case 3:
        properties[name] = {
          type: 'string',
          enum: ['option_a', 'option_b', 'option_c'],
        };
        break;
      case 4:
        properties[name] = {
          type: 'string',
          format: 'date-time',
          description: 'A datetime field for testing',
        };
        break;
      case 5:
        properties[name] = {
          type: 'array',
          items: { type: 'string' },
        };
        break;
      case 6:
        properties[name] = {
          type: 'string',
          enum: Array.from({ length: 10 }, (_, j) => `val_${i}_${j}`),
        };
        break;
    }

    // Mark first 30% as required
    if (i < fieldCount * 0.3) {
      required.push(name);
    }
  }

  return {
    type: 'object',
    title: 'Benchmark Schema',
    properties,
    required,
  };
}

/** Generate a schema that includes datetime pairs, address fields, and conditionals */
function generateComplexSchema(fieldCount: number): JSONSchema7 {
  const base = generateSchema(fieldCount);

  // Add datetime pair
  base.properties!['start_date'] = { type: 'string', format: 'date-time' };
  base.properties!['end_date'] = { type: 'string', format: 'date-time' };

  // Add address cluster
  base.properties!['street'] = { type: 'string' };
  base.properties!['city'] = { type: 'string' };
  base.properties!['state'] = { type: 'string' };
  base.properties!['zip_code'] = { type: 'string' };

  // Add contact cluster
  base.properties!['email'] = { type: 'string', format: 'email' };
  base.properties!['phone'] = { type: 'string' };

  // Add conditionals
  base.allOf = [
    {
      if: { properties: { field_2: { const: true } } },
      then: { properties: { field_3: {} }, required: ['field_3'] },
    },
    {
      if: { properties: { field_0: { enum: ['yes'] } } },
      then: { properties: { field_1: {} } },
      else: { properties: { field_5: {} } },
    },
  ];

  return base;
}

/** Generate tool names for matching */
function generateToolNames(count: number): string[] {
  const prefixes = [
    'search', 'list', 'get', 'find', 'create', 'update', 'delete',
    'autocomplete', 'suggest', 'lookup', 'fetch', 'query',
  ];
  const nouns = [
    'users', 'projects', 'channels', 'teams', 'calendars',
    'contacts', 'files', 'labels', 'repos', 'categories',
    'events', 'tasks', 'messages', 'notifications', 'workflows',
    'dashboards', 'reports', 'integrations', 'webhooks', 'pipelines',
  ];
  const tools: string[] = [];
  for (let i = 0; i < count; i++) {
    const prefix = prefixes[i % prefixes.length];
    const noun = nouns[i % nouns.length];
    tools.push(`${prefix}_${noun}_${i}`);
  }
  return tools;
}

/** Measure execution time of a function over multiple iterations */
function benchmark(fn: () => void, iterations: number = 10): number {
  // Warmup
  for (let i = 0; i < 3; i++) fn();

  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  // Return median to avoid outlier influence
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)];
}

// ═══════════════════════════════════════════════════════════════════
// 1. analyzeSchema benchmarks
// ═══════════════════════════════════════════════════════════════════

describe('analyzeSchema performance', () => {
  it('handles 10 fields under 2ms', () => {
    const schema = generateSchema(10);
    const median = benchmark(() => analyzeSchema(schema));
    expect(median).toBeLessThan(2);
  });

  it('handles 50 fields under 5ms', () => {
    const schema = generateSchema(50);
    const median = benchmark(() => analyzeSchema(schema));
    expect(median).toBeLessThan(5);
  });

  it('handles 100 fields under 10ms', () => {
    const schema = generateSchema(100);
    const median = benchmark(() => analyzeSchema(schema));
    expect(median).toBeLessThan(10);
  });

  it('handles 500 fields under 50ms', () => {
    const schema = generateSchema(500);
    const median = benchmark(() => analyzeSchema(schema));
    expect(median).toBeLessThan(50);
  });

  it('scaling from 50 to 500 fields: detect super-linear behavior', () => {
    const schema50 = generateSchema(50);
    const schema500 = generateSchema(500);
    const time50 = benchmark(() => analyzeSchema(schema50));
    const time500 = benchmark(() => analyzeSchema(schema500));

    // Linear scaling would be 10x (500/50). Currently the pipeline has
    // O(n^2) hotspots (wizard page annotation uses fields.find() in a
    // nested loop, and tool matching is O(fields * tools * tokenLength)).
    // This test guards against regressions beyond the current behavior.
    // If optimized to linear, tighten this to 15x.
    const ratio = time500 / Math.max(time50, 0.01);
    expect(ratio).toBeLessThan(60);
  });

  it('handles complex schema (groups, conditionals, wizard) under 15ms for 100 fields', () => {
    const schema = generateComplexSchema(100);
    const median = benchmark(() =>
      analyzeSchema(schema, { wizardThreshold: 10 }),
    );
    expect(median).toBeLessThan(15);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. Widget resolution benchmarks
// ═══════════════════════════════════════════════════════════════════

describe('Widget resolution performance', () => {
  it('resolveWidgets with 100 fields under 3ms', () => {
    const schema = generateSchema(100);
    const median = benchmark(() => resolveWidgets(schema));
    expect(median).toBeLessThan(3);
  });

  it('resolveWidgets with 500 fields under 10ms', () => {
    const schema = generateSchema(500);
    const median = benchmark(() => resolveWidgets(schema));
    expect(median).toBeLessThan(10);
  });

  it('single resolveWidget call under 0.05ms', () => {
    const ctx: ResolverContext = {
      fieldName: 'description',
      fieldPath: 'description',
      schema: { type: 'string', maxLength: 500, description: 'A long text field' },
      required: false,
      fieldIndex: 0,
      totalFields: 10,
      allFieldNames: ['title', 'description', 'status'],
    };

    const median = benchmark(() => resolveWidget(ctx), 100);
    expect(median).toBeLessThan(0.05);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. Tool matching benchmarks
// ═══════════════════════════════════════════════════════════════════

describe('Tool matching performance', () => {
  it('matchFieldToTool with 10 tools under 0.2ms', () => {
    const tools = generateToolNames(10);
    const schema: JSONSchema7 = { type: 'string' };
    const median = benchmark(() => matchFieldToTool('channel', schema, tools), 50);
    expect(median).toBeLessThan(0.2);
  });

  it('matchFieldToTool with 100 tools under 1ms', () => {
    const tools = generateToolNames(100);
    const schema: JSONSchema7 = { type: 'string' };
    const median = benchmark(() => matchFieldToTool('assignee', schema, tools), 50);
    expect(median).toBeLessThan(1);
  });

  it('matchFieldToTool with 500 tools under 5ms', () => {
    const tools = generateToolNames(500);
    const schema: JSONSchema7 = { type: 'string' };
    const median = benchmark(() => matchFieldToTool('project', schema, tools), 20);
    expect(median).toBeLessThan(5);
  });

  it('matchTools (all fields) with 50 fields x 100 tools under 30ms', () => {
    const schema = generateSchema(50);
    const tools = generateToolNames(100);
    const median = benchmark(() => matchTools(schema, tools), 10);
    expect(median).toBeLessThan(30);
  });

  it('matchTools (all fields) with 100 fields x 500 tools under 200ms', () => {
    const schema = generateSchema(100);
    const tools = generateToolNames(500);
    const median = benchmark(() => matchTools(schema, tools), 5);
    expect(median).toBeLessThan(200);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. Jaro-Winkler intensive benchmarks
// ═══════════════════════════════════════════════════════════════════

describe('Jaro-Winkler / fuzzy matching performance', () => {
  it('1000 fuzzy comparisons under 10ms', () => {
    // matchFieldToTool exercises Jaro-Winkler in tier 3
    // We use field names that won't match tier 1 or 2 to force fuzzy path
    const tools = Array.from({ length: 100 }, (_, i) => `obscure_tool_name_${i}`);
    const schema: JSONSchema7 = { type: 'string' };

    const median = benchmark(() => {
      for (let i = 0; i < 10; i++) {
        matchFieldToTool(`unrelated_field_${i}`, schema, tools);
      }
    }, 20);
    expect(median).toBeLessThan(10);
  });

  it('Tier 3 fallback with many tools stays under 20ms for 500 tools', () => {
    const tools = Array.from({ length: 500 }, (_, i) => `xyz_tool_${i}_operation`);
    const schema: JSONSchema7 = { type: 'string' };

    const median = benchmark(
      () => matchFieldToTool('abc_unknown_field', schema, tools),
      10,
    );
    expect(median).toBeLessThan(20);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. Grouping detection benchmarks
// ═══════════════════════════════════════════════════════════════════

describe('Grouping detection performance', () => {
  it('detectGroups with 100 fields under 2ms', () => {
    const schema = generateComplexSchema(100);
    const median = benchmark(() => detectGroups(schema));
    expect(median).toBeLessThan(2);
  });

  it('detectGroups with 500 fields under 5ms', () => {
    const schema = generateComplexSchema(500);
    const median = benchmark(() => detectGroups(schema));
    expect(median).toBeLessThan(5);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. Progressive disclosure tier assignment benchmarks
// ═══════════════════════════════════════════════════════════════════

describe('Tier assignment performance', () => {
  it('assignTiers with 100 fields under 1ms', () => {
    const schema = generateSchema(100);
    const median = benchmark(() => assignTiers(schema));
    expect(median).toBeLessThan(1);
  });

  it('assignTiers with 500 fields under 3ms', () => {
    const schema = generateSchema(500);
    const median = benchmark(() => assignTiers(schema));
    expect(median).toBeLessThan(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. Conditionals parsing benchmarks
// ═══════════════════════════════════════════════════════════════════

describe('Conditionals parsing performance', () => {
  it('parseConditionals with 20 allOf conditions under 1ms', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: Object.fromEntries(
        Array.from({ length: 40 }, (_, i) => [`cond_field_${i}`, { type: 'string' }]),
      ),
      allOf: Array.from({ length: 20 }, (_, i) => ({
        if: { properties: { [`cond_field_${i}`]: { const: `value_${i}` } } },
        then: { properties: { [`cond_field_${i + 20}`]: {} } },
      })),
    };

    const median = benchmark(() => parseConditionals(schema));
    expect(median).toBeLessThan(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. Wizard page grouping benchmarks
// ═══════════════════════════════════════════════════════════════════

describe('Wizard computation performance', () => {
  it('computeWizard with 100 fields under 5ms', () => {
    const schema = generateComplexSchema(100);
    const analysis = analyzeSchema(schema);
    const groups = detectGroups(schema);

    const median = benchmark(() => computeWizard(analysis.fields, groups, 10));
    expect(median).toBeLessThan(5);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. Label humanization benchmarks
// ═══════════════════════════════════════════════════════════════════

describe('Label humanization performance', () => {
  it('humanizeFieldName 1000 calls under 5ms', () => {
    const names = Array.from({ length: 1000 }, (_, i) => `myFieldName_with_parts_${i}`);
    const median = benchmark(() => {
      for (const name of names) {
        humanizeFieldName(name);
      }
    }, 10);
    expect(median).toBeLessThan(5);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. End-to-end analysis with tool matching
// ═══════════════════════════════════════════════════════════════════

describe('End-to-end analysis with tools', () => {
  it('analyzeSchema with 50 fields + 50 tools under 20ms', () => {
    const schema = generateComplexSchema(50);
    const tools = generateToolNames(50);
    const median = benchmark(() =>
      analyzeSchema(schema, { availableTools: tools, wizardThreshold: 10 }),
    );
    expect(median).toBeLessThan(20);
  });

  it('analyzeSchema with 100 fields + 200 tools under 100ms', () => {
    const schema = generateComplexSchema(100);
    const tools = generateToolNames(200);
    const median = benchmark(() =>
      analyzeSchema(schema, { availableTools: tools, wizardThreshold: 10 }),
    );
    expect(median).toBeLessThan(100);
  });
});
