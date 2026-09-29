import { isValidCosmeticSelector } from '../engine/selector-valid.js';
import { reviveCompiledProc, type StoredCompiledProc } from '../engine/serialized.js';
import type { CompiledProc } from '../engine/types.js';
import type { PackagedRule } from './packaged-rules.js';

function isStoredRule(value: unknown): value is StoredCompiledProc {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const row = value as StoredCompiledProc;
  return (
    typeof row.ruleId === 'number' &&
    Array.isArray(row.hosts) &&
    typeof row.selector === 'string' &&
    Array.isArray(row.procedural) &&
    row.action !== null &&
    typeof row.action === 'object'
  );
}

/**
 * Synced darklist rules replace packaged darklist rules only when the synced
 * `! Version:` is at least the packaged revision. Fixture and third-party
 * packaged rules always stay. A bad payload leaves the packaged set in place.
 */
export function mergeRuntimeRules(
  packaged: PackagedRule[],
  synced: unknown,
  listVersion: unknown,
  packagedRev: number,
): CompiledProc[] {
  const packagedRules = packaged.map((row) => row.rule);
  const version = typeof listVersion === 'number' && Number.isFinite(listVersion) ? listVersion : 0;
  if (!Array.isArray(synced) || version < packagedRev) {
    return packagedRules;
  }

  const revived: CompiledProc[] = [];
  for (const row of synced) {
    if (!isStoredRule(row) || !isValidCosmeticSelector(row.selector)) {
      continue;
    }
    try {
      revived.push(reviveCompiledProc(row));
    } catch {
      return packagedRules;
    }
  }

  const syncedIds = new Set(revived.map((rule) => rule.ruleId));
  const kept = packaged
    .filter((row) => row.list !== 'darklist' && !syncedIds.has(row.rule.ruleId))
    .map((row) => row.rule);
  const out: CompiledProc[] = [];
  const seen = new Set<number>();
  for (const rule of [...revived, ...kept]) {
    if (seen.has(rule.ruleId)) {
      continue;
    }
    seen.add(rule.ruleId);
    out.push(rule);
  }
  return out;
}
