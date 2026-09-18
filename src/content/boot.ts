import { bindEngine, isPageActive, setPageActive } from './lifecycle.js';
import { ProceduralEngine } from './dom-mutator.js';
import { applyHostMark } from './host-mark.js';
import { revivePackagedRules } from './packaged-rules.js';
import { initSpaRouting } from './spa.js';

(function boot(): void {
  applyHostMark();

  const rules = revivePackagedRules();
  const engine = new ProceduralEngine();
  const engineOpts = {
    pierceShadow: true,
    onRuleApplied: (ruleId: number): void => {
      chrome.runtime.sendMessage({ type: 'op:rule-hit', ruleId }).catch(() => {
        // Service worker asleep.
      });
    },
  };

  bindEngine(engine, rules);

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

  chrome.runtime.sendMessage({ type: 'op:query-state' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      return;
    }
    if (response.active === false) {
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
