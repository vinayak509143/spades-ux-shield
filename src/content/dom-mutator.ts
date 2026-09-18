import type { Action, CompiledProc } from '../engine/types.js';
import {
  collectWatchAttributes,
  elementMatchesProcedural,
  filterRulesForPage,
  pathAndSearch,
} from './procedural-match.js';
import { getShadowRoot, queryAll } from './shadow.js';

const MAX_NODES_PER_FRAME = 200;
const UNCHECK_MAX_RETRIES = 3;
const HIDE_CLASS = 'op-hide';
const OVERLAY_ID = 'op-overlay';

const SCROLL_LOCK_CLASSES = new Set([
  'modal-open',
  'no-scroll',
  'overflow-hidden',
  'is-locked',
]);

const PAYMENT_UNCHECK_DENY = /payment|card|cvv|cvc|billing/i;
const DISMISS_LABEL = /close|dismiss|no.?thanks|not now|reject|decline/i;

export interface ProceduralEngineOptions {
  pierceShadow: boolean;
  onRuleApplied?: (ruleId: number) => void;
}

type ActionKind = 'hide' | 'uncheck' | 'click-dismiss' | 'unlock-scroll' | 'other';

export class ProceduralEngine {
  private rules: CompiledProc[] = [];
  private activeRules: CompiledProc[] = [];
  private observer: MutationObserver | null = null;
  private shadowObservers: MutationObserver[] = [];
  private writing = 0;
  private scheduled = false;
  private dirty = false;
  private stopped = false;
  private pierceShadow = true;
  private onRuleApplied?: (ruleId: number) => void;
  private path = pathAndSearch();

  private readonly actedHide = new WeakSet<Element>();
  private readonly actedUncheck = new WeakSet<Element>();
  private readonly actedClick = new WeakSet<Element>();
  private readonly actedUnlock = new WeakSet<Element>();
  private readonly actedOther = new WeakSet<Element>();
  private readonly uncheckAttempts = new WeakMap<Element, number>();
  private readonly clickedSelectors = new Set<string>();
  private readonly observedShadowRoots = new Set<ShadowRoot>();
  private mutationHandler: MutationCallback | null = null;
  private mutationAttrFilter: string[] = [];

  start(rules: CompiledProc[], opts: ProceduralEngineOptions): void {
    this.rules = rules;
    this.pierceShadow = opts.pierceShadow;
    this.onRuleApplied = opts.onRuleApplied;
    this.stopped = false;
    this.rebindRoute(this.path);
    this.attachObserver();
    this.schedule();
  }

  stop(): void {
    this.stopped = true;
    this.disconnectObservers();
  }

  onRoute(path: string): void {
    if (this.stopped) {
      return;
    }
    this.path = path;
    this.clickedSelectors.clear();
    this.rebindRoute(path);
    this.schedule();
  }

  /** Test hook: run one read/write pass synchronously (no rAF). */
  flush(): void {
    if (this.stopped) {
      return;
    }
    const batch = this.collectCandidates();
    this.writeBatch(batch);
  }

  private rebindRoute(path: string): void {
    this.activeRules = filterRulesForPage(this.rules, location.hostname, path);
  }

  private attachObserver(): void {
    this.disconnectObservers();
    const attrFilter = collectWatchAttributes(this.activeRules);
    const handler = (records: MutationRecord[]) => this.onMutations(records);
    this.mutationHandler = handler;
    this.mutationAttrFilter = attrFilter;

    this.observer = new MutationObserver(handler);
    this.observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: attrFilter,
    });

    if (this.pierceShadow) {
      this.observeShadowRoots(document.documentElement);
    }
  }

  private observeShadowRoots(root: ParentNode): void {
    const handler = this.mutationHandler;
    const attrFilter = this.mutationAttrFilter;
    if (!handler || !this.pierceShadow) {
      return;
    }
    const hosts = root.querySelectorAll('*');
    for (const host of hosts) {
      const shadow = getShadowRoot(host);
      if (!shadow || this.observedShadowRoots.has(shadow)) {
        continue;
      }
      this.observedShadowRoots.add(shadow);
      const obs = new MutationObserver(handler);
      obs.observe(shadow, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: attrFilter,
      });
      this.shadowObservers.push(obs);
    }
  }

  private observeShadowForAddedNodes(nodes: NodeList): void {
    for (const node of nodes) {
      if (!(node instanceof Element)) {
        continue;
      }
      this.observeShadowRoots(node);
    }
  }

  private disconnectObservers(): void {
    this.observer?.disconnect();
    this.observer = null;
    for (const obs of this.shadowObservers) {
      obs.disconnect();
    }
    this.shadowObservers = [];
    this.observedShadowRoots.clear();
  }

  private onMutations(records: MutationRecord[]): void {
    if (this.writing > 0 || this.stopped) {
      return;
    }
    for (const record of records) {
      if (record.type === 'childList' && record.addedNodes.length > 0) {
        this.observeShadowForAddedNodes(record.addedNodes);
      }
      const target = record.target;
      if (target instanceof Element) {
        if (target.id === OVERLAY_ID) {
          continue;
        }
        if (target === document.documentElement && record.type === 'attributes') {
          const name = record.attributeName;
          if (name === 'data-op-h' || name === 'data-op') {
            continue;
          }
        }
      }
      this.dirty = true;
    }
    if (this.dirty) {
      this.schedule();
    }
  }

  private schedule(): void {
    if (this.scheduled || this.stopped) {
      return;
    }
    this.scheduled = true;
    const run = (): void => {
      this.scheduled = false;
      this.pass();
    };
    const sched = (globalThis as { scheduler?: { postTask: (fn: () => void, opts: { priority: string }) => void } })
      .scheduler;
    if (sched?.postTask) {
      sched.postTask(run, { priority: 'background' });
      return;
    }
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 200 });
      return;
    }
    requestAnimationFrame(run);
  }

  private pass(): void {
    if (this.stopped) {
      return;
    }
    this.dirty = false;
    const candidates = this.collectCandidates();
    requestAnimationFrame(() => this.writeBatch(candidates));
  }

  private collectCandidates(): Array<{ el: Element; rule: CompiledProc }> {
    const out: Array<{ el: Element; rule: CompiledProc }> = [];
    const seen = new Set<Element>();

    for (const rule of this.activeRules) {
      if (!rule.selector) {
        continue;
      }
      const nodes = queryAll(rule.selector, document, this.pierceShadow);
      for (const el of nodes) {
        if (seen.has(el) || out.length >= MAX_NODES_PER_FRAME) {
          continue;
        }
        if (!elementMatchesProcedural(el, rule.procedural)) {
          continue;
        }
        seen.add(el);
        out.push({ el, rule });
      }
    }
    return out;
  }

  private writeBatch(batch: Array<{ el: Element; rule: CompiledProc }>): void {
    if (this.stopped || batch.length === 0) {
      return;
    }
    this.disconnectObservers();
    this.writing++;
    try {
      for (const { el, rule } of batch.slice(0, MAX_NODES_PER_FRAME)) {
        const applied = this.exec(el, rule.action, rule);
        if (applied) {
          this.onRuleApplied?.(rule.ruleId);
        }
      }
    } finally {
      this.writing--;
      this.observer?.takeRecords();
      for (const obs of this.shadowObservers) {
        obs.takeRecords();
      }
      this.attachObserver();
    }
  }

  private actedSetFor(action: Action): WeakSet<Element> {
    switch (action.type) {
      case 'hide':
        return this.actedHide;
      case 'uncheck':
        return this.actedUncheck;
      case 'click-dismiss':
        return this.actedClick;
      case 'unlock-scroll':
        return this.actedUnlock;
      default:
        return this.actedOther;
    }
  }

  private isEffectivelyHidden(el: Element): boolean {
    const style = getComputedStyle(el);
    return style.display === 'none' || style.visibility === 'hidden';
  }

  private exec(el: Element, action: Action, rule: CompiledProc): boolean {
    const acted = this.actedSetFor(action);
    if (acted.has(el)) {
      if (action.type === 'hide' && !this.isEffectivelyHidden(el)) {
        this.hide(el);
        return true;
      }
      return false;
    }

    switch (action.type) {
      case 'hide':
        this.hide(el);
        acted.add(el);
        return true;
      case 'uncheck':
        if (this.uncheck(el)) {
          acted.add(el);
          return true;
        }
        return false;
      case 'click-dismiss':
        if (this.clickDismiss(el, rule)) {
          acted.add(el);
          return true;
        }
        return false;
      case 'unlock-scroll':
        if (this.unlockScroll(el)) {
          acted.add(el);
          return true;
        }
        return false;
      case 'remove-attr':
        this.removeMatchingAttrs(el, action.pattern);
        acted.add(el);
        return true;
      case 'remove-class':
        this.removeMatchingClasses(el, action.pattern);
        acted.add(el);
        return true;
      case 'remove':
        if (this.canRemove(el)) {
          el.remove();
          acted.add(el);
          return true;
        }
        return false;
      case 'style':
        for (const [prop, value] of action.decls) {
          (el as HTMLElement).style.setProperty(prop, value);
        }
        acted.add(el);
        return true;
      default:
        return false;
    }
  }

  private hide(el: Element): void {
    el.classList.add(HIDE_CLASS);
    (el as HTMLElement).style.setProperty('display', 'none', 'important');
  }

  private uncheck(el: Element): boolean {
    if (!(el instanceof HTMLInputElement) || (el.type !== 'checkbox' && el.type !== 'radio')) {
      return false;
    }
    const name = el.name ?? '';
    if (PAYMENT_UNCHECK_DENY.test(name)) {
      return false;
    }
    const attempts = this.uncheckAttempts.get(el) ?? 0;
    if (attempts >= UNCHECK_MAX_RETRIES) {
      return true;
    }
    this.uncheckAttempts.set(el, attempts + 1);

    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
    desc?.set?.call(el, false);
    el.removeAttribute('checked');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    if (!el.checked || attempts + 1 >= UNCHECK_MAX_RETRIES) {
      return true;
    }
    return false;
  }

  private clickDismiss(el: Element, rule: CompiledProc): boolean {
    const key = `${rule.ruleId}:${rule.selector}`;
    if (this.clickedSelectors.has(key)) {
      return false;
    }
    if (!this.isDismissTarget(el)) {
      return false;
    }
    if (!this.passesDismissSafety(el)) {
      return false;
    }
    this.clickedSelectors.add(key);
    (el as HTMLElement).click();
    return true;
  }

  private isDismissTarget(el: Element): boolean {
    const tag = el.tagName.toLowerCase();
    if (tag === 'button' || tag === 'a' || el.getAttribute('role') === 'button') {
      return true;
    }
    const label = `${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`;
    return DISMISS_LABEL.test(label);
  }

  private passesDismissSafety(el: Element): boolean {
    if (el instanceof HTMLButtonElement && el.type === 'submit') {
      return false;
    }
    if (el instanceof HTMLAnchorElement && el.href.includes('checkout')) {
      return false;
    }
    const inForm = el.closest('form');
    const inDialog = el.closest('[role="dialog"],[aria-modal="true"]');
    if (inForm && !inDialog) {
      return false;
    }
    if (!this.isFixedOrDialog(el)) {
      return false;
    }
    return true;
  }

  private isFixedOrDialog(el: Element): boolean {
    if (el.closest('[role="dialog"],[aria-modal="true"]')) {
      return true;
    }
    let node: Element | null = el;
    for (let i = 0; i < 8 && node; i++) {
      const style = getComputedStyle(node);
      if (style.position === 'fixed' || style.position === 'sticky') {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  private unlockScroll(el: Element): boolean {
    const tag = el.tagName.toLowerCase();
    if (tag !== 'html' && tag !== 'body') {
      return false;
    }
    const html = document.documentElement;
    const body = document.body;
    for (const target of [html, body]) {
      target.style.overflow = 'auto';
      for (const cls of SCROLL_LOCK_CLASSES) {
        target.classList.remove(cls);
      }
    }
    return true;
  }

  private removeMatchingAttrs(el: Element, pattern: string | RegExp): void {
    for (const attr of [...el.attributes]) {
      const name = attr.name;
      const match =
        pattern instanceof RegExp ? pattern.test(name) : name === pattern;
      if (match) {
        el.removeAttribute(name);
      }
    }
  }

  private removeMatchingClasses(el: Element, pattern: string | RegExp): void {
    for (const cls of [...el.classList]) {
      const match = pattern instanceof RegExp ? pattern.test(cls) : cls === pattern;
      if (match) {
        el.classList.remove(cls);
      }
    }
  }

  private canRemove(el: Element): boolean {
    const tag = el.tagName.toLowerCase();
    if (tag === 'html' || tag === 'body' || tag === 'form') {
      return false;
    }
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      return false;
    }
    if (el instanceof HTMLButtonElement && el.type === 'submit') {
      return false;
    }
    return true;
  }
}

export function startProceduralEngineWhenIdle(
  rules: CompiledProc[],
  opts: ProceduralEngineOptions,
): ProceduralEngine {
  const engine = new ProceduralEngine();
  const run = (): void => {
    engine.start(rules, opts);
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 200 });
  } else {
    requestAnimationFrame(run);
  }
  return engine;
}
