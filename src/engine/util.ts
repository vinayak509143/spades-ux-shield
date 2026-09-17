const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function fnv1a(text: string): number {
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

export function normalizeHost(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.includes('://')) {
    return null;
  }
  try {
    const url = new URL(`http://${trimmed}`);
    return url.hostname || null;
  } catch {
    return null;
  }
}

export function pathGlobToRegExp(glob: string): RegExp {
  let pattern = '^';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*') {
      pattern += '.*';
    } else if (ch === '?') {
      pattern += '.';
    } else if (/[.+^${}()|[\]\\]/.test(ch)) {
      pattern += `\\${ch}`;
    } else {
      pattern += ch;
    }
  }
  pattern += '.*';
  return new RegExp(pattern);
}

export function parseRegexLiteral(raw: string): RegExp | null {
  const trimmed = raw.trim();
  if (trimmed.length < 3 || trimmed[0] !== '/') {
    return null;
  }
  let end = trimmed.lastIndexOf('/');
  if (end <= 0) {
    return null;
  }
  const body = trimmed.slice(1, end);
  const flags = trimmed.slice(end + 1);
  try {
    return new RegExp(body, flags);
  } catch {
    return null;
  }
}

export function unquoteArg(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseArgValue(raw: string): string | RegExp {
  const trimmed = raw.trim();
  if (trimmed.startsWith('/')) {
    const re = parseRegexLiteral(trimmed);
    if (re) {
      return re;
    }
  }
  return unquoteArg(trimmed);
}

export function isBareHasTextSubject(selector: string): boolean {
  const base = selector.trim().toLowerCase();
  return base === 'div' || base === 'span' || base === 'p' || base === '*';
}

export function hostSuffixes(hostname: string): string[] {
  const labels = hostname.toLowerCase().split('.').filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < labels.length; i++) {
    out.push(labels.slice(i).join('.'));
  }
  return out;
}
