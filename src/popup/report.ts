import { getMetaSettings, registrableDomain } from '../background/storage.js';
import { getTabRuleHits } from '../background/session-store.js';

const REPORT_NEW_ISSUE =
  'https://github.com/spades-ux-shield/spades-ux-shield-filters/issues/new';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

export function pathTemplate(pathname: string): string {
  let path = pathname.replace(EMAIL_RE, ':email');
  path = path.replace(UUID_RE, ':id');
  path = path.replace(/\/\d+(?=\/|$)/g, '/:id');
  return path || '/';
}

export async function buildBreakageReportUrl(tabId: number, pageUrl: string): Promise<string> {
  const parsed = new URL(pageUrl);
  const etld1 = registrableDomain(parsed.hostname);
  const templatePath = pathTemplate(parsed.pathname);
  const manifest = chrome.runtime.getManifest();
  const version = manifest.version ?? 'unknown';
  const settings = await getMetaSettings();
  const ruleIds = await getTabRuleHits(tabId);

  const body = [
    '## Breakage report',
    '',
    `- **Site (eTLD+1):** \`${etld1}\``,
    `- **Path template:** \`${templatePath}\``,
    `- **Extension version:** \`${version}\``,
    `- **Compiled rev:** \`${settings.compiledRev}\``,
    `- **Matched rule IDs (FNV-1a):** ${ruleIds.length ? ruleIds.join(', ') : '_none recorded_'}`,
    '',
    '### Notes',
    '_Describe what broke (checkout, login, scroll, etc.)._',
  ].join('\n');

  const params = new URLSearchParams();
  params.set('template', 'breakage.yml');
  params.set('title', `[breakage] ${etld1}`);
  params.set('body', body);

  return `${REPORT_NEW_ISSUE}?${params.toString()}`;
}
