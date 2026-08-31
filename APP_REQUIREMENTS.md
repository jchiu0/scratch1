# APP_REQUIREMENTS.md

Polished static TODO web app with projects, priorities, due dates, tags, filtering, drag-and-drop ordering, dark mode, localStorage persistence, a responsive accessible UI, and tests.

## 1. Summary

Single-page static TODO app with no backend. Users manage tasks in projects, set priority, due date, and tags, reorder by drag, filter and search, persist in localStorage, and toggle light/dark/system theme. UI is polished, responsive, and accessible. Tests cover core behavior.

## 2. Constraints

- HTML/CSS/JS or static-build SPA only. No required API.
- Persist only in localStorage. Offline after first load.
- No auth, sync, or cloud backup in v1.
- Desktop and mobile. Tests run without a backend.

## 3. Data model

### Project

- id (string): unique, app-generated
- name (string): required, trimmed, 1-80 chars
- createdAt / updatedAt: ISO-8601
- order (number, optional)

Always at least one project. Deleting the last recreates Inbox.

### Task

- id (string): unique
- projectId (string): must exist
- title (string): required, trimmed, 1-200 chars
- notes (string): optional, max 2000
- completed (boolean): default false
- priority: none | low | medium | high
- dueDate: YYYY-MM-DD or null
- tags (string[]): case-insensitive unique, 1-24 chars each, max 10; letters, numbers, hyphen, underscore, space
- order (number): manual sort key
- createdAt / updatedAt: ISO-8601
- completedAt: ISO-8601 or null; set on complete, cleared on reopen

### Settings

- theme: light | dark | system
- activeProjectId: project id or all
- filters: see section 4.6
- sort: default manual; optional dueDate, priority, title

## 4. Functional requirements

### 4.1 Projects

Create, rename, delete, switch project or All projects. Delete requires confirm and removes that project's tasks. Case-insensitive duplicate names rejected with inline error. Active project persists.

Acceptance:

- First load with empty storage shows selected Inbox.
- Confirmed delete removes its tasks; UI selects another project or new Inbox.
- Rename updates sidebar and task project labels immediately.

### 4.2 Tasks

Add with required title and optional notes, project, priority, due date, tags. Edit inline or in a panel. Checkbox toggles complete; completed stay visible unless filtered. Delete uses confirm dialog OR undo toast within 5s. Empty title cannot save; field invalid and focused.

Acceptance:

- Title-only create stores priority=none, dueDate=null, tags=[], completed=false.
- Complete sets completed=true and completedAt; uncomplete clears completedAt.
- Reload restores all fields including order.

### 4.3 Priorities

Visible as label/badge/icon with text, not color-only. Filter/sort per 4.6.

Acceptance:

- Priority change updates badge immediately and persists.
- High incomplete tasks distinct from low/none with a non-color cue.

### 4.4 Due dates

Set/change/clear via date input. Store YYYY-MM-DD; display local human format. Incomplete past due = Overdue. Due today = Due today. Completed never overdue.

Acceptance:

- Incomplete task due yesterday shows Overdue; completing removes it.
- Clearing due date removes labels and stores null.

### 4.5 Tags

Add/remove; Enter or comma commits. Case-insensitive dupes ignored. Clicking a tag filters to it. Filter list shows used tags.

Acceptance:

- Adding work and Work yields one tag.
- Filter home shows only tasks with home (case-insensitive).
- Removing last use of a tag drops it from the tag filter list.

### 4.6 Filtering and search

AND combination:

- Project: one or all
- Status: all | active | completed
- Priority: any subset or all
- Tag: task must include every selected tag
- Due: all | overdue | today | upcoming | none
- Search: case-insensitive substring on title, notes, tags

Clear-all-filters control. Active filters visible. Empty filter state explains hidden tasks and offers clear.

Acceptance:

- Among active-high, completed-low, active-overdue, Status=active AND Priority=high shows only the first.
- Query milk matches title Buy milk and tag milk.
- Clear filters restores the current project list.

### 4.7 Drag-and-drop

Pointer reorder plus keyboard Move up/down. Persist order. Ignore drag when sort is not manual. Accessible move actions on each task.

Acceptance:

- Drag A above B; A stays above B after drop and reload.
- Keyboard Move up swaps with previous visible task.
- Hidden tasks keep stored order when filtering/completing.

### 4.8 Theme

Light, Dark, System (prefers-color-scheme). Persist choice. Apply before/with first paint (no light flash in dark). Readable contrast both themes.

Acceptance:

- Dark survives reload and other tabs.
- System follows OS changes where supported.
- Text, borders, controls visible in both themes.

### 4.9 Persistence

Namespaced key e.g. todo-app:v1. Payload: projects, tasks, settings, version. Bad JSON/schema loads defaults without crash. Write after each mutation (debounce <= 300ms ok). Cross-tab storage must not corrupt.

Acceptance:

- Create data, refresh: same data and selection.
- Corrupt JSON: recoverable default UI, not a blank crash.
- Rapid mutations: last write wins, database intact.

### 4.10 Empty and errors

First visit: Inbox + hint Add your first task. No filter matches: empty state + clear. QuotaExceededError: non-blocking banner; UI keeps data.

## 5. UI / UX

Desktop >=768px: sidebar (projects, tags, filters) + main list. Mobile: list first; projects/filters in drawer/disclosure/tabs; no horizontal scroll. Header: name, theme, add task. Add control reachable without scroll on desktop.

Polish: spacing scale, type hierarchy, focus rings, hover/focus/active. Rows show title, priority, due/overdue, tags, complete; notes if present. Transitions <=200ms; no animation if prefers-reduced-motion: reduce.

Responsive acceptance:

- 320px: primary actions reachable, no overlap.
- 768px and 1280px: sidebar visible; titles wrap.
- Complete/delete/add targets >= 40x40 CSS px.

## 6. Accessibility

One h1, heading order, landmarks banner/navigation/main. Tab to all controls with visible focus. Labels on fields. Checkbox name includes task title. Keyboard reorder besides drag. Color not sole cue. WCAG 2.2 AA contrast both themes. aria-live for add/delete/complete. Dialogs: focus trap, Escape, restore focus. Icon alternatives.

Acceptance:

- Keyboard-only: create, complete, filter by project, delete.
- Row accessible name includes title and completion.
- Reduced motion: drag works, transitions off.

## 7. Technical

index.html at root or documented dist/ build. No required network at runtime. Semantic HTML, organized CSS, JS modules ok. Unique DOM ids. No secrets.

## 8. Tests

Documented command e.g. npm test. Runner: Vitest, Jest, Playwright, Cypress, or equivalent. No remote server.

Unit/integration must cover:

1. Create/update/delete project and task
2. Filter+search combinations
3. Move up/down and drop index update order stably
4. Serialize/deserialize round-trip and missing-field defaults
5. Overdue/due-today with injectable clock
6. Tag trim and case-insensitive unique

UI/e2e must cover:

1. Add task, reload or mock localStorage, still visible
2. Toggle complete
3. Apply and clear filter
4. Theme class/data-theme persists
5. Keyboard add or complete without pointer

Due-date tests use fixed clock/locale. Optional axe: no critical on main page.

## 9. Non-functional

App shell on first paint (no long blank page). 200 tasks remain usable; debounce search >=150ms if needed. No console errors on happy path.

## 10. Out of scope

Accounts, sync, sharing, recurrence, notifications, attachments, rich text, subtasks, full i18n, required service worker.

## 11. Definition of done

1. Projects/tasks with priority, due date, tags work in-browser.
2. Filter, search, drag-and-drop plus keyboard reorder persist across reload.
3. Light/dark/system persist with no wrong-theme flash.
4. Responsive 320-1280px+ and a11y acceptance met.
5. localStorage round-trip; corrupt data does not crash.
6. Section 8 tests pass.
7. README documents open/build and test commands.
