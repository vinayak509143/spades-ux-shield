/**
 * MAIN world — stamp only. Must stay MAIN so page JS cannot wrap our isolated
 * world, and so data-op lands before author CSS.
 */
import { applyHostMark, ensureHostMark } from './host-mark.js';

applyHostMark();

window.addEventListener('pageshow', () => {
  ensureHostMark();
});
