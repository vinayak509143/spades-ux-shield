import { hostSuffixes } from '../engine/util.js';
import { bindEngine, setPageActive } from './lifecycle.js';
import { ProceduralEngine } from './dom-mutator.js';
import { revivePackagedRules } from './packaged-rules.js';
import { initSpaRouting } from './spa.js';

(function boot(): void {
  const suffixes = hostSuffixes(location.hostname).join(' ');
  document.documentElement.setAttribute('data-op-h', suffixes);
  document.documentElement.setAttribute('data-op', '1');

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

  const startIfActive = (): void => {
    chrome.runtime.sendMessage({ type: 'op:query-state' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        engine.start(rules, engineOpts);
        initSpaRouting(engine);
        return;
      }
      if (response.active === false) {
        setPageActive(false);
      } else {
        engine.start(rules, engineOpts);
      }
      initSpaRouting(engine);
    });
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(startIfActive, { timeout: 200 });
  } else {
    requestAnimationFrame(startIfActive);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== 'object') {
      return;
    }
    if (message.type === 'op:set-active' && typeof message.active === 'boolean') {
      setPageActive(message.active);
    }
  });
})();
