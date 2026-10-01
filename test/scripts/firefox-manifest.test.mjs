import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FIREFOX_ANDROID_MIN_VERSION,
  FIREFOX_EXTENSION_ID,
  FIREFOX_MIN_VERSION,
  withFirefoxSettings,
} from '../../scripts/firefox-manifest.mjs';

describe('withFirefoxSettings', () => {
  it('adds the gecko id without changing the chrome manifest', () => {
    const chrome = {
      manifest_version: 3,
      version: '1.0.8',
      name: 'Spades UX-Shield',
      icons: { '128': 'store/icon-128.png' },
      background: {
        service_worker: 'dist/service-worker.js',
        type: 'module',
      },
    };
    const firefox = withFirefoxSettings(chrome);
    expect(chrome.background).toEqual({
      service_worker: 'dist/service-worker.js',
      type: 'module',
    });
    expect(chrome).not.toHaveProperty('browser_specific_settings');
    expect(firefox.background).toEqual({ scripts: ['dist/service-worker.js'] });
    expect(firefox.browser_specific_settings.gecko.id).toBe(FIREFOX_EXTENSION_ID);
    expect(firefox.browser_specific_settings.gecko.strict_min_version).toBe(
      FIREFOX_MIN_VERSION,
    );
    expect(firefox.version).toBe('1.0.8');
    expect(firefox.manifest_version).toBe(3);
    expect(firefox.icons).toBe(chrome.icons);
    expect(firefox).not.toHaveProperty('data_collection_permissions');
    expect(firefox.browser_specific_settings.gecko.data_collection_permissions).toEqual({
      required: ['none'],
    });
    expect(firefox.browser_specific_settings.gecko_android).toEqual({
      strict_min_version: FIREFOX_ANDROID_MIN_VERSION,
    });
  });

  it('rejects a manifest that already has browser_specific_settings', () => {
    expect(() => withFirefoxSettings({ browser_specific_settings: {} })).toThrow(
      /browser_specific_settings/,
    );
  });

  it('rejects a manifest without a service worker', () => {
    expect(() => withFirefoxSettings({ name: 'Spades UX-Shield' })).toThrow(
      /background\.service_worker/,
    );
  });

  it('rejects a non-object manifest', () => {
    expect(() => withFirefoxSettings(null)).toThrow(/manifest must be an object/);
    expect(() => withFirefoxSettings([])).toThrow(/manifest must be an object/);
  });
});

describe('repo manifest', () => {
  it('stays free of browser_specific_settings', () => {
    const manifest = JSON.parse(readFileSync(resolve('manifest.json'), 'utf8'));
    expect(manifest.browser_specific_settings).toBeUndefined();
    expect(manifest.version).toBe('1.0.8');
  });
});
