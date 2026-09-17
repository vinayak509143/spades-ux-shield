import type {
  CompileResult,
  CompiledProc,
  HostBucket,
  ParseError,
  Rule,
} from './types.js';
import { isBareHasTextSubject } from './util.js';
import { DomainIndex } from './domain-index.js';

const STYLE_DENY = [
  /url\s*\(/i,
  /expression\s*\(/i,
  /javascript\s*:/i,
  /\\/,
  /\/\*/,
  /-moz-binding/i,
  /behavior\s*:/i,
];

function validateRule(rule: Rule): ParseError | null {
  if (rule.procedural.some((op) => op.type === 'has-text')) {
    if (!rule.selector || isBareHasTextSubject(rule.selector)) {
      return {
        line: rule.line,
        message: ':has-text on bare div/span/p/* is not allowed',
        source: rule.source,
      };
    }
  }

  if (rule.source.includes(':xpath') || rule.source.includes(':others')) {
    return {
      line: rule.line,
      message: 'Unsupported procedural operator',
      source: rule.source,
    };
  }

  if (rule.action.type === 'style') {
    for (const [, value] of rule.action.decls) {
      for (const deny of STYLE_DENY) {
        if (deny.test(value)) {
          return {
            line: rule.line,
            message: ':style() contains disallowed value',
            source: rule.source,
          };
        }
      }
    }
  }

  return null;
}

function isStaticRule(rule: Rule): boolean {
  return rule.procedural.length === 0 && rule.action.type === 'hide';
}

function cssSelectorForRule(rule: Rule): string {
  return rule.selector;
}

function emitHideCss(host: string, selector: string): string {
  return `html[data-op-h~="${host}"] ${selector}{display:none!important;}`;
}

function bucketForHost(map: Map<string, HostBucket>, host: string): HostBucket {
  let bucket = map.get(host);
  if (!bucket) {
    bucket = {
      hideSelectors: [],
      exceptions: [],
      pathCss: [],
      procedural: [],
    };
    map.set(host, bucket);
  }
  return bucket;
}

function applyRule(map: Map<string, HostBucket>, rule: Rule): void {
  const compiled: CompiledProc = {
    ruleId: rule.id,
    hosts: rule.hosts,
    entity: rule.entity,
    pathRe: rule.pathRe,
    selector: rule.selector,
    procedural: rule.procedural,
    action: rule.action,
  };

  for (const host of rule.hosts) {
    const bucket = bucketForHost(map, host);

    if (rule.kind === 'exception') {
      if (rule.selector) {
        bucket.exceptions.push(rule.selector);
      }
      continue;
    }

    if (!isStaticRule(rule)) {
      bucket.procedural.push(compiled);
      continue;
    }

    const selector = cssSelectorForRule(rule);
    if (!selector) {
      continue;
    }

    if (rule.pathRe) {
      bucket.pathCss.push({
        pathRe: rule.pathRe,
        css: emitHideCss(host, selector),
      });
    } else {
      bucket.hideSelectors.push(selector);
    }
  }
}

export function compileRules(rules: Rule[]): CompileResult {
  const hostBuckets = new Map<string, HostBucket>();
  const errors: ParseError[] = [];

  for (const rule of rules) {
    const validationError = validateRule(rule);
    if (validationError) {
      errors.push(validationError);
      continue;
    }
    applyRule(hostBuckets, rule);
  }

  const genericCss = buildCssFromBuckets(hostBuckets);
  return { genericCss, hostBuckets, errors };
}

export function hostBucketToCss(host: string, bucket: HostBucket): string {
  const chunks: string[] = [];
  const hide = bucket.hideSelectors.filter(
    (sel) => !bucket.exceptions.includes(sel),
  );
  if (hide.length > 0) {
    const joined = hide.join(',\nhtml[data-op-h~="' + host + '"] ');
    chunks.push(`html[data-op-h~="${host}"] ${joined}{display:none!important;}`);
  }
  for (const pathRule of bucket.pathCss) {
    chunks.push(pathRule.css);
  }
  return chunks.join('\n');
}

function buildCssFromBuckets(hostBuckets: Map<string, HostBucket>): string {
  const chunks: string[] = [];
  for (const [host, bucket] of hostBuckets) {
    chunks.push(hostBucketToCss(host, bucket));
  }
  return chunks.filter(Boolean).join('\n');
}

export function compileToDomainIndex(rules: Rule[]): { index: DomainIndex; errors: ParseError[] } {
  const { hostBuckets, errors } = compileRules(rules);
  const index = new DomainIndex();
  for (const [host, bucket] of hostBuckets) {
    index.insert(host, bucket);
  }
  return { index, errors };
}

export function compileListCss(rules: Rule[]): string {
  return compileRules(rules).genericCss;
}
