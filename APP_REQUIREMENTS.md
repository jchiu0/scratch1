# Task Tracker Library Requirements

Small Python library for tracking tasks via an importable API and a thin CLI. Not a web app.

## Goals

- Create, list, update, complete, and delete tasks with a typed Python API.
- Persist tasks to a local JSON file across process restarts.
- Provide a CLI for the same operations.
- Fail clearly on invalid input; never silently corrupt stored data.

## Non-goals

- Multi-user auth, sharing, or cloud sync.
- Recurring tasks, calendars, or notifications.
- Graphical or web UI.
- Third-party issue-tracker integrations.

## Task model

- id: UUID4 string, assigned by the library, immutable.
- title: required string, non-empty after strip, max 200 chars.
- description: optional string, default empty, max 4000 chars.
- status: todo, in_progress, or done. Default todo.
- priority: low, medium, or high. Default medium.
- tags: unique case-sensitive strings; each 1-32 chars matching A-Za-z0-9, underscore, or hyphen.
- due: YYYY-MM-DD or null.
- created_at: UTC ISO-8601 datetime, set on create, immutable.
- updated_at: UTC ISO-8601 datetime, set on create and every mutation.

Store file default path is ./tasks.json with JSON object version 1 and a tasks array.

## Functional requirements

FR-1 Create: add_task(title, description, priority, tags, due) returns Task. Invalid fields raise ValueError. Persist immediately.

FR-2 Read: list_tasks with optional status, priority, and tag filters returns matching tasks sorted by created_at ascending. Filters combine with AND. get_task(task_id) raises KeyError if missing.

FR-3 Update: update_task allows title, description, status, priority, tags, due. Unknown fields raise TypeError. Missing id raises KeyError. Refresh updated_at only; id and created_at cannot change.

FR-4 Complete/delete: complete_task sets status to done and is idempotent. delete_task removes the task. Missing id raises KeyError.

FR-5 Persistence: load store on init; missing file starts empty and is created on first write. Writes are atomic via temp file then replace. Corrupt or unsupported version raises StorageError and must not overwrite the file.

FR-6 CLI (exit 0 success, 1 user/validation error, 2 storage error):

- tasktracker add TITLE with optional description, priority, tag, due
- tasktracker list with optional status, priority, tag
- tasktracker show ID
- tasktracker update ID with optional title, description, status, priority, due, tag
- tasktracker done ID
- tasktracker delete ID

list prints one line per task: id status priority title. show prints all fields one per line. Global --store PATH overrides the default file.

## Quality

- Python 3.11+, typed public API, no required third-party runtime deps.
- Package as src/tasktracker with pyproject.toml.
- Tests for CRUD, filters, validation, missing ids, and corrupt store.

## Acceptance criteria

1. add_task returns a UUID id, writes tasks.json, and a new TaskStore loading that file returns the same task.
2. Empty title, invalid priority, and invalid due date each raise ValueError and leave the store unchanged.
3. list_tasks with status todo and tag work returns only matching tasks ordered by created_at.
4. update_task changes only requested fields plus updated_at; get_task after reload shows the change.
5. complete_task sets status to done; a second call succeeds and stays done.
6. After delete_task, get_task raises KeyError and other tasks are untouched.
7. get_task, update_task, complete_task, and delete_task raise KeyError for unknown ids.
8. Truncated or invalid JSON raises StorageError on load and the file is not overwritten.
9. If a write is interrupted, the original tasks.json remains valid previous-version JSON.
10. CLI add Ship docs with priority high and tag docs then list by tag docs prints a line containing Ship docs and exits 0.
11. CLI show of an unknown id exits 1 and prints an error to stderr, not a traceback.
12. pip install makes import tasktracker and the tasktracker console script available.
