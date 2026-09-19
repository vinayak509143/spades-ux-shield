/**
 * Drop invalid cosmetic selectors so one bad rule cannot void insertCSS for a host.
 */
export function isValidCosmeticSelector(selector: string): boolean {
  const trimmed = selector.trim();
  if (!trimmed) {
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
