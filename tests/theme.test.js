import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  watchSystemTheme,
} from '../src/theme.js';

const root = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(root, '../src/styles.css'), 'utf8');
const html = readFileSync(join(root, '../index.html'), 'utf8');
const boot = readFileSync(join(root, '../src/theme-boot.js'), 'utf8');

describe('theme', () => {
  it('resolves light, dark, and system from prefers-color-scheme', () => {
    assert.equal(resolveTheme('dark', false), 'dark');
    assert.equal(resolveTheme('light', true), 'light');
    assert.equal(resolveTheme('system', true), 'dark');
    assert.equal(resolveTheme('system', false), 'light');
    assert.equal(resolveTheme('nope', true), 'dark');
  });

  it('reads persisted Dark preference so reload can apply it before paint', () => {
    const payload = JSON.stringify({
      version: 1,
      settings: { theme: 'dark' },
    });
    assert.equal(readThemePreference(payload), 'dark');
    assert.equal(readThemePreference('{bad'), 'system');
    assert.match(html, /src=\"\.\/src\/theme-boot\.js\"/);
    assert.match(html, /<script src=\"\.\/src\/theme-boot\.js\"><\/script>/);
    assert.ok(html.indexOf('theme-boot.js') < html.indexOf('styles.css'));
    assert.match(boot, /data-theme/);
    assert.match(boot, /todo-app:v1/);
  });

  it('applies data-theme and keeps contrast tokens in both themes', () => {
    const attrs = {};
    const style = {};
    const documentRef = {
      documentElement: {
        setAttribute(name, value) {
          attrs[name] = value;
        },
        style,
      },
    };
    applyTheme(documentRef, 'dark', 'dark');
    assert.equal(attrs['data-theme'], 'dark');
    assert.equal(attrs['data-theme-preference'], 'dark');
    assert.equal(style.colorScheme, 'dark');

    assert.match(css, /\[data-theme="dark"\]/);
    assert.match(css, /--text:/);
    assert.match(css, /--border:/);
    assert.match(css, /--control-bg:/);
    assert.match(css, /--control-text:/);
  });

  it('disables CSS transitions when prefers-reduced-motion is reduce', () => {
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.match(css, /transition:\s*none/);
  });

  it('watches system theme changes when System is selected', () => {
    const listeners = [];
    const media = {
      matches: true,
      addEventListener(type, handler) {
        listeners.push({ type, handler });
      },
      removeEventListener(type, handler) {
        const index = listeners.findIndex((item) => item.type === type && item.handler === handler);
        if (index >= 0) listeners.splice(index, 1);
      },
    };
    const seen = [];
    const stop = watchSystemTheme((matches) => seen.push(matches), media);
    assert.equal(listeners.length, 1);
    listeners[0].handler({ matches: false });
    assert.deepEqual(seen, [false]);
    stop();
    assert.equal(listeners.length, 0);
    assert.equal(resolveTheme('system', true), 'dark');
    assert.equal(resolveTheme('system', false), 'light');
  });

  it('shell includes one h1 and banner/navigation/main landmarks', () => {
    assert.match(html, /<h1[^>]*>Todo<\/h1>/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /role="banner"|header class="app-header"/);
    assert.match(html, /<nav /);
    assert.match(html, /<main /);
    assert.match(html, /id="theme-select"/);
    assert.match(html, /id="add-task"/);
  });
});
