/**
 * Extract hostname-scoped cosmetic filter lines safe for Spades UX-Shield.
 * Drops network rules, generics (## without domain), snippets, HTML filters, scriptlets.
 */

const BANNED_SUBSTRINGS = [
  '##^',
  '#$#',
  '#%#',
  '#@$#',
  '+js(',
  ':xpath(',
  ':others(',
];

/** uBO / AdGuard procedural or action suffixes — Spades packs static hide in CSS only at bootstrap. */
const PROCEDURAL_OR_ACTION_RE =
  /:(?:has-text|contains|matches-css|matches-attr|matches-path|upward|watch-attr|min-text-length|remove-attr|remove-class|remove|click-dismiss|unlock-scroll|style)\(/i;

const NETWORK_PREFIX = /^(?:@@?\|\||\|\||! )/;

function isEscaped(source, index) {
  let slashes = 0;
  for (let i = index - 1; i >= 0 && source[i] === '\\'; i--) {
    slashes++;
  }
  return slashes % 2 === 1;
}

/** Index of cosmetic marker ## or #@# (not ##^). Returns -1 if none. */
export function findCosmeticMarkerIndex(line) {
  let inQuote = null;
  let paren = 0;
  let bracket = 0;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === inQuote && !isEscaped(line, i)) {
        inQuote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }
    if (ch === '(') {
      paren++;
      continue;
    }
    if (ch === ')') {
      paren = Math.max(0, paren - 1);
      continue;
    }
    if (ch === '[') {
      bracket++;
      continue;
    }
    if (ch === ']') {
      bracket = Math.max(0, bracket - 1);
      continue;
    }
    if (paren > 0 || bracket > 0) {
      continue;
    }
    if (line.startsWith('#@#', i)) {
      return i;
    }
    if (line.startsWith('##', i) && line[i + 2] !== '^') {
      return i;
    }
  }
  return -1;
}

function hostTokenLooksValid(token) {
  let host = token.trim();
  if (!host) {
    return false;
  }
  const slash = host.indexOf('/');
  if (slash !== -1) {
    host = host.slice(0, slash);
  }
  if (host.endsWith('.*')) {
    host = host.slice(0, -2);
  }
  if (!host || host.includes('*') || host.includes(' ')) {
    return false;
  }
  return host.includes('.');
}

function domainSectionValid(domainRaw) {
  if (!domainRaw || domainRaw.startsWith('@@')) {
    return false;
  }
  const tokens = domainRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) {
    return false;
  }
  return tokens.every(hostTokenLooksValid);
}

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isExtractableCosmeticLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('!')) {
    return false;
  }
  if (trimmed.startsWith('[')) {
    return false;
  }
  if (NETWORK_PREFIX.test(trimmed)) {
    return false;
  }
  if (trimmed.includes('#?#')) {
    return false;
  }
  for (const banned of BANNED_SUBSTRINGS) {
    if (trimmed.includes(banned)) {
      return false;
    }
  }
  const markerAt = findCosmeticMarkerIndex(trimmed);
  if (markerAt <= 0) {
    return false;
  }
  const domainRaw = trimmed.slice(0, markerAt).trim();
  if (!domainSectionValid(domainRaw)) {
    return false;
  }
  const markerLen = trimmed.startsWith('#@#', markerAt) ? 3 : 2;
  const body = trimmed.slice(markerAt + markerLen).trim();
  if (!body || PROCEDURAL_OR_ACTION_RE.test(body)) {
    return false;
  }
  return true;
}

/**
 * @param {string} text
 * @returns {{ lines: string[], stats: { scanned: number, kept: number, deduped: number } }}
 */
export function extractCosmeticLines(text) {
  const seen = new Set();
  const lines = [];
  let scanned = 0;
  let kept = 0;

  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    scanned++;
    if (!isExtractableCosmeticLine(raw)) {
      continue;
    }
    const normalized = raw.trim();
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    lines.push(normalized);
    kept++;
  }

  return {
    lines,
    stats: {
      scanned,
      kept,
      deduped: kept,
    },
  };
}
