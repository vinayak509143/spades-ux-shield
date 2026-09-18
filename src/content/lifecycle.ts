import type { CompiledProc } from '../engine/types.js';
import { applyHostMark } from './host-mark.js';
import type { ProceduralEngine } from './dom-mutator.js';

let engine: ProceduralEngine | null = null;
let rules: CompiledProc[] = [];
let pageActive = true;

export function bindEngine(instance: ProceduralEngine, compiled: CompiledProc[]): void {
  engine = instance;
  rules = compiled;
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
  if (engine) {
    engine.start(rules, { pierceShadow: true });
  }
}
