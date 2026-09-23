/**
 * Content scripts outlive an extension reload. chrome.runtime.sendMessage then
 * throws "Extension context invalidated" synchronously, which .catch() does not see.
 */

export function sendRuntimeMessage(
  message: Record<string, unknown>,
  onResponse?: (response: unknown) => void,
): void {
  try {
    if (!chrome.runtime?.id) {
      return;
    }
    if (onResponse) {
      chrome.runtime.sendMessage(message, (response: unknown) => {
        if (chrome.runtime.lastError) {
          return;
        }
        onResponse(response);
      });
      return;
    }
    const pending = chrome.runtime.sendMessage(message) as Promise<unknown> | undefined;
    if (pending && typeof pending.catch === 'function') {
      void pending.catch(() => {});
    }
  } catch {
    // Orphaned content script. A tab reload binds the new extension.
  }
}
