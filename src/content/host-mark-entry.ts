import { applyHostMark, ensureHostMark } from './host-mark.js';

applyHostMark();

window.addEventListener('pageshow', () => {
  ensureHostMark();
});
