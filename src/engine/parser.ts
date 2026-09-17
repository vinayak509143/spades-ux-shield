import type {
  Action,
  ListDirectives,
  ParseError,
  ParseResult,
  ProcOp,
  Rule,
} from './types.js';
import {
  fnv1a,
  normalizeHost,
  parseArgValue,
  parseRegexLiteral,
  pathGlobToRegExp,
  unquoteArg,
} from './util.js';

const ACTION_OPS = new Set([
  'uncheck',
  'click-dismiss',
  'remove-attr',
  'remove-class',
  'remove',
  'style',
  'unlock-scroll',
]);

const PROCEDURAL_OPS = new Set([
  'has-text',
  'contains',
  'matches-path',
  'matches-attr',
  'matches-css',
  'upward',
  'watch-attr',
  'min-text-length',
]);

const BANNED_LINE_PATTERNS: Array<{ test: RegExp; message: string }> = [
  { test: /##\^/, message: 'HTML filters (##^) are not supported' },
  { test: /#\$#/, message: 'Snippet filters (#$#) are not supported' },
  { test: /\+js\s*\(/, message: 'Scriptlets (+js) are not supported' },
];

interface MarkerSplit {
  kind: 'cosmetic' | 'exception';
  domainsRaw: string;
  body: string;
}

function isEscaped(source: string, index: number): boolean {
  let slashes = 0;
  for (let i = index - 1; i >= 0 && source[i] === '\\'; i--) {
    slashes++;
  }
  return slashes % 2 === 1;
}

function findMarker(line: string): MarkerSplit | null {
  const trimmed = line.trim();
  if (trimmed.startsWith('#@#')) {
    const dbl = trimmed.indexOf('##', 3);
    if (dbl !== -1) {
      return {
        kind: 'exception',
        domainsRaw: trimmed.slice(3, dbl).trim(),
        body: trimmed.slice(dbl + 2).trim(),
      };
    }
  }

  let inQuote: '"' | "'" | null = null;
  let paren = 0;
  let bracket = 0;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === inQuote && !isEscaped(line, i)) {
        inQuote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }
    if (ch === '(') {
      paren++;
      continue;
    }
    if (ch === ')') {
      paren = Math.max(0, paren - 1);
      continue;
    }
    if (ch === '[') {
      bracket++;
      continue;
    }
    if (ch === ']') {
      bracket = Math.max(0, bracket - 1);
      continue;
    }
    if (paren === 0 && bracket === 0) {
      if (line.startsWith('#@#', i)) {
        return {
          kind: 'exception',
          domainsRaw: line.slice(0, i).trim(),
          body: line.slice(i + 3).trim(),
        };
      }
      if (line.startsWith('##', i)) {
        return {
          kind: 'cosmetic',
          domainsRaw: line.slice(0, i).trim(),
          body: line.slice(i + 2).trim(),
        };
      }
      if (line.startsWith('#?#', i)) {
        return {
          kind: 'cosmetic',
          domainsRaw: line.slice(0, i).trim(),
          body: line.slice(i + 3).trim(),
        };
      }
    }
  }
  return null;
}

function extractParenContent(source: string, openIndex: number): { content: string; end: number } | null {
  if (source[openIndex] !== '(') {
    return null;
  }
  let depth = 0;
  let inQuote: '"' | "'" | null = null;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (inQuote) {
      if (ch === inQuote && !isEscaped(source, i)) {
        inQuote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }
    if (ch === '(') {
      depth++;
      continue;
    }
    if (ch === ')') {
      depth--;
      if (depth === 0) {
        return { content: source.slice(openIndex + 1, i), end: i + 1 };
      }
    }
  }
  return null;
}

interface ScannedOp {
  name: string;
  arg: string | null;
  start: number;
}

function scanOperators(body: string): ScannedOp[] {
  const ops: ScannedOp[] = [];
  let paren = 0;
  let bracket = 0;
  let inQuote: '"' | "'" | null = null;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inQuote) {
      if (ch === inQuote && !isEscaped(body, i)) {
        inQuote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }
    if (ch === '(') {
      paren++;
      continue;
    }
    if (ch === ')') {
      paren = Math.max(0, paren - 1);
      continue;
    }
    if (ch === '[') {
      bracket++;
      continue;
    }
    if (ch === ']') {
      bracket = Math.max(0, bracket - 1);
      continue;
    }
    if (ch !== ':' || paren > 0 || bracket > 0) {
      continue;
    }
    const rest = body.slice(i + 1);
    const match = rest.match(/^([a-zA-Z][\w-]*)/);
    if (!match) {
      continue;
    }
    const name = match[1];
    const nameEnd = i + 1 + name.length;
    let arg: string | null = null;
    let end = nameEnd;
    if (body[nameEnd] === '(') {
      const extracted = extractParenContent(body, nameEnd);
      if (!extracted) {
        continue;
      }
      arg = extracted.content;
      end = extracted.end;
    }
    const isKnown =
      PROCEDURAL_OPS.has(name) || ACTION_OPS.has(name) || name === 'xpath' || name === 'others';
    if (!isKnown) {
      continue;
    }
    ops.push({ name, arg, start: i });
    i = end - 1;
  }
  return ops;
}

function parseProcOp(name: string, arg: string | null): ProcOp | null {
  const opName = name === 'contains' ? 'has-text' : name;
  switch (opName) {
    case 'has-text':
      if (arg === null) {
        return null;
      }
      return { type: 'has-text', needle: parseArgValue(arg) };
    case 'matches-path':
      if (arg === null) {
        return null;
      }
      return { type: 'matches-path', pattern: parseArgValue(arg) };
    case 'matches-attr': {
      if (arg === null) {
        return null;
      }
      const trimmed = arg.trim();
      const eq = trimmed.indexOf('=');
      if (eq === -1) {
        return { type: 'matches-attr', name: unquoteArg(trimmed) };
      }
      const namePart = unquoteArg(trimmed.slice(0, eq).trim());
      const valuePart = trimmed.slice(eq + 1).trim();
      return {
        type: 'matches-attr',
        name: namePart,
        value: parseArgValue(valuePart),
      };
    }
    case 'matches-css': {
      if (arg === null) {
        return null;
      }
      const colon = arg.indexOf(':');
      if (colon === -1) {
        return null;
      }
      const property = arg.slice(0, colon).trim();
      const valueRaw = arg.slice(colon + 1).trim();
      return { type: 'matches-css', property, value: parseArgValue(valueRaw) };
    }
    case 'upward': {
      if (arg === null || arg.trim() === '') {
        return null;
      }
      const trimmed = unquoteArg(arg.trim());
      const asNum = Number(trimmed);
      if (Number.isInteger(asNum) && asNum > 0) {
        return { type: 'upward', steps: asNum };
      }
      return { type: 'upward', steps: trimmed };
    }
    case 'watch-attr': {
      if (arg === null || arg.trim() === '') {
        return { type: 'watch-attr', names: [] };
      }
      const names = arg
        .split(',')
        .map((part) => unquoteArg(part.trim()))
        .filter(Boolean);
      return { type: 'watch-attr', names };
    }
    case 'min-text-length': {
      if (arg === null) {
        return null;
      }
      const n = Number(unquoteArg(arg.trim()));
      if (!Number.isFinite(n) || n < 0) {
        return null;
      }
      return { type: 'min-text-length', length: Math.floor(n) };
    }
    default:
      return null;
  }
}

function parseAction(name: string, arg: string | null): Action | null {
  switch (name) {
    case 'uncheck':
      return { type: 'uncheck' };
    case 'click-dismiss':
      return { type: 'click-dismiss' };
    case 'unlock-scroll':
      return { type: 'unlock-scroll' };
    case 'remove':
      return { type: 'remove' };
    case 'remove-attr':
      if (arg === null) {
        return null;
      }
      return { type: 'remove-attr', pattern: parseArgValue(arg) };
    case 'remove-class':
      if (arg === null) {
        return null;
      }
      return { type: 'remove-class', pattern: parseArgValue(arg) };
    case 'style':
      if (arg === null) {
        return null;
      }
      return { type: 'style', decls: parseStyleDecls(arg) };
    default:
      return null;
  }
}

function parseStyleDecls(raw: string): Array<[string, string]> {
  const decls: Array<[string, string]> = [];
  for (const part of raw.split(';')) {
    const piece = part.trim();
    if (!piece) {
      continue;
    }
    const colon = piece.indexOf(':');
    if (colon === -1) {
      continue;
    }
    const prop = piece.slice(0, colon).trim();
    const value = piece.slice(colon + 1).trim();
    if (prop) {
      decls.push([prop, value]);
    }
  }
  return decls;
}

function parseDomains(
  domainsRaw: string,
): { hosts: string[]; entity: boolean; pathRe: RegExp | null } | ParseError {
  const hosts: string[] = [];
  let entity = false;
  let pathRe: RegExp | null = null;

  const parts = domainsRaw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { line: 0, message: 'Missing domain', source: domainsRaw };
  }

  for (const part of parts) {
    let hostPart = part;
    let pathPart: string | null = null;
    const slash = part.indexOf('/');
    if (slash !== -1) {
      hostPart = part.slice(0, slash);
      pathPart = part.slice(slash);
    }

    if (hostPart.endsWith('.*')) {
      entity = true;
      hostPart = hostPart.slice(0, -2);
    }

    const normalized = normalizeHost(hostPart);
    if (!normalized) {
      return { line: 0, message: `Invalid host: ${hostPart}`, source: part };
    }
    hosts.push(normalized);

    if (pathPart) {
      const re = pathGlobToRegExp(pathPart);
      pathRe = pathRe ? combinePathRes(pathRe, re) : re;
    }
  }

  return { hosts, entity, pathRe };
}

function combinePathRes(a: RegExp, b: RegExp): RegExp {
  return new RegExp(`${a.source}|${b.source}`, a.flags.includes('i') || b.flags.includes('i') ? 'i' : '');
}

function parseBody(body: string): {
  selector: string;
  procedural: ProcOp[];
  action: Action;
  error?: string;
} {
  const ops = scanOperators(body);
  if (ops.some((op) => op.name === 'xpath' || op.name === 'others')) {
    return {
      selector: '',
      procedural: [],
      action: { type: 'hide' },
      error: 'Unsupported procedural operator',
    };
  }

  let action: Action = { type: 'hide' };
  const procedural: ProcOp[] = [];
  let actionIndex = -1;

  for (let i = ops.length - 1; i >= 0; i--) {
    if (ACTION_OPS.has(ops[i].name)) {
      const parsed = parseAction(ops[i].name, ops[i].arg);
      if (!parsed) {
        return {
          selector: '',
          procedural: [],
          action: { type: 'hide' },
          error: `Invalid action :${ops[i].name}`,
        };
      }
      action = parsed;
      actionIndex = i;
      break;
    }
  }

  const procOps = actionIndex === -1 ? ops : ops.slice(0, actionIndex);
  for (const op of procOps) {
    if (ACTION_OPS.has(op.name)) {
      continue;
    }
    const parsed = parseProcOp(op.name, op.arg);
    if (!parsed) {
      return {
        selector: '',
        procedural: [],
        action: { type: 'hide' },
        error: `Invalid operator :${op.name}`,
      };
    }
    procedural.push(parsed);
  }

  const cut =
    procOps.length > 0 ? procOps[0].start : actionIndex !== -1 ? ops[actionIndex].start : body.length;
  const selector = body.slice(0, cut).trim();

  if (action.type === 'hide' && procedural.length === 0 && !selector) {
    return {
      selector: '',
      procedural: [],
      action: { type: 'hide' },
      error: 'Missing selector',
    };
  }

  return { selector, procedural, action };
}

function parseDirective(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('!')) {
    return null;
  }
  const rest = trimmed.slice(1).trim();
  const colon = rest.indexOf(':');
  if (colon === -1) {
    return null;
  }
  const key = rest.slice(0, colon).trim();
  const value = rest.slice(colon + 1).trim();
  if (!key) {
    return null;
  }
  return { key, value };
}

export function parseLine(line: string, lineNumber: number): { rule?: Rule; error?: ParseError } {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('!')) {
    return {};
  }

  for (const banned of BANNED_LINE_PATTERNS) {
    if (banned.test.test(trimmed)) {
      return {
        error: { line: lineNumber, message: banned.message, source: trimmed },
      };
    }
  }

  const marker = findMarker(trimmed);
  if (!marker) {
    return {
      error: { line: lineNumber, message: 'Missing cosmetic marker (##, #@#, or #?#)', source: trimmed },
    };
  }

  if (!marker.body) {
    return {
      error: { line: lineNumber, message: 'Empty rule body', source: trimmed },
    };
  }

  const domainParsed = parseDomains(marker.domainsRaw);
  if ('message' in domainParsed) {
    return {
      error: { line: lineNumber, message: domainParsed.message, source: trimmed },
    };
  }

  const bodyParsed = parseBody(marker.body);
  if (bodyParsed.error) {
    return {
      error: { line: lineNumber, message: bodyParsed.error, source: trimmed },
    };
  }

  let pathRe = domainParsed.pathRe;
  const pathOps = bodyParsed.procedural.filter((op) => op.type === 'matches-path');
  const nonPathProc = bodyParsed.procedural.filter((op) => op.type !== 'matches-path');
  if (pathOps.length > 0) {
    const first = pathOps[0];
    if (first.type === 'matches-path') {
      const pattern = first.pattern;
      pathRe =
        pattern instanceof RegExp
          ? pattern
          : pathGlobToRegExp(pattern.startsWith('/') ? pattern : `/${pattern}`);
    }
  }

  const rule: Rule = {
    kind: marker.kind,
    hosts: domainParsed.hosts,
    entity: domainParsed.entity,
    pathRe,
    selector: bodyParsed.selector,
    procedural: nonPathProc,
    action: bodyParsed.action,
    line: lineNumber,
    id: fnv1a(trimmed),
    source: trimmed,
  };

  return { rule };
}

export function parseList(source: string): ParseResult {
  const rules: Rule[] = [];
  const errors: ParseError[] = [];
  const directives: ListDirectives = {};

  const lines = source.replace(/\r\n/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    const directive = parseDirective(line);
    if (directive) {
      directives[directive.key] = directive.value;
      continue;
    }
    const result = parseLine(line, lineNumber);
    if (result.error) {
      errors.push(result.error);
    }
    if (result.rule) {
      rules.push(result.rule);
    }
  }

  return { rules, errors, directives };
}

export function parseRegexFromListLiteral(raw: string): RegExp | null {
  return parseRegexLiteral(raw);
}
