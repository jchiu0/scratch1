# Task Tracker Library Requirements

Minimal in-memory Python task-tracker library. Scope is limited to two functions: `add_task` and `complete_task`.

## Out of Scope

- Persistence (files, databases, serialization)
- CLI or any user interface
- Classes, objects, or custom types for tasks
- External dependencies (standard library only if needed; prefer none)
- Editing, deleting, listing, filtering, or reordering tasks beyond what the two functions require
- Validation of uniqueness, timestamps, IDs, priorities, or assignees

## Functional Requirements

### FR-1: Task collection representation

- Tasks are stored as a Python `list` of `dict` values passed in by the caller.
- Each task dict has:
  - `title` (`str`): the task description
  - `done` (`bool`): completion status
- The library does not own or copy the collection except as needed to append or mutate in place.

### FR-2: `add_task(tasks, title)`

- Appends a new task `{"title": title, "done": False}` to `tasks`.
- Mutates `tasks` in place.
- Returns the new task dict.
- `title` must be a non-empty string after stripping whitespace; otherwise raise `ValueError`.
- The stored title is the stripped string.
- Does not modify existing tasks.

### FR-3: `complete_task(tasks, index)`

- Marks the task at `index` as done by setting `done` to `True`.
- Mutates that task dict in place.
- Returns the updated task dict.
- `index` is a 0-based integer into `tasks`.
- Raise `IndexError` if `index` is out of range.
- Raise `TypeError` if `index` is not an `int` (bool is not accepted).
- Completing an already-done task is idempotent: `done` remains `True` and no error is raised.

## Non-Functional Requirements

- Python 3.9+ compatible.
- No third-party packages.
- No I/O.
- Pure functions over a caller-owned list (in-place mutation only).

## Acceptance Criteria

### AC-1: Add a task

Given `tasks = []`
When `result = add_task(tasks, "Buy milk")`
Then `tasks == [{"title": "Buy milk", "done": False}]`
And `result is tasks[0]`
And `result["done"] is False`

### AC-2: Add preserves existing tasks

Given `tasks = [{"title": "A", "done": True}]`
When `add_task(tasks, "B")`
Then `len(tasks) == 2`
And `tasks[0] == {"title": "A", "done": True}`
And `tasks[1] == {"title": "B", "done": False}`

### AC-3: Title is stripped

Given `tasks = []`
When `add_task(tasks, "  Write tests  ")`
Then `tasks[0]["title"] == "Write tests"`

### AC-4: Empty or whitespace-only title is rejected

Given any `tasks` list
When `add_task(tasks, "")` or `add_task(tasks, "   ")`
Then `ValueError` is raised
And `tasks` is unchanged

### AC-5: Complete a pending task

Given `tasks = [{"title": "A", "done": False}, {"title": "B", "done": False}]`
When `result = complete_task(tasks, 1)`
Then `tasks[1]["done"] is True`
And `tasks[0]["done"] is False`
And `result is tasks[1]`

### AC-6: Complete is idempotent

Given `tasks = [{"title": "A", "done": True}]`
When `complete_task(tasks, 0)`
Then `tasks[0]["done"] is True`
And no exception is raised

### AC-7: Out-of-range index is rejected

Given `tasks = [{"title": "A", "done": False}]`
When `complete_task(tasks, 1)` or `complete_task(tasks, -2)`
Then `IndexError` is raised
And `tasks` is unchanged

Note: `index == -1` may resolve to the last item via normal Python list indexing; only indexes that do not refer to an existing element raise `IndexError`.

### AC-8: Non-integer index is rejected

Given any `tasks` list
When `complete_task(tasks, "0")` or `complete_task(tasks, True)` or `complete_task(tasks, 1.0)`
Then `TypeError` is raised
And `tasks` is unchanged

### AC-9: No persistence or CLI

The library module exposes only `add_task` and `complete_task`.
It does not read or write files, print output, parse argv, or define classes.
