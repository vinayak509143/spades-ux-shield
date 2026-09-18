import type { CompiledProc } from '../engine/types.js';
import { applyHostMark } from './host-mark.js';
import type { ProceduralEngine, ProceduralEngineOptions } from './dom-mutator.js';

let engine: ProceduralEngine | null = null;
let rules: CompiledProc[] = [];
let engineOpts: ProceduralEngineOptions | null = null;
let pageActive = true;

export function bindEngine(
  instance: ProceduralEngine,
  compiled: CompiledProc[],
  opts: ProceduralEngineOptions,
): void {
  engine = instance;
  rules = compiled;
  engineOpts = opts;
}

export function isPageActive(): boolean {
  return pageActive;
}

export function setPageActive(active: boolean): void {
  pageActive = active;
  const root = document.documentElement;
  if (!active) {
    root.removeAttribute('data-op-h');
    root.removeAttribute('data-op');
    engine?.stop();
    return;
  }

  applyHostMark();
  if (engine && rules.length > 0 && engineOpts) {
    engine.start(rules, engineOpts);
  }
}
