// ─── Tool matcher: 3-tier matching system ───

import type { JSONSchema7, ToolMatch } from './types';

// ─── Tier 1: Deterministic regex patterns ───

interface PatternRule {
  /** Regex to match against field name */
  fieldPattern: RegExp;
  /** Regex to match against tool name */
  toolPattern: RegExp;
  /** Enhancement type */
  enhancementType: ToolMatch['enhancementType'];
}

const TIER1_RULES: PatternRule[] = [
  // Email arrays → contacts.search
  {
    fieldPattern: /^(emails?|attendees?|participants?|recipients?|invitees?|cc|bcc|to|from)$/i,
    toolPattern: /contacts?[._-]?(search|lookup|find|list)/i,
    enhancementType: 'search',
  },
  // Location fields → places autocomplete
  {
    fieldPattern: /^(location|venue|place|address|street|where)$/i,
    toolPattern: /places?[._-]?(autocomplete|search|lookup|find)/i,
    enhancementType: 'autocomplete',
  },
  // Channel fields → list channels
  {
    fieldPattern: /^(channel|channel_id|channelId|slack_channel|slackChannel|room)$/i,
    toolPattern: /(list|get|search)[._-]?channels?/i,
    enhancementType: 'list',
  },
  // User/assignee → user search
  {
    fieldPattern: /^(user|user_id|userId|assignee|assigned_to|assignedTo|owner|creator|author|member)$/i,
    toolPattern: /(search|list|get|find)[._-]?users?/i,
    enhancementType: 'search',
  },
  // Project → list projects
  {
    fieldPattern: /^(project|project_id|projectId|project_name|projectName|workspace)$/i,
    toolPattern: /(list|get|search|find)[._-]?projects?/i,
    enhancementType: 'list',
  },
  // Repository → list repos
  {
    fieldPattern: /^(repo|repository|repo_name|repoName)$/i,
    toolPattern: /(list|get|search|find)[._-]?repo(s|sitories)?/i,
    enhancementType: 'list',
  },
  // Label/tag → list labels
  {
    fieldPattern: /^(labels?|tags?)$/i,
    toolPattern: /(list|get|search|find)[._-]?(labels?|tags?)/i,
    enhancementType: 'list',
  },
  // Team → list teams
  {
    fieldPattern: /^(team|team_id|teamId|team_name|teamName|department)$/i,
    toolPattern: /(list|get|search|find)[._-]?teams?/i,
    enhancementType: 'list',
  },
  // Calendar → list calendars
  {
    fieldPattern: /^(calendar|calendar_id|calendarId)$/i,
    toolPattern: /(list|get|search|find)[._-]?calendars?/i,
    enhancementType: 'list',
  },
  // Timezone → list timezones
  {
    fieldPattern: /^(timezone|time_zone|timeZone|tz)$/i,
    toolPattern: /(list|get)[._-]?time_?zones?/i,
    enhancementType: 'list',
  },
  // File/attachment → file search
  {
    fieldPattern: /^(file|file_id|fileId|attachment|document|doc)$/i,
    toolPattern: /(search|list|get|find)[._-]?files?/i,
    enhancementType: 'search',
  },
  // Category → list categories
  {
    fieldPattern: /^(category|categories|category_id|categoryId)$/i,
    toolPattern: /(list|get|search|find)[._-]?categor(y|ies)/i,
    enhancementType: 'list',
  },
];

// ─── Tier 3: Jaro-Winkler similarity ───

/**
 * Compute Jaro similarity between two strings.
 */
function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  if (matchDistance < 0) return 0.0;

  const s1Matches = new Uint8Array(s1.length);
  const s2Matches = new Uint8Array(s2.length);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = 1;
      s2Matches[j] = 1;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3
  );
}

/**
 * Compute Jaro-Winkler similarity (gives bonus for common prefix).
 */
function jaroWinkler(s1: string, s2: string): number {
  const jaro = jaroSimilarity(s1, s2);

  // Find common prefix (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i] === s2[i]) {
      prefix++;
    } else {
      break;
    }
  }

  // Winkler's scaling factor (0.1 is standard)
  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Normalize a name for comparison: lowercase, remove separators.
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_\-./\s]+/g, '')
    .trim();
}

/**
 * Tokenize a name into words for comparison.
 */
function tokenize(name: string): string[] {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-./]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

// ─── Main matching function ───

/**
 * Attempt to match a field to a tool using 3-tier matching.
 *
 * @param fieldName - The schema field name
 * @param fieldSchema - The field's JSON Schema
 * @param toolNames - Available tool names
 * @returns A ToolMatch if confidence > 0.5, otherwise undefined
 */
interface PrecomputedToolData {
  normalized: string;
  tokens: string[];
}

export function matchFieldToTool(
  fieldName: string,
  fieldSchema: JSONSchema7,
  toolNames: string[],
  precomputedToolData?: Map<string, PrecomputedToolData>
): ToolMatch | undefined {
  if (toolNames.length === 0) return undefined;

  // ─── Tier 1: Deterministic regex ───
  for (const rule of TIER1_RULES) {
    if (rule.fieldPattern.test(fieldName)) {
      for (const toolName of toolNames) {
        if (rule.toolPattern.test(toolName)) {
          return {
            toolName,
            confidence: 0.95,
            matchType: 'exact',
            enhancementType: rule.enhancementType,
          };
        }
      }
    }
  }

  // ─── Tier 2: Schema property matching ───
  const fieldTokens = tokenize(fieldName);

  for (const toolName of toolNames) {
    const toolTokens = precomputedToolData?.get(toolName)?.tokens ?? tokenize(toolName);

    const overlap = fieldTokens.filter((ft) =>
      toolTokens.some((tt) => tt === ft || tt.includes(ft) || ft.includes(tt))
    );

    if (overlap.length > 0 && overlap.length >= fieldTokens.length * 0.5) {
      let enhancementType: ToolMatch['enhancementType'] = 'search';
      if (/list|get|all/i.test(toolName)) enhancementType = 'list';
      if (/autocomplete|suggest/i.test(toolName)) enhancementType = 'autocomplete';

      return {
        toolName,
        confidence: 0.75,
        matchType: 'schema',
        enhancementType,
      };
    }
  }

  // ─── Tier 3: Jaro-Winkler fuzzy matching ───
  const normalizedField = normalize(fieldName);
  let bestMatch: { toolName: string; score: number } | null = null;

  for (const toolName of toolNames) {
    const data = precomputedToolData?.get(toolName);
    const normalizedTool = data?.normalized ?? normalize(toolName);
    const score = jaroWinkler(normalizedField, normalizedTool);

    if (score > (bestMatch?.score ?? 0)) {
      bestMatch = { toolName, score };
      // Early termination: near-perfect match found
      if (score > 0.95) break;
    }

    const toolTokens = data?.tokens ?? tokenize(toolName);
    for (const token of toolTokens) {
      const tokenScore = jaroWinkler(normalizedField, token);
      if (tokenScore > (bestMatch?.score ?? 0)) {
        bestMatch = { toolName, score: tokenScore };
        if (tokenScore > 0.95) break;
      }
    }
    if (bestMatch && bestMatch.score > 0.95) break;
  }

  if (bestMatch && bestMatch.score > 0.8) {
    let enhancementType: ToolMatch['enhancementType'] = 'search';
    if (/list|get|all/i.test(bestMatch.toolName)) enhancementType = 'list';
    if (/autocomplete|suggest/i.test(bestMatch.toolName)) enhancementType = 'autocomplete';

    return {
      toolName: bestMatch.toolName,
      confidence: Math.round(bestMatch.score * 100) / 100,
      matchType: 'fuzzy',
      enhancementType,
    };
  }

  return undefined;
}

/**
 * Match all fields in a schema to available tools.
 */
export function matchTools(
  schema: JSONSchema7,
  toolNames: string[]
): Map<string, ToolMatch> {
  const result = new Map<string, ToolMatch>();
  const properties = schema.properties || {};

  // Pre-compute normalized names and tokens once for all tools
  const precomputed = new Map<string, PrecomputedToolData>();
  for (const toolName of toolNames) {
    precomputed.set(toolName, {
      normalized: normalize(toolName),
      tokens: tokenize(toolName),
    });
  }

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    const match = matchFieldToTool(fieldName, fieldSchema, toolNames, precomputed);
    if (match) {
      result.set(fieldName, match);
    }
  }

  return result;
}
