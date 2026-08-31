/**
 * Domain model and pure mutations for the TODO app.
 * No UI or storage side effects live here.
 */

export const PRIORITIES = Object.freeze(['none', 'low', 'medium', 'high']);
export const THEMES = Object.freeze(['light', 'dark', 'system']);
export const SORTS = Object.freeze(['manual', 'dueDate', 'priority', 'title']);
export const STATUS_FILTERS = Object.freeze(['all', 'active', 'completed']);
export const DUE_FILTERS = Object.freeze(['all', 'overdue', 'today', 'upcoming', 'none']);

export const STORAGE_KEY = 'todo-app:v1';
export const STORAGE_VERSION = 1;
export const INBOX_NAME = 'Inbox';

export const PROJECT_NAME_MAX = 80;
export const TASK_TITLE_MAX = 200;
export const TASK_NOTES_MAX = 2000;
export const TAG_MAX_LENGTH = 24;
export const TAG_MAX_COUNT = 10;

export const DEFAULT_FILTERS = Object.freeze({
  status: 'all',
  priorities: Object.freeze([]),
  tags: Object.freeze([]),
  due: 'all',
  search: '',
});

export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system',
  activeProjectId: 'all',
  filters: DEFAULT_FILTERS,
  sort: 'manual',
});

const TAG_PATTERN = /^[A-Za-z0-9_\- ]{1,24}$/;
const DUE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function getDate(clock) {
  if (clock == null) return new Date();
  if (typeof clock === 'function') return clock();
  if (clock instanceof Date) return new Date(clock.getTime());
  return new Date(clock);
}

export function toIso(clock) {
  return getDate(clock).toISOString();
}

export function localYmd(clock) {
  const date = getDate(clock);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function validateProjectName(name) {
  const value = typeof name === 'string' ? name.trim() : '';
  if (value.length < 1 || value.length > PROJECT_NAME_MAX) {
    return {
      ok: false,
      error: `Project name must be 1-${PROJECT_NAME_MAX} characters`,
      value,
    };
  }
  return { ok: true, value };
}

export function validateTaskTitle(title) {
  const value = typeof title === 'string' ? title.trim() : '';
  if (value.length < 1 || value.length > TASK_TITLE_MAX) {
    return {
      ok: false,
      error: `Title must be 1-${TASK_TITLE_MAX} characters`,
      value,
    };
  }
  return { ok: true, value };
}

export function validateNotes(notes) {
  const value = notes == null ? '' : String(notes);
  if (value.length > TASK_NOTES_MAX) {
    return {
      ok: false,
      error: `Notes must be at most ${TASK_NOTES_MAX} characters`,
      value,
    };
  }
  return { ok: true, value };
}

export function normalizeTag(tag) {
  if (typeof tag !== 'string') return null;
  const trimmed = tag.trim();
  if (!trimmed || trimmed.length > TAG_MAX_LENGTH) return null;
  if (!TAG_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const result = [];
  for (const raw of tags) {
    const tag = normalizeTag(raw);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length >= TAG_MAX_COUNT) break;
  }
  return result;
}

export function normalizePriority(priority) {
  return PRIORITIES.includes(priority) ? priority : 'none';
}

export function normalizeDueDate(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !DUE_DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return value;
}

export function normalizeTheme(theme) {
  return THEMES.includes(theme) ? theme : 'system';
}

export function normalizeSort(sort) {
  return SORTS.includes(sort) ? sort : 'manual';
}

function nextOrder(items) {
  if (!items || items.length === 0) return 0;
  return Math.max(...items.map((item) => Number(item.order) || 0)) + 1;
}

function hasDuplicateProjectName(projects, name, exceptId = null) {
  const key = name.toLowerCase();
  return projects.some(
    (project) => project.id !== exceptId && project.name.toLowerCase() === key,
  );
}

export function createInboxProject(clock, id = createId()) {
  const now = toIso(clock);
  return {
    id,
    name: INBOX_NAME,
    createdAt: now,
    updatedAt: now,
    order: 0,
  };
}

export function createDefaultSettings(activeProjectId = 'all') {
  return {
    theme: DEFAULT_SETTINGS.theme,
    activeProjectId,
    filters: {
      status: DEFAULT_FILTERS.status,
      priorities: [],
      tags: [],
      due: DEFAULT_FILTERS.due,
      search: DEFAULT_FILTERS.search,
    },
    sort: DEFAULT_SETTINGS.sort,
  };
}

export function createEmptyState(clock) {
  const inbox = createInboxProject(clock);
  return {
    projects: [inbox],
    tasks: [],
    settings: createDefaultSettings(inbox.id),
  };
}

export function addProject(state, input = {}, clock) {
  const validated = validateProjectName(input.name);
  if (!validated.ok) {
    return { ok: false, error: validated.error, state };
  }
  if (hasDuplicateProjectName(state.projects, validated.value)) {
    return { ok: false, error: 'A project with this name already exists', state };
  }
  const now = toIso(clock);
  const project = {
    id: input.id ?? createId(),
    name: validated.value,
    createdAt: now,
    updatedAt: now,
    order: input.order ?? nextOrder(state.projects),
  };
  return {
    ok: true,
    project,
    state: {
      ...state,
      projects: [...state.projects, project],
    },
  };
}

export function updateProject(state, projectId, patch = {}, clock) {
  const index = state.projects.findIndex((project) => project.id === projectId);
  if (index === -1) {
    return { ok: false, error: 'Project not found', state };
  }
  const current = state.projects[index];
  const next = { ...current };

  if (patch.name !== undefined) {
    const validated = validateProjectName(patch.name);
    if (!validated.ok) {
      return { ok: false, error: validated.error, state };
    }
    if (hasDuplicateProjectName(state.projects, validated.value, projectId)) {
      return { ok: false, error: 'A project with this name already exists', state };
    }
    next.name = validated.value;
  }

  if (patch.order !== undefined) {
    next.order = Number(patch.order) || 0;
  }

  next.updatedAt = toIso(clock);
  const projects = state.projects.slice();
  projects[index] = next;
  return { ok: true, project: next, state: { ...state, projects } };
}

export function deleteProject(state, projectId, clock) {
  if (!state.projects.some((project) => project.id === projectId)) {
    return { ok: false, error: 'Project not found', state };
  }

  let projects = state.projects.filter((project) => project.id !== projectId);
  const tasks = state.tasks.filter((task) => task.projectId !== projectId);

  if (projects.length === 0) {
    projects = [createInboxProject(clock)];
  }

  let activeProjectId = state.settings.activeProjectId;
  if (activeProjectId === projectId) {
    activeProjectId = projects[0].id;
  }

  return {
    ok: true,
    state: {
      ...state,
      projects,
      tasks,
      settings: {
        ...state.settings,
        activeProjectId,
      },
    },
  };
}

function resolveProjectId(state, projectId) {
  if (projectId && state.projects.some((project) => project.id === projectId)) {
    return projectId;
  }
  const active = state.settings?.activeProjectId;
  if (active && active !== 'all' && state.projects.some((project) => project.id === active)) {
    return active;
  }
  return state.projects[0]?.id ?? null;
}

export function addTask(state, input = {}, clock) {
  const title = validateTaskTitle(input.title);
  if (!title.ok) {
    return { ok: false, error: title.error, state };
  }

  const notes = validateNotes(input.notes ?? '');
  if (!notes.ok) {
    return { ok: false, error: notes.error, state };
  }

  const projectId = resolveProjectId(state, input.projectId);
  if (!projectId) {
    return { ok: false, error: 'Project not found', state };
  }

  const now = toIso(clock);
  const task = {
    id: input.id ?? createId(),
    projectId,
    title: title.value,
    notes: notes.value,
    completed: false,
    priority: normalizePriority(input.priority),
    dueDate: normalizeDueDate(input.dueDate ?? null),
    tags: normalizeTags(input.tags ?? []),
    order: input.order ?? nextOrder(state.tasks),
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };

  return {
    ok: true,
    task,
    state: {
      ...state,
      tasks: [...state.tasks, task],
    },
  };
}

export function updateTask(state, taskId, patch = {}, clock) {
  const index = state.tasks.findIndex((task) => task.id === taskId);
  if (index === -1) {
    return { ok: false, error: 'Task not found', state };
  }

  const current = state.tasks[index];
  const next = { ...current };

  if (patch.title !== undefined) {
    const title = validateTaskTitle(patch.title);
    if (!title.ok) {
      return { ok: false, error: title.error, state };
    }
    next.title = title.value;
  }

  if (patch.notes !== undefined) {
    const notes = validateNotes(patch.notes);
    if (!notes.ok) {
      return { ok: false, error: notes.error, state };
    }
    next.notes = notes.value;
  }

  if (patch.projectId !== undefined) {
    if (!state.projects.some((project) => project.id === patch.projectId)) {
      return { ok: false, error: 'Project not found', state };
    }
    next.projectId = patch.projectId;
  }

  if (patch.priority !== undefined) {
    next.priority = normalizePriority(patch.priority);
  }

  if (patch.dueDate !== undefined) {
    next.dueDate = normalizeDueDate(patch.dueDate);
  }

  if (patch.tags !== undefined) {
    next.tags = normalizeTags(patch.tags);
  }

  if (patch.order !== undefined) {
    next.order = Number(patch.order) || 0;
  }

  if (patch.completed !== undefined && Boolean(patch.completed) !== current.completed) {
    next.completed = Boolean(patch.completed);
    next.completedAt = next.completed ? toIso(clock) : null;
  }

  next.updatedAt = toIso(clock);
  const tasks = state.tasks.slice();
  tasks[index] = next;
  return { ok: true, task: next, state: { ...state, tasks } };
}

export function addTagsToTask(state, taskId, tags, clock) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    return { ok: false, error: 'Task not found', state };
  }
  return updateTask(state, taskId, { tags: [...task.tags, ...(tags ?? [])] }, clock);
}

export function toggleTaskComplete(state, taskId, clock) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    return { ok: false, error: 'Task not found', state };
  }
  return updateTask(state, taskId, { completed: !task.completed }, clock);
}

export function deleteTask(state, taskId) {
  if (!state.tasks.some((task) => task.id === taskId)) {
    return { ok: false, error: 'Task not found', state };
  }
  return {
    ok: true,
    state: {
      ...state,
      tasks: state.tasks.filter((task) => task.id !== taskId),
    },
  };
}

export function updateSettings(state, patch = {}) {
  const current = state.settings ?? createDefaultSettings();
  const filtersPatch = patch.filters ?? {};
  const settings = {
    theme: normalizeTheme(patch.theme ?? current.theme),
    activeProjectId: patch.activeProjectId ?? current.activeProjectId ?? 'all',
    sort: normalizeSort(patch.sort ?? current.sort),
    filters: {
      status: STATUS_FILTERS.includes(filtersPatch.status)
        ? filtersPatch.status
        : STATUS_FILTERS.includes(current.filters?.status)
          ? current.filters.status
          : 'all',
      priorities: Array.isArray(filtersPatch.priorities)
        ? filtersPatch.priorities.filter((item) => PRIORITIES.includes(item))
        : Array.isArray(current.filters?.priorities)
          ? current.filters.priorities.slice()
          : [],
      tags: Array.isArray(filtersPatch.tags)
        ? normalizeTags(filtersPatch.tags)
        : Array.isArray(current.filters?.tags)
          ? current.filters.tags.slice()
          : [],
      due: DUE_FILTERS.includes(filtersPatch.due)
        ? filtersPatch.due
        : DUE_FILTERS.includes(current.filters?.due)
          ? current.filters.due
          : 'all',
      search:
        filtersPatch.search !== undefined
          ? String(filtersPatch.search)
          : current.filters?.search ?? '',
    },
  };

  if (
    settings.activeProjectId !== 'all' &&
    !state.projects.some((project) => project.id === settings.activeProjectId)
  ) {
    settings.activeProjectId = state.projects[0]?.id ?? 'all';
  }

  return { ok: true, state: { ...state, settings } };
}

export function isOverdue(task, clock) {
  if (!task || task.completed || !task.dueDate) return false;
  return task.dueDate < localYmd(clock);
}

export function isDueToday(task, clock) {
  if (!task || !task.dueDate) return false;
  return task.dueDate === localYmd(clock);
}

export function getDueStatus(task, clock) {
  if (!task || !task.dueDate) return null;
  if (isOverdue(task, clock)) return 'overdue';
  if (isDueToday(task, clock)) return 'today';
  return 'upcoming';
}
