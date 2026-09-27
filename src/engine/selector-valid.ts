/**
 * Drop invalid cosmetic selectors so one bad rule cannot void insertCSS for a host.
 */

/** Comma at paren/bracket depth 0 splits selectors; host gate applies to the first branch only. */
export function hasTopLevelCommaInSelector(selector: string): boolean {
  let paren = 0;
  let bracket = 0;
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < selector.length; i += 1) {
    const ch = selector[i];
    if (quote) {
      if (ch === '\\' && i + 1 < selector.length) {
        i += 1;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '(') {
      paren += 1;
      continue;
    }
    if (ch === ')') {
      paren = Math.max(0, paren - 1);
      continue;
    }
    if (ch === '[') {
      bracket += 1;
      continue;
    }
    if (ch === ']') {
      bracket = Math.max(0, bracket - 1);
      continue;
    }
    if (ch === ',' && paren === 0 && bracket === 0) {
      return true;
    }
  }
  return false;
}

export function hasUnsafeSelectorSyntax(selector: string): boolean {
  const trimmed = selector.trim();
  if (!trimmed) {
    return true;
  }
  if (/[{;@<]/.test(trimmed) || trimmed.includes('/*')) {
    return true;
  }
  let paren = 0;
  let bracket = 0;
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (quote) {
      if (ch === '\\' && i + 1 < trimmed.length) {
        i += 1;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '(') {
      paren += 1;
      continue;
    }
    if (ch === ')') {
      if (paren === 0) {
        return true;
      }
      paren -= 1;
      continue;
    }
    if (ch === '[') {
      bracket += 1;
      continue;
    }
    if (ch === ']') {
      if (bracket === 0) {
        return true;
      }
      bracket -= 1;
    }
  }
  return paren !== 0 || bracket !== 0 || quote !== null;
}

export function isValidCosmeticSelector(selector: string): boolean {
  const trimmed = selector.trim();
  if (!trimmed) {
    return false;
  }
  if (hasUnsafeSelectorSyntax(trimmed)) {
    return false;
  }

  if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
    try {
      document.querySelector(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  if (typeof CSSStyleSheet !== 'undefined') {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(`html ${trimmed}{display:none!important;}`);
      return true;
    } catch {
      return false;
    }
  }

  return true;
}

export function cssRuleParses(css: string): boolean {
  if (typeof CSSStyleSheet !== 'undefined') {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}
