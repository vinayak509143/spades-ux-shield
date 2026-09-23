import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendRuntimeMessage } from '../../src/content/runtime-safe.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sendRuntimeMessage', () => {
  it('does not throw when the extension context is already gone', () => {
    vi.stubGlobal('chrome', {
      runtime: {
        id: 'ext',
        sendMessage: () => {
          throw new Error('Extension context invalidated.');
        },
      },
    });
    expect(() => sendRuntimeMessage({ type: 'op:rule-hit', ruleId: 1 })).not.toThrow();
  });

  it('skips send when the runtime id is missing', () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { id: '', sendMessage } });
    sendRuntimeMessage({ type: 'op:rule-hit', ruleId: 1 });
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
