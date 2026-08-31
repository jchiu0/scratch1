import {
  STORAGE_KEY,
  STORAGE_VERSION,
  PRIORITIES,
  THEMES,
  SORTS,
  STATUS_FILTERS,
  DUE_FILTERS,
  createEmptyState,
  createInboxProject,
  createDefaultSettings,
  normalizeTags,
  normalizePriority,
  normalizeDueDate,
  normalizeTheme,
  normalizeSort,
  validateProjectName,
  validateTaskTitle,
  validateNotes,
  toIso,
} from './domain.js';

export { STORAGE_KEY, STORAGE_VERSION };

const WRITE_DEBOUNCE_MS = 300;

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function coerceOrder(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sanitizeProject(raw, index, clock) {
  if (!isPlainObject(raw)) return null;
  const name = validateProjectName(raw.name);
  if (!name.ok) return null;
  const now = toIso(clock);
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `project-${index}-${now}`,
    name: name.value,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
    order: coerceOrder(raw.order, index),
  };
}

function sanitizeTask(raw, index, validProjectIds, clock) {
  if (!isPlainObject(raw)) return null;
  const title = validateTaskTitle(raw.title);
  if (!title.ok) return null;
  const notes = validateNotes(raw.notes ?? '');
  if (!notes.ok) return null;
  if (typeof raw.projectId !== 'string' || !validProjectIds.has(raw.projectId)) {
    return null;
  }
  const now = toIso(clock);
  const completed = Boolean(raw.completed);
  let completedAt = null;
  if (completed) {
    completedAt = typeof raw.completedAt === 'string' ? raw.completedAt : now;
  }
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `task-${index}-${now}`,
    projectId: raw.projectId,
    title: title.value,
    notes: notes.value,
    completed,
    priority: normalizePriority(raw.priority),
    dueDate: normalizeDueDate(raw.dueDate ?? null),
    tags: normalizeTags(Array.isArray(raw.tags) ? raw.tags : []),
    order: coerceOrder(raw.order, index),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
    completedAt,
  };
}

function sanitizeSettings(raw, projects) {
  const defaults = createDefaultSettings(projects[0]?.id ?? 'all');
  if (!isPlainObject(raw)) return defaults;
  const filters = isPlainObject(raw.filters) ? raw.filters : {};
  let activeProjectId = raw.activeProjectId ?? defaults.activeProjectId;
  if (
    activeProjectId !== 'all' &&
    !projects.some((project) => project.id === activeProjectId)
  ) {
    activeProjectId = projects[0]?.id ?? 'all';
  }
  return {
    theme: normalizeTheme(THEMES.includes(raw.theme) ? raw.theme : defaults.theme),
    activeProjectId,
    sort: normalizeSort(SORTS.includes(raw.sort) ? raw.sort : defaults.sort),
    filters: {
      status: STATUS_FILTERS.includes(filters.status) ? filters.status : 'all',
      priorities: Array.isArray(filters.priorities)
        ? filters.priorities.filter((item) => PRIORITIES.includes(item))
        : [],
      tags: Array.isArray(filters.tags) ? normalizeTags(filters.tags) : [],
      due: DUE_FILTERS.includes(filters.due) ? filters.due : 'all',
      search: typeof filters.search === 'string' ? filters.search : '',
    },
  };
}

export function serializeState(state) {
  return JSON.stringify({
    version: STORAGE_VERSION,
    projects: state.projects ?? [],
    tasks: state.tasks ?? [],
    settings: state.settings ?? createDefaultSettings(),
  });
}

export function deserializeState(raw, clock) {
  const fallback = createEmptyState(clock);
  if (raw == null || raw === '') {
    return { ok: true, state: fallback, recovered: true, reason: 'empty' };
  }

  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { ok: true, state: fallback, recovered: true, reason: 'invalid-json' };
  }

  if (!isPlainObject(parsed)) {
    return { ok: true, state: fallback, recovered: true, reason: 'invalid-schema' };
  }

  const version = Number(parsed.version);
  if (version && version > STORAGE_VERSION) {
    return { ok: true, state: fallback, recovered: true, reason: 'unsupported-version' };
  }

  const rawProjects = Array.isArray(parsed.projects) ? parsed.projects : [];
  const projects = rawProjects
    .map((project, index) => sanitizeProject(project, index, clock))
    .filter(Boolean);

  if (projects.length === 0) {
    projects.push(createInboxProject(clock));
  }

  const validProjectIds = new Set(projects.map((project) => project.id));
  const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  const tasks = rawTasks
    .map((task, index) => sanitizeTask(task, index, validProjectIds, clock))
    .filter(Boolean);

  const settings = sanitizeSettings(parsed.settings, projects);

  return {
    ok: true,
    state: { projects, tasks, settings },
    recovered: projects.length !== rawProjects.length || tasks.length !== rawTasks.length,
    reason: null,
  };
}

function getStorage(storage) {
  return storage ?? (typeof localStorage === 'undefined' ? null : localStorage);
}

export function loadState(storage, clock) {
  const store = getStorage(storage);
  if (!store || typeof store.getItem !== 'function') {
    return { ok: true, state: createEmptyState(clock), recovered: true, reason: 'no-storage' };
  }
  try {
    return deserializeState(store.getItem(STORAGE_KEY), clock);
  } catch {
    return { ok: true, state: createEmptyState(clock), recovered: true, reason: 'storage-error' };
  }
}

export function saveState(state, storage) {
  const store = getStorage(storage);
  if (!store || typeof store.setItem !== 'function') {
    return { ok: false, error: 'no-storage' };
  }
  try {
    store.setItem(STORAGE_KEY, serializeState(state));
    return { ok: true };
  } catch (error) {
    throw error;
  }
}

export function applyStorageEvent(event, currentState, clock) {
  if (!event || event.key !== STORAGE_KEY) {
    return { changed: false, state: currentState };
  }
  if (event.newValue == null) {
    return { changed: true, state: createEmptyState(clock), recovered: true };
  }
  const loaded = deserializeState(event.newValue, clock);
  return { changed: true, state: loaded.state, recovered: loaded.recovered };
}

export function createPersistence(options = {}) {
  const storage = getStorage(options.storage);
  const clock = options.clock;
  const debounceMs = options.debounceMs ?? WRITE_DEBOUNCE_MS;
  const onChange = typeof options.onChange === 'function' ? options.onChange : null;
  let timer = null;
  let pendingState = null;
  let applyingRemote = false;
  let currentState = null;

  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pendingState == null) return { ok: true };
    const toWrite = pendingState;
    pendingState = null;
    currentState = toWrite;
    return saveState(toWrite, storage);
  }

  function scheduleWrite(state) {
    pendingState = state;
    currentState = state;
    if (debounceMs <= 0) {
      return flush();
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      try {
        flush();
      } catch (error) {
        if (typeof options.onError === 'function') {
          options.onError(error);
        } else {
          throw error;
        }
      }
    }, debounceMs);
    return { ok: true, scheduled: true };
  }

  function handleStorageEvent(event) {
    if (applyingRemote) {
      return { changed: false, state: currentState };
    }
    applyingRemote = true;
    try {
      const result = applyStorageEvent(event, currentState, clock);
      if (result.changed) {
        currentState = result.state;
        pendingState = null;
        if (onChange) {
          onChange(result.state, { source: 'storage', recovered: result.recovered });
        }
      }
      return result;
    } finally {
      applyingRemote = false;
    }
  }

  if (typeof window !== 'undefined' && options.listen !== false) {
    window.addEventListener('storage', handleStorageEvent);
  }

  return {
    load() {
      const loaded = loadState(storage, clock);
      currentState = loaded.state;
      return loaded;
    },
    write(state) {
      return scheduleWrite(state);
    },
    flush,
    handleStorageEvent,
    dispose() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (typeof window !== 'undefined' && options.listen !== false) {
        window.removeEventListener('storage', handleStorageEvent);
      }
    },
  };
}
