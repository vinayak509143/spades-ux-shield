import type { Action, CompiledProc, ProcOp } from './types.js';

export interface SerializedRegex {
  source: string;
  flags: string;
}

export interface StoredCompiledProc {
  ruleId: number;
  hosts: string[];
  entity: boolean;
  pathRe: SerializedRegex | null;
  selector: string;
  procedural: StoredProcOp[];
  action: StoredAction;
}

export type StoredProcOp =
  | { type: 'has-text'; needle: string | SerializedRegex }
  | { type: 'matches-path'; pattern: string | SerializedRegex }
  | { type: 'matches-attr'; name: string; value?: string | SerializedRegex }
  | { type: 'matches-css'; property: string; value: string | SerializedRegex }
  | { type: 'upward'; steps: number | string }
  | { type: 'watch-attr'; names: string[] }
  | { type: 'min-text-length'; length: number };

export type StoredAction =
  | { type: 'hide' }
  | { type: 'uncheck' }
  | { type: 'click-dismiss' }
  | { type: 'unlock-scroll' }
  | { type: 'remove' }
  | { type: 'remove-attr'; pattern: string | SerializedRegex }
  | { type: 'remove-class'; pattern: string | SerializedRegex }
  | { type: 'style'; decls: Array<[string, string]> }
  | { type: 'replace-text'; text: string };

function serRegex(re: RegExp): SerializedRegex {
  return { source: re.source, flags: re.flags };
}

function serValue(value: string | RegExp): string | SerializedRegex {
  return value instanceof RegExp ? serRegex(value) : value;
}

export function serializeCompiledProc(rule: CompiledProc): StoredCompiledProc {
  return {
    ruleId: rule.ruleId,
    hosts: [...rule.hosts],
    entity: rule.entity,
    pathRe: rule.pathRe ? serRegex(rule.pathRe) : null,
    selector: rule.selector,
    procedural: rule.procedural.map(serializeProcOp),
    action: serializeAction(rule.action),
  };
}

function serializeProcOp(op: ProcOp): StoredProcOp {
  switch (op.type) {
    case 'has-text':
      return { type: op.type, needle: serValue(op.needle) };
    case 'matches-path':
      return { type: op.type, pattern: serValue(op.pattern) };
    case 'matches-attr':
      return {
        type: op.type,
        name: op.name,
        value: op.value === undefined ? undefined : serValue(op.value),
      };
    case 'matches-css':
      return {
        type: op.type,
        property: op.property,
        value: serValue(op.value),
      };
    default:
      return op;
  }
}

function serializeAction(action: Action): StoredAction {
  switch (action.type) {
    case 'remove-attr':
    case 'remove-class':
      return { ...action, pattern: serValue(action.pattern) };
    default:
      return action;
  }
}

function reviveRegex(value: string | SerializedRegex): RegExp | string {
  if (typeof value === 'string') {
    return value;
  }
  return new RegExp(value.source, value.flags);
}

export function reviveCompiledProc(stored: StoredCompiledProc): CompiledProc {
  return {
    ruleId: stored.ruleId,
    hosts: [...stored.hosts],
    entity: stored.entity,
    pathRe: stored.pathRe ? new RegExp(stored.pathRe.source, stored.pathRe.flags) : null,
    selector: stored.selector,
    procedural: stored.procedural.map(reviveProcOp),
    action: reviveAction(stored.action),
  };
}

function reviveProcOp(op: StoredProcOp): ProcOp {
  switch (op.type) {
    case 'has-text':
      return { type: 'has-text', needle: reviveRegex(op.needle) };
    case 'matches-path':
      return { type: 'matches-path', pattern: reviveRegex(op.pattern) };
    case 'matches-attr':
      return {
        type: 'matches-attr',
        name: op.name,
        value: op.value === undefined ? undefined : reviveRegex(op.value),
      };
    case 'matches-css':
      return {
        type: 'matches-css',
        property: op.property,
        value: reviveRegex(op.value),
      };
    default:
      return op as ProcOp;
  }
}

function reviveAction(action: StoredAction): CompiledProc['action'] {
  switch (action.type) {
    case 'remove-attr':
    case 'remove-class':
      return { ...action, pattern: reviveRegex(action.pattern) };
    default:
      return action;
  }
}
