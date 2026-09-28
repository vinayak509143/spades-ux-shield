import { bindEngine, handlePageShow, isPageActive, onPageActiveChange, setPageActive } from './lifecycle.js';
import { ProceduralEngine } from './dom-mutator.js';
import { applyHostMark } from './host-mark.js';
import { revivePackagedRules } from './packaged-rules.js';
import { ruleMatchesHost } from './procedural-match.js';
import { sendRuntimeMessage } from './runtime-safe.js';
import { initSpaRouting } from './spa.js';
import { applyTemuOverlayPass, startTemuOverlayGuard } from './temu-overlay.js';

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
    if (!isPageActive() || rules.length === 0) {
      return;
    }
    engine.start(rules, engineOpts);
    initSpaRouting(engine);
  };

  const criticalProceduralForHost = rules.some(
    (rule) =>
      ruleMatchesHost(rule, location.hostname) &&
      rule.procedural.length > 0 &&
      (rule.action.type === 'hide' || rule.action.type === 'replace-text'),
  );
  if (criticalProceduralForHost) {
    startProceduralIfNeeded();
  } else if (typeof requestIdleCallback === 'function') {
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
    handlePageShow();
  });

  if (location.hostname === 'www.temu.com') {
    startTemuOverlayGuard(isPageActive);
    onPageActiveChange(() => {
      applyTemuOverlayPass(document, isPageActive);
    });
  }
})();
