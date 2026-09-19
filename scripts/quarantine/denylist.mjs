/** Shared denylist for quarantine / AI output — hostname rules only. */

const BANNED_SELECTOR_PATTERNS = [
  /^\.banner\b/i,
  /^\.modal\b/i,
  /\[class\*=["']modal/i,
  /\[class\*=["']css-/i,
  /role\s*=\s*["']dialog["']/i,
  /^div$/i,
  /^header$/i,
  /^main$/i,
  /^body$/i,
];

export function isDeniedQuarantineLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('!')) {
    return false;
  }
  const marker = trimmed.indexOf('##');
  if (marker <= 0) {
    return true;
  }
  const body = trimmed.slice(marker + 2);
  return BANNED_SELECTOR_PATTERNS.some((re) => re.test(body));
}
