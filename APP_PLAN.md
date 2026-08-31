# Task Tracker Implementation Plan

Ordered implementation and test subtasks for APP_REQUIREMENTS.md. Do not implement the application in this step.

## 0. Packaging skeleton

0.1 Create pyproject.toml for Python 3.11+, src layout, package name tasktracker, no runtime third-party deps. Declare console script tasktracker. Add src/tasktracker package init plus placeholder modules: models, store, cli, errors.

0.2 Add tests directory with a tmp-path store fixture so tests never touch the default tasks.json. Smoke test that the package imports.

Done when pip install works and import tasktracker succeeds (AC-12 partial).

## 1. Domain model and validation

1.1 Implement StorageError in errors.py as a distinct Exception subclass.

Tests: catchable independently of ValueError, KeyError, and TypeError.

1.2 Implement Task with id, title, description, status, priority, tags, due, created_at, updated_at. Status values: todo, in_progress, done. Priority values: low, medium, high. Add to_dict and from_dict for JSON (ISO-8601 datetimes, due as YYYY-MM-DD or null).

Tests: dict round-trip preserves fields; unknown status or priority rejected.

1.3 Centralize validators for create and update. Title: strip, non-empty, max 200. Description: max 4000, default empty. Status and priority: allowed sets only. Tags: unique, case-sensitive, each 1-32 chars matching letters, digits, underscore, hyphen. Due: YYYY-MM-DD or None; reject 01-02-2025. Invalid values raise ValueError.

Tests (AC-2): empty or whitespace title, priority urgent, due 01-02-2025, overlong fields, bad tags.

## 2. Persistence

2.1 TaskStore with path default tasks.json. Missing file: empty in-memory list; do not create file until first write. Present file: parse JSON version 1 and tasks array. Unsupported version, malformed JSON, or missing keys raise StorageError and do not write.

Tests (AC-8): missing file starts empty; truncated JSON, non-object JSON, and wrong version raise StorageError and leave file bytes unchanged.

2.2 Atomic write: serialize version 1 JSON, write a temp file in the same directory, then replace onto the target. On failure the original file stays valid.

Tests (AC-9): successful write is valid JSON; leftover temp file does not corrupt tasks.json.

## 3. TaskStore API

3.1 add_task returns Task. Assign UUID4 id, status todo, UTC created_at and updated_at. Keyword args: description default empty, priority default medium, tags default None, due default None. Validate then persist. Validation failure leaves store unchanged.

Tests (AC-1, AC-2): UUID id; a new TaskStore on the same path returns the same task; invalid inputs raise ValueError and do not write.

3.2 get_task raises KeyError if missing. list_tasks with optional status, priority, and tag AND-filters and sorts by created_at ascending.

Tests (AC-3, AC-7): unknown id KeyError; status todo and tag work return only matches in created order; no filters returns all.

3.3 update_task allows title, description, status, priority, tags, due. Unknown keyword TypeError. Missing id KeyError. Re-validate; refresh updated_at only; id and created_at unchanged. Persist; validation failure leaves store unchanged.

Tests (AC-4, AC-7): title/status change visible after reload; updated_at increases; unknown field TypeError; unknown id KeyError.

3.4 complete_task sets status done, persists, and is idempotent. delete_task removes and persists; missing id KeyError.

Tests (AC-5, AC-6, AC-7): first complete sets done; second succeeds and stays done; delete then get_task KeyError and siblings remain; unknown ids KeyError.

3.5 Re-export Task, TaskStore, StorageError from tasktracker. Type-annotate public API.

Tests: importing TaskStore, Task, and StorageError from tasktracker works.

## 4. CLI

4.1 python -m tasktracker and console script tasktracker call main(argv) returning int. Global --store PATH default ./tasks.json. Subcommands: add, list, show, update, done, delete. Repeatable --tag on add and update.

Tests: --help exits 0; missing subcommand exits 1 without traceback.

4.2 Map subcommands to TaskStore. list: one line id status priority title. show: all fields one per line. Exit 0 success; 1 on ValueError, KeyError, TypeError, or argparse errors (stderr, no traceback); 2 on StorageError.

Tests (AC-10, AC-11): add Ship docs with priority high and tag docs, then list by tag docs, prints Ship docs and exits 0; show unknown id exits 1 with stderr and no traceback. Cover done, delete, and validation exit 1.

4.3 Wire project.scripts and __main__.py.

Tests (AC-12): import tasktracker and console script metadata available.

## 5. Acceptance sweep

5.1 Re-run the suite mapped to AC 1-12: persist, validation, filters, update, complete, delete, missing ids, corrupt store, atomic write, CLI round-trip, CLI errors, packaging.

5.2 Fill gaps: tag uniqueness, AND filters, StorageError CLI exit 2, no third-party runtime imports, public API annotations.

## Checklist order

1. Packaging and test harness (0.1-0.2)
2. Errors, Task model, validators (1.1-1.3)
3. Store load and atomic save (2.1-2.2)
4. add_task (3.1)
5. get_task and list_tasks (3.2)
6. update_task (3.3)
7. complete_task and delete_task (3.4)
8. Public exports (3.5)
9. CLI parse, commands, exit codes (4.1-4.2)
10. Entry points (4.3)
11. Acceptance sweep (5.1-5.2)
