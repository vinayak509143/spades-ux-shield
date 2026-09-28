// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  applyTemuOverlayPass,
  restoreTemuOverlays,
  shouldSuppressTemuOverlay,
  type OverlayFacts,
} from '../../src/content/temu-overlay.js';

function facts(partial: Partial<OverlayFacts>): OverlayFacts {
  return {
    tag: 'div',
    id: '',
    className: '',
    role: null,
    ariaModal: null,
    title: null,
    src: null,
    text: '',
    textLength: 0,
    position: 'static',
    width: 0,
    height: 0,
    viewportWidth: 1280,
    viewportHeight: 800,
    hasPassword: false,
    hasPaymentFrame: false,
    hasProductZoom: false,
    hasCheckoutControl: false,
    ...partial,
  };
}

afterEach(() => {
  restoreTemuOverlays(document);
  document.body.innerHTML = '';
});

describe('Temu overlay guard', () => {
  it('hides a spin wheel popup and leaves the product photo and checkout', () => {
    expect(
      shouldSuppressTemuOverlay(
        facts({
          className: 'lucky-wheel popup',
          position: 'fixed',
          width: 1280,
          height: 800,
          text: 'Spin the wheel',
          textLength: 14,
        }),
      ),
    ).toBe(true);
    expect(
      shouldSuppressTemuOverlay(
        facts({
          tag: 'img',
          className: 'gallery',
          text: 'pillow',
          textLength: 6,
          hasProductZoom: true,
        }),
      ),
    ).toBe(false);
    expect(
      shouldSuppressTemuOverlay(
        facts({
          className: 'buy-box',
          text: 'Add to cart',
          textLength: 11,
          hasCheckoutControl: true,
        }),
      ),
    ).toBe(false);
  });

  it('hides a countdown iframe and a hurry dialog', () => {
    expect(
      shouldSuppressTemuOverlay(
        facts({ tag: 'iframe', id: 'countdown-frame', title: 'timer' }),
      ),
    ).toBe(true);
    expect(
      shouldSuppressTemuOverlay(
        facts({
          role: 'dialog',
          position: 'fixed',
          width: 900,
          height: 600,
          text: 'Hurry, claim your gift',
          textLength: 23,
        }),
      ),
    ).toBe(true);
  });

  it('keeps login, payment, product zoom, and the in-page checkout sheet', () => {
    expect(shouldSuppressTemuOverlay(facts({ role: 'dialog', hasPassword: true, text: 'Sign in', textLength: 7 }))).toBe(
      false,
    );
    expect(
      shouldSuppressTemuOverlay(facts({ tag: 'iframe', src: 'https://pay.example/payment', id: 'popup' })),
    ).toBe(false);
    expect(
      shouldSuppressTemuOverlay(
        facts({
          className: 'image-dialog',
          role: 'dialog',
          position: 'fixed',
          width: 1000,
          height: 700,
          hasProductZoom: true,
          text: 'Photo',
          textLength: 5,
        }),
      ),
    ).toBe(false);
    expect(
      shouldSuppressTemuOverlay(
        facts({
          role: 'dialog',
          position: 'fixed',
          width: 1000,
          height: 700,
          hasCheckoutControl: true,
          text: 'Select options',
          textLength: 14,
        }),
      ),
    ).toBe(false);
  });

  it('does not hide a long product description that mentions lucky', () => {
    const text = `Soft satin pillow. A lucky find for hot sleepers. ${'detail '.repeat(80)}`;
    expect(
      shouldSuppressTemuOverlay(
        facts({ className: 'goods-detail', text: text.slice(0, 800), textLength: text.length }),
      ),
    ).toBe(false);
  });

  it('applies display none on a fixed claim layer and leaves price and checkout', () => {
    document.body.innerHTML = `
      <img id="photo" width="400" height="400" alt="pillow">
      <div id="price">$19.42</div>
      <button id="buy">Add to cart</button>
      <div id="claim" class="claim-popup" role="dialog" style="position:fixed" data-w="1280" data-h="800">Claim your gift</div>
    `;
    const claim = document.getElementById('claim') as HTMLElement;
    claim.getBoundingClientRect = () =>
      ({ width: 1280, height: 800, top: 0, left: 0, right: 1280, bottom: 800, x: 0, y: 0, toJSON() {} }) as DOMRect;
    const hidden = applyTemuOverlayPass(document, () => true, { width: 1280, height: 800 });
    expect(hidden).toBeGreaterThan(0);
    expect(claim.classList.contains('op-temu-overlay')).toBe(true);
    expect(document.getElementById('photo')?.classList.contains('op-temu-overlay')).toBe(false);
    expect(document.getElementById('price')?.classList.contains('op-temu-overlay')).toBe(false);
    expect(document.getElementById('buy')?.classList.contains('op-temu-overlay')).toBe(false);
    const style = document.getElementById('op-temu-overlay-style');
    expect(style?.textContent).toContain('display:none !important');
  });
});
