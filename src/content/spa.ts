import type { ProceduralEngine } from './dom-mutator.js';
import { pathAndSearch } from './procedural-match.js';

export interface RouteMessage {
  type: 'op:route';
  path: string;
  search?: string;
}

export function initSpaRouting(engine: ProceduralEngine): void {
  const notify = (): void => {
    engine.onRoute(pathAndSearch());
  };

  window.addEventListener('popstate', notify);
  window.addEventListener('hashchange', notify);

  if ('navigation' in window && typeof window.navigation?.addEventListener === 'function') {
    window.navigation.addEventListener('navigate', () => {
      notify();
    });
  }

  const chromeApi = (globalThis as { chrome?: { runtime?: { onMessage?: { addListener: (fn: (msg: unknown) => void) => void } } } })
    .chrome;
  chromeApi?.runtime?.onMessage?.addListener((message: unknown) => {
    if (!message || typeof message !== 'object') {
      return;
    }
    const msg = message as RouteMessage;
    if (msg.type !== 'op:route') {
      return;
    }
    const path = msg.search ? `${msg.path}${msg.search}` : msg.path;
    engine.onRoute(path);
  });
}
