import { bindEngine, isPageActive, setPageActive } from './lifecycle.js';
import { ProceduralEngine } from './dom-mutator.js';
import { applyHostMark } from './host-mark.js';
import { revivePackagedRules } from './packaged-rules.js';
import { sendRuntimeMessage } from './runtime-safe.js';
import { initSpaRouting } from './spa.js';

(function boot(): void {
  applyHostMark();

  const rules = revivePackagedRules();
  const engine = new ProceduralEngine();
  const engineOpts = {
    pierceShadow: true,
    onRuleApplied: (ruleId: number): void => {
      sendRuntimeMessage({ type: 'op:rule-hit', ruleId });
    },
  };

  bindEngine(engine, rules, engineOpts);

  const startProceduralIfNeeded = (): void => {
    if (rules.length === 0) {
      return;
    }
    engine.start(rules, engineOpts);
    initSpaRouting(engine);
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(startProceduralIfNeeded, { timeout: 200 });
  } else {
    requestAnimationFrame(startProceduralIfNeeded);
  }

  sendRuntimeMessage({ type: 'op:query-state' }, (response) => {
    if (!response || typeof response !== 'object') {
      return;
    }
    if ('active' in response && response.active === false) {
      setPageActive(false);
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== 'object') {
      return;
    }
    if (message.type === 'op:set-active' && typeof message.active === 'boolean') {
      setPageActive(message.active);
    }
  });

  window.addEventListener('pageshow', () => {
    applyHostMark();
    if (isPageActive() && rules.length > 0) {
      engine.start(rules, engineOpts);
    }
  });
})();
