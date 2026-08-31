# Evaluation: task_tracker.py vs APP_REQUIREMENTS.md

Implementation was not modified. Review is static against FR-1–FR-3, NFRs, and AC-1–AC-9.

## Module shape (AC-9, out of scope, NFRs)

`task_tracker.py` defines only `add_task` and `complete_task`. No classes, imports, I/O, CLI, argv parsing, persistence, or third-party dependencies. Python 3.9+ compatible. Caller owns the list; mutations are in place.

**Result: pass**

## FR-1 / task representation

Tasks are `dict` values with `title` (`str`) and `done` (`bool`) on a caller-provided `list`. `add_task` appends; `complete_task` mutates the existing dict. No copy or replacement of the collection.

**Result: pass**

## FR-2 / AC-1–AC-4 `add_task`

- Strips `title`, rejects empty/whitespace-only with `ValueError` before mutation (AC-4).
- Appends `{"title": stripped, "done": False}` in place and returns that dict (AC-1, AC-3).
- Does not rewrite existing elements (AC-2).

**Result: pass**

## FR-3 / AC-5–AC-8 `complete_task`

- Rejects non-`int` indexes, including `bool` (subclass of `int`) and `float`, with `TypeError` before lookup (AC-8).
- Uses `tasks[index]`; out-of-range indexes such as `1` on a one-element list and `-2` raise `IndexError` with no mutation (AC-7). `-1` may address the last item, matching the AC-7 note.
- Sets `done` to `True` in place and returns that dict (AC-5). Already-done tasks stay `True` with no error (AC-6).

**Result: pass**

## Final result

All requirements and acceptance criteria are met.

**PASS**
