import type { CompiledProc, ProcOp } from '../engine/types.js';
import { hostSuffixes } from '../engine/util.js';

export function pathAndSearch(): string {
  return `${location.pathname}${location.search}`;
}

export function ruleMatchesHost(rule: CompiledProc, hostname: string): boolean {
  const suffixes = new Set(hostSuffixes(hostname));
  return rule.hosts.some((h) => suffixes.has(h.toLowerCase()));
}

export function ruleMatchesPath(rule: CompiledProc, path: string): boolean {
  if (!rule.pathRe) {
    return true;
  }
  return rule.pathRe.test(path);
}

export function filterRulesForPage(
  rules: CompiledProc[],
  hostname: string,
  path: string,
): CompiledProc[] {
  return rules.filter((rule) => ruleMatchesHost(rule, hostname) && ruleMatchesPath(rule, path));
}

function textMatches(needle: string | RegExp, text: string): boolean {
  if (needle instanceof RegExp) {
    return needle.test(text);
  }
  return text.includes(needle);
}

function attrMatches(
  el: Element,
  name: string,
  expected?: string | RegExp,
): boolean {
  if (!el.hasAttribute(name)) {
    return false;
  }
  const value = el.getAttribute(name) ?? '';
  if (expected === undefined) {
    return true;
  }
  if (expected instanceof RegExp) {
    return expected.test(value);
  }
  return value === expected;
}

function cssMatches(el: Element, property: string, expected: string | RegExp): boolean {
  const value = getComputedStyle(el).getPropertyValue(property);
  if (expected instanceof RegExp) {
    return expected.test(value);
  }
  return value.trim() === expected.trim();
}

function resolveUpward(el: Element, steps: number | string): Element {
  if (typeof steps === 'number') {
    let current: Element | null = el;
    for (let i = 0; i < steps && current; i++) {
      current = current.parentElement;
    }
    return current ?? el;
  }
  return el.closest(steps) ?? el;
}

export function elementMatchesProcedural(el: Element, ops: ProcOp[]): boolean {
  let subject = el;
  for (const op of ops) {
    switch (op.type) {
      case 'has-text':
        if (!textMatches(op.needle, subject.textContent ?? '')) {
          return false;
        }
        break;
      case 'matches-attr':
        if (!attrMatches(subject, op.name, op.value)) {
          return false;
        }
        break;
      case 'matches-css':
        if (!cssMatches(subject, op.property, op.value)) {
          return false;
        }
        break;
      case 'min-text-length': {
        const len = (subject.textContent ?? '').length;
        if (len < op.length) {
          return false;
        }
        break;
      }
      case 'upward':
        subject = resolveUpward(subject, op.steps);
        break;
      case 'watch-attr':
        break;
      case 'matches-path':
        break;
      default:
        break;
    }
  }
  return true;
}

export function collectWatchAttributes(rules: CompiledProc[]): string[] {
  const attrs = new Set<string>(['class', 'style', 'open', 'checked', 'hidden', 'aria-hidden']);
  for (const rule of rules) {
    for (const op of rule.procedural) {
      if (op.type === 'watch-attr') {
        for (const name of op.names) {
          attrs.add(name);
        }
      }
    }
  }
  return [...attrs];
}
