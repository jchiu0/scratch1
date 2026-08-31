import { THEMES, normalizeTheme } from './domain.js';

export { THEMES };

export function prefersDark(mediaQueryList) {
  if (mediaQueryList && typeof mediaQueryList.matches === 'boolean') {
    return mediaQueryList.matches;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export function resolveTheme(preference, mediaMatchesDark) {
  const theme = normalizeTheme(preference);
  if (theme === 'light' || theme === 'dark') return theme;
  return mediaMatchesDark ? 'dark' : 'light';
}

export function readThemePreference(raw, fallback = 'system') {
  if (raw == null || raw === '') return fallback;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const theme = parsed?.settings?.theme;
    return THEMES.includes(theme) ? theme : fallback;
  } catch {
    return fallback;
  }
}

export function applyTheme(documentRef, preference, resolved) {
  const root = documentRef?.documentElement;
  if (!root) return resolved;
  const pref = normalizeTheme(preference);
  const value = resolved ?? resolveTheme(pref, prefersDark());
  root.setAttribute('data-theme', value);
  root.setAttribute('data-theme-preference', pref);
  root.style.colorScheme = value;
  return value;
}

export function watchSystemTheme(callback, media) {
  const mql =
    media ??
    (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null);
  if (!mql) return () => {};

  const handler = (event) => {
    callback(Boolean(event.matches));
  };

  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }
  if (typeof mql.addListener === 'function') {
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }
  return () => {};
}
