import { createEmptyState, updateSettings } from './domain.js';
import { STORAGE_KEY, createPersistence, loadState } from './storage.js';
import { applyTheme, prefersDark, resolveTheme, watchSystemTheme } from './theme.js';

function notifyStorageError(error) {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(
    new CustomEvent('todo:storage-error', { detail: { error } }),
  );
}

let state = createEmptyState();

const persistence = createPersistence({
  listen: false,
  onError: notifyStorageError,
});

function currentPreference() {
  return state.settings?.theme ?? 'system';
}

export function paintTheme(preference = currentPreference(), systemDark = prefersDark()) {
  const resolved = resolveTheme(preference, systemDark);
  if (typeof document !== 'undefined') {
    applyTheme(document, preference, resolved);
    const select = document.getElementById('theme-select');
    if (select && select.value !== preference) {
      select.value = preference;
    }
  }
  return resolved;
}

export function persistState() {
  return persistence.write(state);
}

export function setThemePreference(preference) {
  state = updateSettings(state, { theme: preference }).state;
  paintTheme(state.settings.theme);
  persistState();
  persistence.flush();
  return state.settings.theme;
}

export function getState() {
  return state;
}

export function hydrate() {
  const loaded = persistence.load();
  state = loaded.state ?? loadState().state ?? createEmptyState();
  paintTheme();
  return state;
}

function bindShell() {
  if (typeof document === 'undefined') return;

  const select = document.getElementById('theme-select');
  if (select) {
    select.value = currentPreference();
    select.addEventListener('change', () => {
      setThemePreference(select.value);
    });
  }

  const addTask = document.getElementById('add-task');
  if (addTask) {
    addTask.addEventListener('click', () => {
      addTask.dispatchEvent(new CustomEvent('todo:add-task', { bubbles: true }));
    });
  }
}

hydrate();
bindShell();

watchSystemTheme((matches) => {
  if (currentPreference() === 'system') {
    paintTheme('system', matches);
  }
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key && event.key !== STORAGE_KEY) return;
    const next = persistence.handleStorageEvent(event);
    if (next && next.state) {
      state = next.state;
    } else {
      state = loadState().state ?? state;
    }
    paintTheme();
  });
}
