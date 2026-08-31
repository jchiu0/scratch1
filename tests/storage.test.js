import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addProject,
  addTask,
  createEmptyState,
} from '../src/domain.js';
import {
  STORAGE_KEY,
  applyStorageEvent,
  createPersistence,
  deserializeState,
  loadState,
  saveState,
  serializeState,
} from '../src/storage.js';

const FIXED_NOW = new Date('2024-06-15T12:00:00');
const clock = () => FIXED_NOW;

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
  };
}

function sampleState() {
  let { state } = addProject(createEmptyState(clock), { name: 'Work' }, clock);
  const work = state.projects[1];
  const first = addTask(
    state,
    {
      title: 'Buy milk',
      projectId: state.projects[0].id,
      priority: 'high',
      dueDate: '2024-06-16',
      tags: ['home'],
      notes: '2%',
    },
    clock,
  );
  state = first.state;
  const second = addTask(
    state,
    {
      title: 'Write docs',
      projectId: work.id,
      tags: ['work'],
    },
    clock,
  );
  return second.state;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('serialize/deserialize', () => {
  it('round-trip of sample projects and tasks restores fields including order', () => {
    const original = sampleState();
    const json = serializeState(original);
    const loaded = deserializeState(json, clock);
    assert.equal(loaded.ok, true);
    assert.equal(loaded.state.projects.length, original.projects.length);
    assert.equal(loaded.state.tasks.length, original.tasks.length);
    assert.deepEqual(
      loaded.state.projects.map((project) => ({
        id: project.id,
        name: project.name,
        order: project.order,
      })),
      original.projects.map((project) => ({
        id: project.id,
        name: project.name,
        order: project.order,
      })),
    );
    assert.deepEqual(
      loaded.state.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        priority: task.priority,
        dueDate: task.dueDate,
        tags: task.tags,
        notes: task.notes,
        completed: task.completed,
        order: task.order,
      })),
      original.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        priority: task.priority,
        dueDate: task.dueDate,
        tags: task.tags,
        notes: task.notes,
        completed: task.completed,
        order: task.order,
      })),
    );
  });

  it('corrupt JSON loads default Inbox state without throwing', () => {
    const loaded = deserializeState('{not json', clock);
    assert.equal(loaded.ok, true);
    assert.equal(loaded.recovered, true);
    assert.equal(loaded.state.projects.length, 1);
    assert.equal(loaded.state.projects[0].name, 'Inbox');
    assert.equal(loaded.state.tasks.length, 0);
    assert.doesNotThrow(() => deserializeState(undefined, clock));
    assert.doesNotThrow(() => loadState(memoryStorage({ [STORAGE_KEY]: '!!!' }), clock));
  });

  it('missing optional fields get documented defaults', () => {
    const payload = JSON.stringify({
      version: 1,
      projects: [{ id: 'p1', name: 'Inbox' }],
      tasks: [{ id: 't1', projectId: 'p1', title: 'Bare' }],
    });
    const loaded = deserializeState(payload, clock);
    const task = loaded.state.tasks[0];
    assert.equal(task.priority, 'none');
    assert.equal(task.dueDate, null);
    assert.deepEqual(task.tags, []);
    assert.equal(task.completed, false);
    assert.equal(task.completedAt, null);
    assert.equal(task.notes, '');
    assert.equal(typeof task.order, 'number');
    assert.equal(loaded.state.settings.theme, 'system');
    assert.equal(loaded.state.settings.sort, 'manual');
    assert.equal(loaded.state.settings.filters.status, 'all');
    assert.equal(loaded.state.settings.filters.due, 'all');
    assert.equal(loaded.state.settings.filters.search, '');
    assert.deepEqual(loaded.state.settings.filters.priorities, []);
    assert.deepEqual(loaded.state.settings.filters.tags, []);
  });

  it('QuotaExceededError is catchable by the caller rather than crashing', () => {
    const store = {
      getItem() {
        return null;
      },
      setItem() {
        const error = new Error('quota');
        error.name = 'QuotaExceededError';
        error.code = 22;
        throw error;
      },
    };
    assert.throws(
      () => saveState(createEmptyState(clock), store),
      (error) => error.name === 'QuotaExceededError',
    );
  });

  it('cross-tab storage events merge without corrupting state', () => {
    const current = sampleState();
    const ignored = applyStorageEvent({ key: 'other', newValue: '{}' }, current, clock);
    assert.equal(ignored.changed, false);
    assert.equal(ignored.state, current);

    const remote = addTask(createEmptyState(clock), { title: 'From other tab' }, clock).state;
    const applied = applyStorageEvent(
      { key: STORAGE_KEY, newValue: serializeState(remote) },
      current,
      clock,
    );
    assert.equal(applied.changed, true);
    assert.equal(applied.state.tasks[0].title, 'From other tab');

    const recovered = applyStorageEvent(
      { key: STORAGE_KEY, newValue: '{bad' },
      current,
      clock,
    );
    assert.equal(recovered.state.projects[0].name, 'Inbox');
  });

  it('debounces writes at or below 300ms', async () => {
    const writes = [];
    const store = {
      getItem() {
        return null;
      },
      setItem(key, value) {
        writes.push({ key, value });
      },
    };
    const persistence = createPersistence({
      storage: store,
      clock,
      debounceMs: 20,
      listen: false,
    });
    persistence.write(createEmptyState(clock));
    persistence.write(sampleState());
    assert.equal(writes.length, 0);
    await delay(40);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].key, STORAGE_KEY);
    const loaded = deserializeState(writes[0].value, clock);
    assert.equal(loaded.state.tasks.length, 2);
    persistence.dispose();
  });
});
