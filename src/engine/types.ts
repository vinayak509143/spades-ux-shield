export type ListDirectives = Record<string, string>;

export type Action =
  | { type: 'hide' }
  | { type: 'uncheck' }
  | { type: 'click-dismiss' }
  | { type: 'unlock-scroll' }
  | { type: 'remove' }
  | { type: 'remove-attr'; pattern: string | RegExp }
  | { type: 'remove-class'; pattern: string | RegExp }
  | { type: 'style'; decls: Array<[prop: string, value: string]> };

export type ProcOp =
  | { type: 'has-text'; needle: string | RegExp }
  | { type: 'matches-path'; pattern: string | RegExp }
  | { type: 'matches-attr'; name: string; value?: string | RegExp }
  | { type: 'matches-css'; property: string; value: string | RegExp }
  | { type: 'upward'; steps: number | string }
  | { type: 'watch-attr'; names: string[] }
  | { type: 'min-text-length'; length: number };

export interface Rule {
  kind: 'cosmetic' | 'exception';
  hosts: string[];
  entity: boolean;
  pathRe: RegExp | null;
  selector: string;
  procedural: ProcOp[];
  action: Action;
  line: number;
  id: number;
  source: string;
}

export interface ParseError {
  line: number;
  message: string;
  source: string;
}

export interface ParseResult {
  rules: Rule[];
  errors: ParseError[];
  directives: ListDirectives;
}

export interface CompiledProc {
  ruleId: number;
  hosts: string[];
  entity: boolean;
  pathRe: RegExp | null;
  selector: string;
  procedural: ProcOp[];
  action: Action;
}

export interface HostBucket {
  hideSelectors: string[];
  exceptions: string[];
  pathCss: Array<{ pathRe: RegExp; css: string }>;
  procedural: CompiledProc[];
}

export interface CompileResult {
  genericCss: string;
  hostBuckets: Map<string, HostBucket>;
  errors: ParseError[];
}
