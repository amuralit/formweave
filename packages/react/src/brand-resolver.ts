// ─── Service branding resolution — 4-tier cascade ───

import type { ServerConfig, BrandInfo } from '@formweave/core';

// ─── Tier 3: Built-in registry of ~50 popular services ───

interface RegistryEntry {
  name: string;
  icon: string;
  svg?: string;
  color: string;
}

const SERVICE_REGISTRY: RegistryEntry[] = [
  { name: 'Google Calendar', icon: '\uD83D\uDCC5', svg: '<path d="M4 2a2 2 0 00-2 2v16a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2H4zm2 4h12v2H6V6zm0 4h12v2H6v-2zm0 4h8v2H6v-2z" fill="#4285F4"/>', color: '#4285F4' },
  { name: 'Gmail', icon: '\u2709\uFE0F', color: '#EA4335' },
  { name: 'Slack', icon: '\uD83D\uDCAC', svg: '<g><rect x="1" y="8" width="4" height="8" rx="2" fill="#E01E5A"/><rect x="8" y="1" width="4" height="8" rx="2" fill="#36C5F0"/><rect x="15" y="8" width="4" height="8" rx="2" fill="#2EB67D"/><rect x="8" y="15" width="4" height="8" rx="2" fill="#ECB22E"/></g>', color: '#4A154B' },
  { name: 'GitHub', icon: '\uD83D\uDC19', svg: '<path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" fill="#24292E"/>', color: '#24292E' },
  { name: 'GitLab', icon: '\uD83E\uDD8A', color: '#FC6D26' },
  { name: 'Jira', icon: '\uD83D\uDCCB', svg: '<path d="M12 2L2 12l10 10 10-10L12 2zm0 3.6L18.4 12 12 18.4 5.6 12 12 5.6z" fill="#0052CC"/>', color: '#0052CC' },
  { name: 'Confluence', icon: '\uD83D\uDCD8', color: '#172B4D' },
  { name: 'Notion', icon: '\uD83D\uDDD2\uFE0F', svg: '<path d="M4 3h10l5 5v11a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2zm6 0v7h7M7 13h8M7 17h5" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>', color: '#000000' },
  { name: 'Linear', icon: '\uD83D\uDFE3', svg: '<circle cx="12" cy="12" r="10" fill="none" stroke="#5E6AD2" stroke-width="2"/><path d="M8 12l3 3 5-6" fill="none" stroke="#5E6AD2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', color: '#5E6AD2' },
  { name: 'Asana', icon: '\uD83C\uDFAF', color: '#F06A6A' },
  { name: 'Trello', icon: '\uD83D\uDDC2\uFE0F', color: '#0079BF' },
  { name: 'Salesforce', icon: '\u2601\uFE0F', svg: '<path d="M6 16c-2.2 0-4-1.8-4-4 0-1.8 1.2-3.4 3-3.9C5.5 5.8 7.6 4 10 4c2 0 3.8 1.2 4.6 3 .3 0 .6-.1.9-.1 2.5 0 4.5 2 4.5 4.5S17.9 16 15.5 16H6z" fill="#00A1E0"/>', color: '#00A1E0' },
  { name: 'HubSpot', icon: '\uD83E\uDDF2', color: '#FF7A59' },
  { name: 'Zendesk', icon: '\uD83C\uDFAB', color: '#03363D' },
  { name: 'Stripe', icon: '\uD83D\uDCB3', svg: '<path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" fill="#635BFF"/>', color: '#635BFF' },
  { name: 'Twilio', icon: '\uD83D\uDCDE', color: '#F22F46' },
  { name: 'SendGrid', icon: '\uD83D\uDCE7', color: '#1A82E2' },
  { name: 'AWS', icon: '\u2601\uFE0F', color: '#FF9900' },
  { name: 'Discord', icon: '\uD83C\uDFAE', svg: '<path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.099.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" fill="#5865F2"/>', color: '#5865F2' },
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
  { name: 'Vercel', icon: '\u25B2', svg: '<path d="M12 2L22 20H2L12 2z" fill="#000"/>', color: '#000000' },
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
      svg: registryEntry.svg,
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
