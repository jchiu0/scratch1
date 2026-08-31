# Evaluation: task_tracker.py vs APP_REQUIREMENTS.md

Reviewed `task_tracker.py` against every functional requirement, non-functional requirement, and acceptance criterion. No code changes were required.

## Module under review

Two functions only: `add_task(tasks, title)` and `complete_task(tasks, index)`.
No classes, I/O, CLI, persistence, or third-party imports.

## Functional requirements

### FR-1 Task collection representation — pass

Caller owns a `list` of `dict` values. Each new task is `{"title": str, "done": bool}`. The library appends or mutates in place and does not replace the list.

### FR-2 `add_task` — pass

- Strips `title` and stores the stripped value.
- Raises `ValueError` when the stripped title is empty.
- Appends `{"title": stripped, "done": False}` in place.
- Returns the new task dict (same object as `tasks[-1]`).
- Does not touch existing elements.

### FR-3 `complete_task` — pass

- Rejects non-`int` indexes, including `bool` (`True`/`False` are `int` subclasses), with `TypeError`.
- Uses `tasks[index]`, so Python raises `IndexError` when the index does not refer to an element (`1` on a one-item list, `-2` on a one-item list). Index `-1` may address the last item, matching AC-7.
- Sets `done` to `True` on that dict in place and returns it.
- Already-done tasks stay `True` with no error.

## Non-functional requirements — pass

Python 3.9+ syntax only, no third-party packages, no I/O, in-place mutation of the caller-owned list.

## Acceptance criteria

| ID | Check | Result |
|----|--------|--------|
| AC-1 | Empty list, add `"Buy milk"` → one pending task; return value is `tasks[0]` | pass |
| AC-2 | Existing completed task unchanged after a second add | pass |
| AC-3 | Surrounding whitespace stripped from title | pass |
| AC-4 | `""` and whitespace-only title raise `ValueError`; list unchanged (raise happens before `append`) | pass |
| AC-5 | Complete index `1` of two pending tasks; only that task done; return is `tasks[1]` | pass |
| AC-6 | Completing an already-done task is idempotent | pass |
| AC-7 | Out-of-range `1` and `-2` raise `IndexError`; list unchanged | pass |
| AC-8 | `"0"`, `True`, `1.0` raise `TypeError` before lookup; list unchanged | pass |
| AC-9 | Module exposes only the two functions; no files, prints, argv, or classes | pass |

## Issues found

None. Behavior matches the requirements as written. Non-string `title` is unspecified and left to raise `AttributeError` from `.strip()`, which is acceptable.

## Final result

**Compliant.** `task_tracker.py` satisfies APP_REQUIREMENTS.md. No fixes applied.
