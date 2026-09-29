// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { serializeCompiledProc } from '../../src/engine/serialized.js';
import type { CompiledProc } from '../../src/engine/types.js';
import type { PackagedRule } from '../../src/content/packaged-rules.js';
import { mergeRuntimeRules } from '../../src/content/runtime-rules.js';

function rule(ruleId: number, selector = '.nag'): CompiledProc {
  return {
    ruleId,
    hosts: ['www.example.com'],
    entity: false,
    pathRe: null,
    selector,
    procedural: [{ type: 'has-text', needle: /only/i }],
    action: { type: 'hide' },
  };
}

function packaged(ruleId: number, list: PackagedRule['list'], selector = '.nag'): PackagedRule {
  return { list, rule: rule(ruleId, selector) };
}

describe('mergeRuntimeRules', () => {
  const rev = 202609290215;

  it('replaces darklist rules when the synced list is newer and keeps other lists', () => {
    const rows = [
      packaged(1, 'darklist', '.old'),
      packaged(2, 'e2e-fixture', '.fixture'),
      packaged(3, 'third-party', '.vendor'),
    ];
    const synced = [serializeCompiledProc(rule(9, '.new'))];
    const merged = mergeRuntimeRules(rows, synced, rev + 1, rev);
    expect(merged.map((item) => item.ruleId).sort((a, b) => a - b)).toEqual([2, 3, 9]);
  });

  it('keeps packaged rules when the synced version equals the packaged revision and the payload matches', () => {
    const rows = [packaged(1, 'darklist'), packaged(2, 'e2e-fixture', '.fixture')];
    const synced = [serializeCompiledProc(rule(1))];
    const merged = mergeRuntimeRules(rows, synced, rev, rev);
    expect(merged.map((item) => item.ruleId).sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it('ignores an older synced list', () => {
    const rows = [packaged(1, 'darklist')];
    const synced = [serializeCompiledProc(rule(9, '.new'))];
    const merged = mergeRuntimeRules(rows, synced, rev - 1, rev);
    expect(merged.map((item) => item.ruleId)).toEqual([1]);
  });

  it('ignores a malformed payload', () => {
    const rows = [packaged(1, 'darklist')];
    const broken = [{ ruleId: 4, hosts: ['www.example.com'], selector: '.x', procedural: [{ type: 'has-text', needle: { source: '(', flags: '' } }], action: { type: 'hide' }, entity: false, pathRe: null }];
    expect(mergeRuntimeRules(rows, broken, rev + 1, rev).map((item) => item.ruleId)).toEqual([1]);
    expect(mergeRuntimeRules(rows, { nope: true }, rev + 1, rev).map((item) => item.ruleId)).toEqual([1]);
  });

  it('drops a synced rule whose selector is invalid', () => {
    const rows = [packaged(2, 'e2e-fixture', '.fixture')];
    const synced = [serializeCompiledProc(rule(9, 'div['))];
    const merged = mergeRuntimeRules(rows, synced, rev + 1, rev);
    expect(merged.map((item) => item.ruleId)).toEqual([2]);
  });
});
