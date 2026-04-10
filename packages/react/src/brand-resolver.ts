// ─── Service branding resolution — 4-tier cascade ───

import type { ServerConfig, BrandInfo } from '@formweave/core';

// ─── Tier 3: Built-in registry of ~50 popular services ───

interface RegistryEntry {
  name: string;
  icon: string;
  color: string;
}

const SERVICE_REGISTRY: RegistryEntry[] = [
  { name: 'Google Calendar', icon: '\uD83D\uDCC5', color: '#4285F4' },
  { name: 'Gmail', icon: '\u2709\uFE0F', color: '#EA4335' },
  { name: 'Slack', icon: '\uD83D\uDCAC', color: '#4A154B' },
  { name: 'GitHub', icon: '\uD83D\uDC19', color: '#24292E' },
  { name: 'GitLab', icon: '\uD83E\uDD8A', color: '#FC6D26' },
  { name: 'Jira', icon: '\uD83D\uDCCB', color: '#0052CC' },
  { name: 'Confluence', icon: '\uD83D\uDCD8', color: '#172B4D' },
  { name: 'Notion', icon: '\uD83D\uDDD2\uFE0F', color: '#000000' },
  { name: 'Linear', icon: '\uD83D\uDFE3', color: '#5E6AD2' },
  { name: 'Asana', icon: '\uD83C\uDFAF', color: '#F06A6A' },
  { name: 'Trello', icon: '\uD83D\uDDC2\uFE0F', color: '#0079BF' },
  { name: 'Salesforce', icon: '\u2601\uFE0F', color: '#00A1E0' },
  { name: 'HubSpot', icon: '\uD83E\uDDF2', color: '#FF7A59' },
  { name: 'Zendesk', icon: '\uD83C\uDFAB', color: '#03363D' },
  { name: 'Stripe', icon: '\uD83D\uDCB3', color: '#635BFF' },
  { name: 'Twilio', icon: '\uD83D\uDCDE', color: '#F22F46' },
  { name: 'SendGrid', icon: '\uD83D\uDCE7', color: '#1A82E2' },
  { name: 'AWS', icon: '\u2601\uFE0F', color: '#FF9900' },
  { name: 'Discord', icon: '\uD83C\uDFAE', color: '#5865F2' },
  { name: 'Teams', icon: '\uD83D\uDCAC', color: '#6264A7' },
  { name: 'Zoom', icon: '\uD83D\uDCF9', color: '#2D8CFF' },
  { name: 'Figma', icon: '\uD83C\uDFA8', color: '#F24E1E' },
  { name: 'Dropbox', icon: '\uD83D\uDCE6', color: '#0061FF' },
  { name: 'Box', icon: '\uD83D\uDCE5', color: '#0061D5' },
  { name: 'Airtable', icon: '\uD83D\uDDC3\uFE0F', color: '#18BFFF' },
  { name: 'Monday', icon: '\uD83D\uDCC6', color: '#FF3D57' },
  { name: 'ClickUp', icon: '\u2705', color: '#7B68EE' },
  { name: 'Intercom', icon: '\uD83D\uDDE8\uFE0F', color: '#286EFA' },
  { name: 'Segment', icon: '\uD83D\uDCCA', color: '#52BD95' },
  { name: 'Datadog', icon: '\uD83D\uDC36', color: '#632CA6' },
  { name: 'PagerDuty', icon: '\uD83D\uDEA8', color: '#06AC38' },
  { name: 'Opsgenie', icon: '\uD83D\uDD14', color: '#2684FF' },
  { name: 'Vercel', icon: '\u25B2', color: '#000000' },
  { name: 'Netlify', icon: '\uD83C\uDF10', color: '#00C7B7' },
  { name: 'Cloudflare', icon: '\uD83D\uDEE1\uFE0F', color: '#F38020' },
  { name: 'Supabase', icon: '\u26A1', color: '#3ECF8E' },
  { name: 'Firebase', icon: '\uD83D\uDD25', color: '#FFCA28' },
  { name: 'Sentry', icon: '\uD83D\uDC1B', color: '#362D59' },
  { name: 'LaunchDarkly', icon: '\uD83D\uDE80', color: '#405BFF' },
  { name: 'Amplitude', icon: '\uD83D\uDCC8', color: '#1E61F0' },
];

/** Normalized name → registry entry for fast lookup */
const REGISTRY_MAP = new Map<string, RegistryEntry>(
  SERVICE_REGISTRY.map((entry) => [entry.name.toLowerCase(), entry]),
);

// ─── Tier 4: Deterministic hue generation ───

/**
 * Simple string hash → deterministic hue (0-360).
 */
function hashToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash) % 360;
}

/**
 * Generate a colored initial icon for a service name.
 * Returns an HSL color string and the initial letter.
 */
function generateBrand(name: string): { color: string; icon: string } {
  const hue = hashToHue(name);
  const color = `hsl(${hue}, 65%, 45%)`;
  const initial = name.charAt(0).toUpperCase();
  return { color, icon: initial };
}

// ─── Tier 2: Favicon extraction ───

/**
 * Extract domain from a server URL and construct a Google favicon URL.
 */
function getFaviconUrl(serverUrl: string): string | null {
  try {
    const url = new URL(serverUrl);
    // Only resolve favicons for public HTTP(S) URLs to prevent leaking internal hostnames
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=32`;
  } catch {
    return null;
  }
}

// ─── Main resolver ───

/**
 * Resolve branding for a server using the 4-tier cascade:
 * 1. Explicit — icon/color props on the server config
 * 2. Favicon — extract domain from serverUrl
 * 3. Registry — match name against built-in service registry
 * 4. Generated — hash name to deterministic hue + initial letter
 */
export function resolveBrand(server?: ServerConfig): BrandInfo {
  if (!server) {
    return {
      name: 'Form',
      icon: '\uD83D\uDCCB',
      color: '#6366F1',
      source: 'generated',
    };
  }

  // Tier 1: Explicit
  if (server.icon && server.color) {
    return {
      name: server.name,
      icon: server.icon,
      color: server.color,
      source: 'explicit',
    };
  }

  // Tier 2: Favicon
  if (server.serverUrl) {
    const favicon = getFaviconUrl(server.serverUrl);
    if (favicon) {
      return {
        name: server.name,
        icon: favicon,
        color: server.color || '#6366F1',
        source: 'favicon',
      };
    }
  }

  // Tier 3: Registry
  const registryEntry = REGISTRY_MAP.get(server.name.toLowerCase());
  if (registryEntry) {
    return {
      name: server.name,
      icon: server.icon || registryEntry.icon,
      color: server.color || registryEntry.color,
      source: 'registry',
    };
  }

  // Tier 4: Generated
  const generated = generateBrand(server.name);
  return {
    name: server.name,
    icon: server.icon || generated.icon,
    color: server.color || generated.color,
    source: 'generated',
  };
}

/**
 * Get the full service registry (useful for testing/debugging).
 */
export function getServiceRegistry(): readonly RegistryEntry[] {
  return SERVICE_REGISTRY;
}
