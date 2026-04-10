// ─── Label humanization utilities ───

/**
 * Converts a field name from snake_case, camelCase, or kebab-case
 * into a human-readable "Title Case" label.
 *
 * Examples:
 *   "start_date"   → "Start date"
 *   "firstName"    → "First name"
 *   "zip-code"     → "Zip code"
 *   "URL"          → "URL"
 *   "isActive"     → "Is active"
 */
export function humanizeFieldName(name: string): string {
  if (!name) return '';

  // Split on underscores, hyphens, dots, and camelCase boundaries
  const tokens = name
    // Insert space before uppercase runs: "firstName" → "first Name"
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    // Insert space between uppercase run and lowercase: "XMLParser" → "XML Parser"
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    // Replace separators with spaces
    .replace(/[_\-./]+/g, ' ')
    .trim()
    .split(/\s+/);

  if (tokens.length === 0) return '';

  // If a token is fully uppercase and short (like "URL", "ID"), keep it as-is.
  // Otherwise, lowercase it.
  const processed = tokens.map((token, i) => {
    if (token.length <= 3 && token === token.toUpperCase() && /^[A-Z]+$/.test(token)) {
      return token; // keep acronyms
    }
    if (i === 0) {
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    }
    return token.toLowerCase();
  });

  return processed.join(' ');
}

/**
 * Infers a human-readable action label from a tool/action name.
 *
 * Examples:
 *   "create_event"  → "Create event"
 *   "send_message"  → "Send message"
 *   "updateProfile" → "Update profile"
 *   undefined       → "Submit"
 */
export function inferActionLabel(toolName?: string): string {
  if (!toolName) return 'Submit';
  return humanizeFieldName(toolName);
}
