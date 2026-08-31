# Implementation Plan

Ordered subtasks for the two library functions only. No persistence, CLI, classes, extra APIs, or third-party packages.

## Layout

- `task_tracker.py` — `add_task` and `complete_task`
- `test_task_tracker.py` — `unittest` coverage of AC-1 through AC-9

## Subtasks

### 1. Module skeleton

- Create `task_tracker.py` with `add_task(tasks, title)` and `complete_task(tasks, index)` stubs that raise `NotImplementedError`.
- Export only those two names. No classes, I/O, or CLI.

### 2. Tests for `add_task` (AC-1 through AC-4)

Write failing tests in `test_task_tracker.py`:

- AC-1: empty list, add Buy milk; list has one pending task; return value is the same dict as `tasks[0]`.
- AC-2: existing completed task is unchanged after adding a second task.
- AC-3: title with surrounding whitespace is stored stripped.
- AC-4: empty string and whitespace-only title raise `ValueError`; list unchanged.

### 3. Implement `add_task`

- Strip `title`; raise `ValueError` if empty.
- Append a dict with keys title and done=False in place.
- Return the new dict. Do not copy or replace `tasks`.

### 4. Tests for `complete_task` (AC-5 through AC-8)

Write failing tests:

- AC-5: complete index 1 of two pending tasks; only that task is done; return value is `tasks[1]`.
- AC-6: completing an already-done task leaves done True and does not raise.
- AC-7: index 1 on a one-element list and index -2 raise `IndexError`; list unchanged.
- AC-8: string 0, True, and 1.0 raise `TypeError`; list unchanged.

### 5. Implement `complete_task`

- Reject non-int indexes, including bool, with `TypeError`.
- Look up `tasks[index]`; let Python raise `IndexError` when out of range (including indexes that do not refer to an element; -1 may address the last item).
- Set done to True in place; return that dict. Idempotent if already done.

### 6. Scope check (AC-9)

- Confirm the module defines only the two functions.
- Confirm no file I/O, prints, argv parsing, or class definitions.
- Run unittest and fix only defects in these two functions.
