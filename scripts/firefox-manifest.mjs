export const FIREFOX_EXTENSION_ID = 'spades-ux-shield@vinayak509143';
export const FIREFOX_MIN_VERSION = '140.0';
export const FIREFOX_ANDROID_MIN_VERSION = '142.0';

/**
 * Return a Firefox manifest. The Chrome manifest object is left unchanged.
 * @param {Record<string, unknown>} manifest
 */
export function withFirefoxSettings(manifest) {
  if (manifest == null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('manifest must be an object');
  }
  if (Object.prototype.hasOwnProperty.call(manifest, 'browser_specific_settings')) {
    throw new Error('Chrome manifest must not contain browser_specific_settings');
  }
  const background = manifest.background;
  if (
    background == null ||
    typeof background !== 'object' ||
    Array.isArray(background) ||
    typeof background.service_worker !== 'string' ||
    background.service_worker.length === 0
  ) {
    throw new Error('Chrome manifest must include background.service_worker');
  }
  return {
    ...manifest,
    // Firefox does not run extension service workers (bug 1573659).
    // It starts background.scripts as an event page. Chrome keeps service_worker.
    background: {
      scripts: [background.service_worker],
    },
    browser_specific_settings: {
      gecko: {
        id: FIREFOX_EXTENSION_ID,
        strict_min_version: FIREFOX_MIN_VERSION,
        data_collection_permissions: {
          required: ['none'],
        },
      },
      gecko_android: {
        strict_min_version: FIREFOX_ANDROID_MIN_VERSION,
      },
    },
  };
}
