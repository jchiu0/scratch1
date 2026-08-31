import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addProject,
  addTagsToTask,
  addTask,
  createEmptyState,
  deleteProject,
  deleteTask,
  isDueToday,
  isOverdue,
  normalizeTags,
  toggleTaskComplete,
  updateProject,
  validateProjectName,
  validateTaskTitle,
} from '../src/domain.js';

const FIXED_NOW = new Date('2024-06-15T12:00:00');
const clock = () => FIXED_NOW;

describe('task create/update/complete', () => {
  it('creating a title-only task yields priority none, dueDate null, tags [], completed false', () => {
    const state = createEmptyState(clock);
    const result = addTask(state, { title: '  Buy milk  ' }, clock);
    assert.equal(result.ok, true);
    assert.equal(result.task.title, 'Buy milk');
    assert.equal(result.task.priority, 'none');
    assert.equal(result.task.dueDate, null);
    assert.deepEqual(result.task.tags, []);
    assert.equal(result.task.completed, false);
    assert.equal(result.task.completedAt, null);
    assert.equal(result.task.notes, '');
    assert.equal(result.task.projectId, state.projects[0].id);
  });

  it('completing sets completedAt; uncompleting clears it', () => {
    const created = addTask(createEmptyState(clock), { title: 'Ship it' }, clock);
    const completed = toggleTaskComplete(created.state, created.task.id, clock);
    assert.equal(completed.ok, true);
    assert.equal(completed.task.completed, true);
    assert.equal(completed.task.completedAt, FIXED_NOW.toISOString());

    const reopened = toggleTaskComplete(completed.state, created.task.id, clock);
    assert.equal(reopened.task.completed, false);
    assert.equal(reopened.task.completedAt, null);
  });

  it('rejects empty titles and project names', () => {
    assert.equal(validateTaskTitle('   ').ok, false);
    assert.equal(validateProjectName('').ok, false);
    const state = createEmptyState(clock);
    assert.equal(addTask(state, { title: ' ' }, clock).ok, false);
    assert.equal(addProject(state, { name: '   ' }, clock).ok, false);
  });

  it('deletes a task by id', () => {
    const created = addTask(createEmptyState(clock), { title: 'Temp' }, clock);
    const deleted = deleteTask(created.state, created.task.id);
    assert.equal(deleted.ok, true);
    assert.equal(deleted.state.tasks.length, 0);
  });
});

describe('tags', () => {
  it('adding tags work and Work stores a single tag', () => {
    const created = addTask(createEmptyState(clock), { title: 'Tagged' }, clock);
    const added = addTagsToTask(created.state, created.task.id, ['work', 'Work'], clock);
    assert.equal(added.ok, true);
    assert.deepEqual(added.task.tags, ['work']);
    assert.deepEqual(normalizeTags(['  home ', 'HOME', 'home']), ['home']);
  });

  it('keeps first casing, trims, and caps at 10 unique tags', () => {
    const tags = [
      'one',
      ' two ',
      'TWO',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
      'eleven',
    ];
    assert.deepEqual(normalizeTags(tags), [
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
    ]);
  });
});

describe('projects', () => {
  it('deleting the last project recreates Inbox', () => {
    const initial = createEmptyState(clock);
    const inboxId = initial.projects[0].id;
    const withTask = addTask(initial, { title: 'Old inbox task', projectId: inboxId }, clock);
    const result = deleteProject(withTask.state, inboxId, clock);
    assert.equal(result.ok, true);
    assert.equal(result.state.projects.length, 1);
    assert.equal(result.state.projects[0].name, 'Inbox');
    assert.notEqual(result.state.projects[0].id, inboxId);
    assert.equal(result.state.tasks.length, 0);
    assert.equal(result.state.settings.activeProjectId, result.state.projects[0].id);
  });

  it('create, update, and delete extra projects', () => {
    const created = addProject(createEmptyState(clock), { name: 'Work' }, clock);
    assert.equal(created.state.projects.length, 2);
    const work = created.state.projects[1];
    const renamed = updateProject(created.state, work.id, { name: 'Office' }, clock);
    assert.equal(renamed.ok, true);
    assert.equal(renamed.project.name, 'Office');
    const deleted = deleteProject(renamed.state, work.id, clock);
    assert.equal(deleted.state.projects.length, 1);
    assert.equal(deleted.state.projects[0].name, 'Inbox');
  });
});

describe('due helpers', () => {
  it('overdue helper with a fixed yesterday date returns overdue only when incomplete', () => {
    const created = addTask(
      createEmptyState(clock),
      { title: 'Was due', dueDate: '2024-06-14' },
      clock,
    );
    assert.equal(isOverdue(created.task, clock), true);
    assert.equal(isDueToday(created.task, clock), false);

    const completed = {
      ...created.task,
      completed: true,
      completedAt: FIXED_NOW.toISOString(),
    };
    assert.equal(isOverdue(completed, clock), false);

    const today = { ...created.task, dueDate: '2024-06-15' };
    assert.equal(isOverdue(today, clock), false);
    assert.equal(isDueToday(today, clock), true);
  });
});
