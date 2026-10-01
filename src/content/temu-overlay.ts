/**
 * Temu-only overlay guard.
 *
 * Hashed class names rotate, so this does not key off those hashes.
 * It hides gamification containers (spin, lucky draw, claim, hurry, countdown)
 * and short full-screen overlays that sit on top of the product.
 * Login, payment, the product zoom, and Add to cart / Buy now / Checkout stay.
 */

const HOST = 'www.temu.com';
const HIDE_CLASS = 'op-temu-overlay';
const SCROLL_CLASS = 'op-temu-scroll';
const STYLE_ID = 'op-temu-overlay-style';
const MAX_TEXT = 800;
const CHIP_TEXT = 180;

const GAMIFY_ATTR = /timer|countdown|wheel|spin|lucky|claim|hurry/i;
const STRUCT_ATTR = /popup|dialog/i;
const PAYMENT_SRC = /payment|paypal|stripe|captcha|recaptcha|accounts\.google|adyen|checkout\.com/i;
const GAMIFY_TEXT =
  /^\s*(?:spin(?:\s*(?:to|&|the))?.*|lucky\s+(?:draw|gift|wheel|spin).*|claim(?:\s+\w+){0,4}!?|hurry\b.*|countdown\b.*|ends\s+in\b.*|limited\s+time.*)\s*$/i;
const CHECKOUT_TEXT = /^\s*(?:add to cart|buy now|checkout|check out)\s*!?\s*$/i;

export interface OverlayFacts {
  tag: string;
  id: string;
  className: string;
  role: string | null;
  ariaModal: string | null;
  title: string | null;
  src: string | null;
  text: string;
  textLength: number;
  position: string;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  hasPassword: boolean;
  hasPaymentFrame: boolean;
  hasProductZoom: boolean;
  hasCheckoutControl: boolean;
}

export function shouldSuppressTemuOverlay(facts: OverlayFacts): boolean {
  if (facts.tag === 'html' || facts.tag === 'body') {
    return false;
  }
  if (facts.hasPassword || facts.hasPaymentFrame) {
    return false;
  }
  if (facts.src && PAYMENT_SRC.test(facts.src)) {
    return false;
  }
  if (facts.textLength > MAX_TEXT) {
    return false;
  }

  const attr = `${facts.id} ${facts.className} ${facts.title ?? ''}`;
  const gamifyAttr = GAMIFY_ATTR.test(attr);
  const structAttr = STRUCT_ATTR.test(attr);
  const gamifyText = facts.textLength > 0 && facts.textLength <= CHIP_TEXT && GAMIFY_TEXT.test(facts.text);
  const modal = facts.role === 'dialog' || facts.ariaModal === 'true';
  const layer = facts.position === 'fixed' || facts.position === 'sticky' || facts.position === 'absolute';
  const covers = coversViewport(facts);
  const container = facts.tag === 'div' || facts.tag === 'iframe' || modal;
  if (!container) {
    return false;
  }

  if (facts.hasProductZoom && !gamifyAttr && !gamifyText) {
    return false;
  }
  // A purchase control stays, even when the same box also looks like a game or a dialog.
  if (facts.hasCheckoutControl) {
    return false;
  }

  if (facts.tag === 'iframe') {
    return gamifyAttr || structAttr || gamifyText;
  }
  if (gamifyAttr || gamifyText) {
    return true;
  }
  if (structAttr && (modal || (layer && covers))) {
    return true;
  }
  if ((modal || (layer && covers)) && facts.textLength <= 400) {
    return true;
  }
  return false;
}

function coversViewport(facts: OverlayFacts): boolean {
  if (facts.viewportWidth <= 0 || facts.viewportHeight <= 0) {
    return false;
  }
  return facts.width >= facts.viewportWidth * 0.5 && facts.height >= facts.viewportHeight * 0.35;
}

function factsFrom(el: HTMLElement, viewport: { width: number; height: number }): OverlayFacts {
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const raw = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const img = el.querySelector('img');
  const imgRect = img?.getBoundingClientRect();
  const imgWidth = imgRect && imgRect.width > 0 ? imgRect.width : numberAttr(img, 'width');
  const imgHeight = imgRect && imgRect.height > 0 ? imgRect.height : numberAttr(img, 'height');
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id,
    className: typeof el.className === 'string' ? el.className : '',
    role: el.getAttribute('role'),
    ariaModal: el.getAttribute('aria-modal'),
    title: el.getAttribute('title') ?? el.getAttribute('aria-label'),
    src: el.getAttribute('src'),
    text: raw.slice(0, MAX_TEXT),
    textLength: raw.length,
    position: style.position,
    width: rect.width,
    height: rect.height,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    hasPassword: el.querySelector('input[type="password"]') !== null,
    hasPaymentFrame: hasPaymentFrame(el),
    hasProductZoom: imgWidth >= 180 && imgHeight >= 180,
    hasCheckoutControl: hasCheckoutControl(el),
  };
}

function numberAttr(el: Element | null, name: string): number {
  if (!el) {
    return 0;
  }
  const value = Number(el.getAttribute(name));
  return Number.isFinite(value) ? value : 0;
}

function hasPaymentFrame(el: HTMLElement): boolean {
  const frames = el.querySelectorAll('iframe');
  for (const frame of frames) {
    const src = frame.getAttribute('src') ?? '';
    if (PAYMENT_SRC.test(src)) {
      return true;
    }
  }
  return false;
}

function hasCheckoutControl(el: HTMLElement): boolean {
  const controls = el.querySelectorAll('button, a, [role="button"]');
  for (const control of controls) {
    const text = (control.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (CHECKOUT_TEXT.test(text)) {
      return true;
    }
  }
  return false;
}

const CANDIDATE_SELECTOR = [
  '[role="dialog"]',
  '[aria-modal="true"]',
  'iframe',
  'div[class*="popup" i]',
  'div[class*="dialog" i]',
  'div[class*="timer" i]',
  'div[class*="countdown" i]',
  'div[class*="wheel" i]',
  'div[class*="spin" i]',
  'div[class*="lucky" i]',
  'div[class*="claim" i]',
  'div[class*="hurry" i]',
  'div[id*="popup" i]',
  'div[id*="dialog" i]',
  'div[id*="timer" i]',
  'div[id*="countdown" i]',
  'div[id*="wheel" i]',
  'div[id*="spin" i]',
  'div[id*="lucky" i]',
  'div[id*="claim" i]',
  'div[id*="hurry" i]',
  'iframe[class*="popup" i]',
  'iframe[class*="timer" i]',
  'iframe[class*="countdown" i]',
  'iframe[id*="popup" i]',
  'iframe[id*="timer" i]',
  'iframe[id*="countdown" i]',
  'iframe[id*="wheel" i]',
  'iframe[id*="spin" i]',
  'iframe[id*="lucky" i]',
  'iframe[id*="claim" i]',
].join(',');

function candidateElements(root: ParentNode): HTMLElement[] {
  const found = new Set<HTMLElement>();
  try {
    for (const node of root.querySelectorAll(CANDIDATE_SELECTOR)) {
      if (node instanceof HTMLElement) {
        found.add(node);
      }
    }
  } catch {
    for (const node of root.querySelectorAll('div, iframe, [role="dialog"], [aria-modal="true"]')) {
      if (node instanceof HTMLElement) {
        found.add(node);
      }
    }
  }
  collectPortals(root, found);
  return [...found];
}

function collectPortals(root: ParentNode, found: Set<HTMLElement>): void {
  const doc = root instanceof Document ? root : root.ownerDocument;
  if (!doc) {
    return;
  }
  const seeds: Element[] = [doc.body];
  const app = doc.getElementById('root') ?? doc.getElementById('__next');
  if (app) {
    seeds.push(app);
  }
  for (const seed of seeds) {
    for (const child of seed.children) {
      if (child instanceof HTMLElement) {
        found.add(child);
        for (const grand of child.children) {
          if (grand instanceof HTMLElement) {
            found.add(grand);
          }
        }
      }
    }
  }
}

export function applyTemuOverlayPass(
  root: ParentNode,
  isActive: () => boolean,
  viewport = { width: window.innerWidth || 1280, height: window.innerHeight || 800 },
): number {
  const doc = root instanceof Document ? root : root.ownerDocument;
  if (!doc) {
    return 0;
  }
  ensureStyle(doc);
  if (!isActive()) {
    restoreTemuOverlays(doc);
    return 0;
  }
  let hidden = 0;
  for (const el of candidateElements(root)) {
    if (el.classList.contains(HIDE_CLASS) || el.closest(`.${HIDE_CLASS}`)) {
      continue;
    }
    if (!shouldSuppressTemuOverlay(factsFrom(el, viewport))) {
      continue;
    }
    el.classList.add(HIDE_CLASS);
    hidden += 1;
  }
  doc.documentElement.classList.toggle(SCROLL_CLASS, doc.querySelector(`.${HIDE_CLASS}`) !== null);
  return hidden;
}

export function restoreTemuOverlays(doc: Document): void {
  for (const el of doc.querySelectorAll(`.${HIDE_CLASS}`)) {
    el.classList.remove(HIDE_CLASS);
  }
  doc.documentElement.classList.remove(SCROLL_CLASS);
}

function ensureStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) {
    return;
  }
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `.${HIDE_CLASS}{display:none !important}html.${SCROLL_CLASS},html.${SCROLL_CLASS} body{overflow:auto !important}`;
  (doc.head ?? doc.documentElement).appendChild(style);
}

export function startTemuOverlayGuard(isActive: () => boolean): () => void {
  if (location.hostname !== HOST) {
    return () => undefined;
  }
  ensureStyle(document);
  let scheduled = false;
  const run = (): void => {
    scheduled = false;
    if (!isActive()) {
      restoreTemuOverlays(document);
      return;
    }
    applyTemuOverlayPass(document, isActive);
  };
  const schedule = (): void => {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(run);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'id', 'role', 'aria-modal', 'style'],
  });
  const timers = [window.setTimeout(schedule, 0), window.setTimeout(schedule, 800)];
  window.addEventListener('pageshow', schedule);
  schedule();
  return () => {
    observer.disconnect();
    window.removeEventListener('pageshow', schedule);
    for (const timer of timers) {
      window.clearTimeout(timer);
    }
    restoreTemuOverlays(document);
  };
}
