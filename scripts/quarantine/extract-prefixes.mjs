import { isDeniedPrefix, isHashedClass, isThemeNativePrefix } from './denylist.mjs';

export function prefixFromToken(token) {
  const t = String(token || '').trim();
  if (!t || isHashedClass(t)) {
    return null;
  }
  const parts = t.split('-').filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  let prefix = `${parts[0].toLowerCase()}-`;
  if (parts[0].length <= 5 && parts.length >= 3) {
    prefix = `${parts[0].toLowerCase()}-${parts[1].toLowerCase()}-`;
  }
  if (isDeniedPrefix(prefix) || isThemeNativePrefix(prefix)) {
    return null;
  }
  return prefix;
}

export function collectTokensFromNode(node) {
  const tokens = [];
  if (node?.id) {
    tokens.push(String(node.id));
  }
  for (const c of node?.classes ?? []) {
    tokens.push(String(c));
  }
  const html = String(node?.outerHTML || '');
  const classAttr = /class\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = classAttr.exec(html)) !== null) {
    tokens.push(...m[1].split(/\s+/).filter(Boolean));
  }
  const idAttr = /id\s*=\s*["']([^"']+)["']/gi;
  while ((m = idAttr.exec(html)) !== null) {
    tokens.push(m[1]);
  }
  return tokens;
}

export function minePrefixesFromWidgets(scraped) {
  const counts = new Map();
  const pages = scraped?.pages ?? [];
  for (const page of pages) {
    if (page.skipped) {
      continue;
    }
    for (const node of page.nodes ?? []) {
      for (const token of collectTokensFromNode(node)) {
        const prefix = prefixFromToken(token);
        if (!prefix) {
          continue;
        }
        counts.set(prefix, (counts.get(prefix) || 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([prefix, count]) => ({ prefix, count }));
}

export function formatVendorRule(prefix) {
  const p = String(prefix);
  return `html[data-op="1"] [class*="${p}"],\nhtml[data-op="1"] [id*="${p}"]`;
}

export function formatVendorCss(prefixes) {
  const rules = prefixes
    .map((row) => (typeof row === 'string' ? row : row.prefix))
    .filter((p) => !isDeniedPrefix(p) && !isThemeNativePrefix(p));
  if (rules.length === 0) {
    return '/* no vendor prefixes survived denylist */\n';
  }
  const selectors = rules.flatMap((p) => [
    `html[data-op="1"] [class*="${p}"]`,
    `html[data-op="1"] [id*="${p}"]`,
  ]);
  return `${selectors.join(',\n')} {\n  display: none !important;\n}\n`;
}

export function prefixesFromVendorCss(css) {
  const found = new Set();
  const re = /\[(?:class|id)\*=["']([^"']+)["']\]/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    found.add(m[1]);
  }
  return [...found];
}
