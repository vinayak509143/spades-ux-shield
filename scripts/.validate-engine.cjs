"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// scripts/engine-entry.ts
var engine_entry_exports = {};
__export(engine_entry_exports, {
  compileRules: () => compileRules,
  hostBucketToCss: () => hostBucketToCss,
  parseList: () => parseList
});
module.exports = __toCommonJS(engine_entry_exports);

// src/engine/util.ts
var FNV_OFFSET = 2166136261;
var FNV_PRIME = 16777619;
function fnv1a(text) {
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}
function normalizeHost(raw) {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.includes("://")) {
    return null;
  }
  try {
    const url = new URL(`http://${trimmed}`);
    return url.hostname || null;
  } catch {
    return null;
  }
}
function pathGlobToRegExp(glob) {
  let pattern = "^";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === "*") {
      pattern += ".*";
    } else if (ch === "?") {
      pattern += ".";
    } else if (/[.+^${}()|[\]\\]/.test(ch)) {
      pattern += `\\${ch}`;
    } else {
      pattern += ch;
    }
  }
  pattern += ".*";
  return new RegExp(pattern);
}
function parseRegexLiteral(raw) {
  const trimmed = raw.trim();
  if (trimmed.length < 3 || trimmed[0] !== "/") {
    return null;
  }
  let end = trimmed.lastIndexOf("/");
  if (end <= 0) {
    return null;
  }
  const body = trimmed.slice(1, end);
  const flags = trimmed.slice(end + 1);
  try {
    return new RegExp(body, flags);
  } catch {
    return null;
  }
}
function unquoteArg(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') || trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
function parseArgValue(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("/")) {
    const re = parseRegexLiteral(trimmed);
    if (re) {
      return re;
    }
  }
  return unquoteArg(trimmed);
}
function isBareHasTextSubject(selector) {
  const base = selector.trim().toLowerCase();
  return base === "div" || base === "span" || base === "p" || base === "*";
}

// src/engine/parser.ts
var ACTION_OPS = /* @__PURE__ */ new Set([
  "uncheck",
  "click-dismiss",
  "remove-attr",
  "remove-class",
  "remove",
  "style",
  "unlock-scroll"
]);
var PROCEDURAL_OPS = /* @__PURE__ */ new Set([
  "has-text",
  "contains",
  "matches-path",
  "matches-attr",
  "matches-css",
  "upward",
  "watch-attr",
  "min-text-length"
]);
var BANNED_LINE_PATTERNS = [
  { test: /##\^/, message: "HTML filters (##^) are not supported" },
  { test: /#\$#/, message: "Snippet filters (#$#) are not supported" },
  { test: /\+js\s*\(/, message: "Scriptlets (+js) are not supported" }
];
function isEscaped(source, index) {
  let slashes = 0;
  for (let i = index - 1; i >= 0 && source[i] === "\\"; i--) {
    slashes++;
  }
  return slashes % 2 === 1;
}
function findMarker(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith("#@#")) {
    const dbl = trimmed.indexOf("##", 3);
    if (dbl !== -1) {
      return {
        kind: "exception",
        domainsRaw: trimmed.slice(3, dbl).trim(),
        body: trimmed.slice(dbl + 2).trim()
      };
    }
  }
  let inQuote = null;
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
    if (ch === "(") {
      paren++;
      continue;
    }
    if (ch === ")") {
      paren = Math.max(0, paren - 1);
      continue;
    }
    if (ch === "[") {
      bracket++;
      continue;
    }
    if (ch === "]") {
      bracket = Math.max(0, bracket - 1);
      continue;
    }
    if (paren === 0 && bracket === 0) {
      if (line.startsWith("#@#", i)) {
        return {
          kind: "exception",
          domainsRaw: line.slice(0, i).trim(),
          body: line.slice(i + 3).trim()
        };
      }
      if (line.startsWith("##", i)) {
        return {
          kind: "cosmetic",
          domainsRaw: line.slice(0, i).trim(),
          body: line.slice(i + 2).trim()
        };
      }
      if (line.startsWith("#?#", i)) {
        return {
          kind: "cosmetic",
          domainsRaw: line.slice(0, i).trim(),
          body: line.slice(i + 3).trim()
        };
      }
    }
  }
  return null;
}
function extractParenContent(source, openIndex) {
  if (source[openIndex] !== "(") {
    return null;
  }
  let depth = 0;
  let inQuote = null;
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
    if (ch === "(") {
      depth++;
      continue;
    }
    if (ch === ")") {
      depth--;
      if (depth === 0) {
        return { content: source.slice(openIndex + 1, i), end: i + 1 };
      }
    }
  }
  return null;
}
function scanOperators(body) {
  const ops = [];
  let paren = 0;
  let bracket = 0;
  let inQuote = null;
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
    if (ch === "(") {
      paren++;
      continue;
    }
    if (ch === ")") {
      paren = Math.max(0, paren - 1);
      continue;
    }
    if (ch === "[") {
      bracket++;
      continue;
    }
    if (ch === "]") {
      bracket = Math.max(0, bracket - 1);
      continue;
    }
    if (ch !== ":" || paren > 0 || bracket > 0) {
      continue;
    }
    const rest = body.slice(i + 1);
    const match = rest.match(/^([a-zA-Z][\w-]*)/);
    if (!match) {
      continue;
    }
    const name = match[1];
    const nameEnd = i + 1 + name.length;
    let arg = null;
    let end = nameEnd;
    if (body[nameEnd] === "(") {
      const extracted = extractParenContent(body, nameEnd);
      if (!extracted) {
        continue;
      }
      arg = extracted.content;
      end = extracted.end;
    }
    const isKnown = PROCEDURAL_OPS.has(name) || ACTION_OPS.has(name) || name === "xpath" || name === "others";
    if (!isKnown) {
      continue;
    }
    ops.push({ name, arg, start: i });
    i = end - 1;
  }
  return ops;
}
function parseProcOp(name, arg) {
  const opName = name === "contains" ? "has-text" : name;
  switch (opName) {
    case "has-text":
      if (arg === null) {
        return null;
      }
      return { type: "has-text", needle: parseArgValue(arg) };
    case "matches-path":
      if (arg === null) {
        return null;
      }
      return { type: "matches-path", pattern: parseArgValue(arg) };
    case "matches-attr": {
      if (arg === null) {
        return null;
      }
      const trimmed = arg.trim();
      const eq = trimmed.indexOf("=");
      if (eq === -1) {
        return { type: "matches-attr", name: unquoteArg(trimmed) };
      }
      const namePart = unquoteArg(trimmed.slice(0, eq).trim());
      const valuePart = trimmed.slice(eq + 1).trim();
      return {
        type: "matches-attr",
        name: namePart,
        value: parseArgValue(valuePart)
      };
    }
    case "matches-css": {
      if (arg === null) {
        return null;
      }
      const colon = arg.indexOf(":");
      if (colon === -1) {
        return null;
      }
      const property = arg.slice(0, colon).trim();
      const valueRaw = arg.slice(colon + 1).trim();
      return { type: "matches-css", property, value: parseArgValue(valueRaw) };
    }
    case "upward": {
      if (arg === null || arg.trim() === "") {
        return null;
      }
      const trimmed = unquoteArg(arg.trim());
      const asNum = Number(trimmed);
      if (Number.isInteger(asNum) && asNum > 0) {
        return { type: "upward", steps: asNum };
      }
      return { type: "upward", steps: trimmed };
    }
    case "watch-attr": {
      if (arg === null || arg.trim() === "") {
        return { type: "watch-attr", names: [] };
      }
      const names = arg.split(",").map((part) => unquoteArg(part.trim())).filter(Boolean);
      return { type: "watch-attr", names };
    }
    case "min-text-length": {
      if (arg === null) {
        return null;
      }
      const n = Number(unquoteArg(arg.trim()));
      if (!Number.isFinite(n) || n < 0) {
        return null;
      }
      return { type: "min-text-length", length: Math.floor(n) };
    }
    default:
      return null;
  }
}
function parseAction(name, arg) {
  switch (name) {
    case "uncheck":
      return { type: "uncheck" };
    case "click-dismiss":
      return { type: "click-dismiss" };
    case "unlock-scroll":
      return { type: "unlock-scroll" };
    case "remove":
      return { type: "remove" };
    case "remove-attr":
      if (arg === null) {
        return null;
      }
      return { type: "remove-attr", pattern: parseArgValue(arg) };
    case "remove-class":
      if (arg === null) {
        return null;
      }
      return { type: "remove-class", pattern: parseArgValue(arg) };
    case "style":
      if (arg === null) {
        return null;
      }
      return { type: "style", decls: parseStyleDecls(arg) };
    default:
      return null;
  }
}
function parseStyleDecls(raw) {
  const decls = [];
  for (const part of raw.split(";")) {
    const piece = part.trim();
    if (!piece) {
      continue;
    }
    const colon = piece.indexOf(":");
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
function parseDomains(domainsRaw) {
  const hosts = [];
  let entity = false;
  let pathRe = null;
  const parts = domainsRaw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { line: 0, message: "Missing domain", source: domainsRaw };
  }
  for (const part of parts) {
    let hostPart = part;
    let pathPart = null;
    const slash = part.indexOf("/");
    if (slash !== -1) {
      hostPart = part.slice(0, slash);
      pathPart = part.slice(slash);
    }
    if (hostPart.endsWith(".*")) {
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
function combinePathRes(a, b) {
  return new RegExp(`${a.source}|${b.source}`, a.flags.includes("i") || b.flags.includes("i") ? "i" : "");
}
function parseBody(body) {
  const ops = scanOperators(body);
  if (ops.some((op) => op.name === "xpath" || op.name === "others")) {
    return {
      selector: "",
      procedural: [],
      action: { type: "hide" },
      error: "Unsupported procedural operator"
    };
  }
  let action = { type: "hide" };
  const procedural = [];
  let actionIndex = -1;
  for (let i = ops.length - 1; i >= 0; i--) {
    if (ACTION_OPS.has(ops[i].name)) {
      const parsed = parseAction(ops[i].name, ops[i].arg);
      if (!parsed) {
        return {
          selector: "",
          procedural: [],
          action: { type: "hide" },
          error: `Invalid action :${ops[i].name}`
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
        selector: "",
        procedural: [],
        action: { type: "hide" },
        error: `Invalid operator :${op.name}`
      };
    }
    procedural.push(parsed);
  }
  const cut = procOps.length > 0 ? procOps[0].start : actionIndex !== -1 ? ops[actionIndex].start : body.length;
  const selector = body.slice(0, cut).trim();
  if (action.type === "hide" && procedural.length === 0 && !selector) {
    return {
      selector: "",
      procedural: [],
      action: { type: "hide" },
      error: "Missing selector"
    };
  }
  return { selector, procedural, action };
}
function parseDirective(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("!")) {
    return null;
  }
  const rest = trimmed.slice(1).trim();
  const colon = rest.indexOf(":");
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
function parseLine(line, lineNumber) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("!")) {
    return {};
  }
  for (const banned of BANNED_LINE_PATTERNS) {
    if (banned.test.test(trimmed)) {
      return {
        error: { line: lineNumber, message: banned.message, source: trimmed }
      };
    }
  }
  const marker = findMarker(trimmed);
  if (!marker) {
    return {
      error: { line: lineNumber, message: "Missing cosmetic marker (##, #@#, or #?#)", source: trimmed }
    };
  }
  if (!marker.body) {
    return {
      error: { line: lineNumber, message: "Empty rule body", source: trimmed }
    };
  }
  const domainParsed = parseDomains(marker.domainsRaw);
  if ("message" in domainParsed) {
    return {
      error: { line: lineNumber, message: domainParsed.message, source: trimmed }
    };
  }
  const bodyParsed = parseBody(marker.body);
  if (bodyParsed.error) {
    return {
      error: { line: lineNumber, message: bodyParsed.error, source: trimmed }
    };
  }
  let pathRe = domainParsed.pathRe;
  const pathOps = bodyParsed.procedural.filter((op) => op.type === "matches-path");
  const nonPathProc = bodyParsed.procedural.filter((op) => op.type !== "matches-path");
  if (pathOps.length > 0) {
    const first = pathOps[0];
    if (first.type === "matches-path") {
      const pattern = first.pattern;
      pathRe = pattern instanceof RegExp ? pattern : pathGlobToRegExp(pattern.startsWith("/") ? pattern : `/${pattern}`);
    }
  }
  const rule = {
    kind: marker.kind,
    hosts: domainParsed.hosts,
    entity: domainParsed.entity,
    pathRe,
    selector: bodyParsed.selector,
    procedural: nonPathProc,
    action: bodyParsed.action,
    line: lineNumber,
    id: fnv1a(trimmed),
    source: trimmed
  };
  return { rule };
}
function parseList(source) {
  const rules = [];
  const errors = [];
  const directives = {};
  const lines = source.replace(/\r\n/g, "\n").split("\n");
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

// src/engine/selector-valid.ts
function isValidCosmeticSelector(selector) {
  const trimmed = selector.trim();
  if (!trimmed) {
    return false;
  }
  if (typeof document !== "undefined" && typeof document.querySelector === "function") {
    try {
      document.querySelector(trimmed);
      return true;
    } catch {
      return false;
    }
  }
  if (typeof CSSStyleSheet !== "undefined") {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(`html ${trimmed}{display:none!important;}`);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}
function cssRuleParses(css) {
  if (typeof CSSStyleSheet !== "undefined") {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

// src/engine/compiler.ts
var STYLE_DENY = [
  /url\s*\(/i,
  /expression\s*\(/i,
  /javascript\s*:/i,
  /\\/,
  /\/\*/,
  /-moz-binding/i,
  /behavior\s*:/i
];
function validateRule(rule) {
  if (rule.procedural.some((op) => op.type === "has-text")) {
    if (!rule.selector || isBareHasTextSubject(rule.selector)) {
      return {
        line: rule.line,
        message: ":has-text on bare div/span/p/* is not allowed",
        source: rule.source
      };
    }
  }
  if (rule.source.includes(":xpath") || rule.source.includes(":others")) {
    return {
      line: rule.line,
      message: "Unsupported procedural operator",
      source: rule.source
    };
  }
  if (rule.action.type === "style") {
    for (const [, value] of rule.action.decls) {
      for (const deny of STYLE_DENY) {
        if (deny.test(value)) {
          return {
            line: rule.line,
            message: ":style() contains disallowed value",
            source: rule.source
          };
        }
      }
    }
  }
  return null;
}
function isStaticRule(rule) {
  return rule.procedural.length === 0 && rule.action.type === "hide";
}
function cssSelectorForRule(rule) {
  return rule.selector;
}
function emitHideCss(host, selector) {
  return `html[data-op-h~="${host}"] ${selector}{display:none!important;}`;
}
function bucketForHost(map, host) {
  let bucket = map.get(host);
  if (!bucket) {
    bucket = {
      hideSelectors: [],
      exceptions: [],
      pathCss: [],
      procedural: []
    };
    map.set(host, bucket);
  }
  return bucket;
}
function applyRule(map, rule) {
  const compiled = {
    ruleId: rule.id,
    hosts: rule.hosts,
    entity: rule.entity,
    pathRe: rule.pathRe,
    selector: rule.selector,
    procedural: rule.procedural,
    action: rule.action
  };
  for (const host of rule.hosts) {
    const bucket = bucketForHost(map, host);
    if (rule.kind === "exception") {
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
        css: emitHideCss(host, selector)
      });
    } else {
      bucket.hideSelectors.push(selector);
    }
  }
}
function compileRules(rules) {
  const hostBuckets = /* @__PURE__ */ new Map();
  const errors = [];
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
function filterValidHideSelectors(_host, selectors) {
  return selectors.filter((sel) => isValidCosmeticSelector(sel));
}
function hostBucketToCss(host, bucket) {
  const chunks = [];
  const hide = filterValidHideSelectors(
    host,
    bucket.hideSelectors.filter((sel) => !bucket.exceptions.includes(sel))
  );
  if (hide.length > 0) {
    const joined = hide.join(',\nhtml[data-op-h~="' + host + '"] ');
    const block = `html[data-op-h~="${host}"] ${joined}{display:none!important;}`;
    if (cssRuleParses(block)) {
      chunks.push(block);
    } else {
      for (const sel of hide) {
        const rule = `html[data-op-h~="${host}"] ${sel}{display:none!important;}`;
        if (cssRuleParses(rule) || isValidCosmeticSelector(sel)) {
          chunks.push(rule);
        }
      }
    }
  }
  for (const pathRule of bucket.pathCss) {
    if (cssRuleParses(pathRule.css)) {
      chunks.push(pathRule.css);
    }
  }
  return chunks.join("\n");
}
function buildCssFromBuckets(hostBuckets) {
  const chunks = [];
  for (const [host, bucket] of hostBuckets) {
    chunks.push(hostBucketToCss(host, bucket));
  }
  return chunks.filter(Boolean).join("\n");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  compileRules,
  hostBucketToCss,
  parseList
});
