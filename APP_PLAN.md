# Recipe Collector — Implementation Plan

Ordered subtasks to implement v1 against `APP_REQUIREMENTS.md`. Each subtask is independently verifiable (done / not done) without needing later work to interpret the check. Later subtasks may depend on earlier ones; do not skip ahead if a dependency is listed.

**Stack default:** static HTML/CSS/JS (no build step) with `localStorage` persistence. Document the choice in README when the app is runnable. Swap to a framework only if it does not change these acceptance checks.

**Out of scope (do not implement):** auth, sharing, URL scrape, nutrition, unit conversion, file uploads, shopping lists, meal planning.

---

## 0. Repo bootstrap

**Depends on:** nothing.

**Work:**

- Add app entry (`index.html`) and a documented start path (open file or a static server).
- Add `README.md` install/start steps (NFR-5).
- State in README: v1 is a single local collection, not private/multi-user (NFR-3).
- State browser support: latest two Chrome/Firefox/Safari/Edge; no IE11 (NFR-4).

**Verify:**

- [ ] Fresh clone/open of the repo shows how to run the app in README.
- [ ] Following those steps shows a blank or empty app page (no crash).
- [ ] README mentions local-only storage and that data is not multi-user private.

---

## 1. Recipe data model and validation (pure logic)

**Depends on:** 0 (file location only).

**Work:**

- Implement a recipe shape matching FR-1: `id`, `title`, `description`, `servings`, `prepTimeMinutes`, `cookTimeMinutes`, `ingredients[]` (`name`, `quantity`, `unit`), `steps[]`, `tags[]`, `notes`, `imageUrl`, `createdAt`, `updatedAt`.
- Implement `validateRecipe(input)` that:
  - Trims `title`; rejects empty or length outside 1–120.
  - Rejects missing ingredients or any ingredient without `name` 1–200 chars.
  - Rejects missing steps or any empty/whitespace-only step.
  - Caps `description` at 1000 and `notes` at 2000.
  - If `servings` present, requires integer 1–100.
  - If times present, requires non-negative integers.
  - Normalizes tags: trim, lowercase, unique, max 20.
  - Does not require `imageUrl`; if present, may warn on invalid URL but validation of other fields still passes (UX-4).
- Implement `createRecipeRecord(input)` that assigns `id` (UUID), `createdAt`, `updatedAt` (ISO-8601).
- Implement `applyRecipeUpdate(existing, input)` that preserves `id` and `createdAt`, sets new `updatedAt`.

**Verify:**

- [ ] Valid minimal recipe (title + 1 ingredient + 1 step) passes validation.
- [ ] Blank/whitespace title fails; error identifies title.
- [ ] Zero ingredients or zero steps fails.
- [ ] Duplicate tags `Lunch` and `lunch` store as one tag `lunch`.
- [ ] Create sets id/createdAt/updatedAt; update changes updatedAt only (id and createdAt unchanged).
- [ ] These checks can be run via a small unit/manual console test without the UI.

---

## 2. Persistence layer

**Depends on:** 1.

**Work:**

- Storage key for the recipe list in `localStorage` (or IndexedDB; if so, same API).
- API: `listRecipes()`, `getRecipe(id)`, `saveRecipe(record)`, `deleteRecipe(id)`.
- `listRecipes()` returns all records sorted by `updatedAt` descending (FR-3).
- Quota / write failure surfaces a thrown or returned error with a user-safe message: “Couldn't save your recipe. Try again.” (UX-4, FR-8).
- Malformed JSON on read: do not throw uncaught; skip bad records or show a recovery message (NFR-2).

**Verify:**

- [ ] Save then `listRecipes()` returns the record.
- [ ] Reload simulation (re-read storage) returns the same record (FR-8).
- [ ] `getRecipe` unknown id returns null/undefined, not a throw.
- [ ] `deleteRecipe` removes the record; subsequent list/get do not include it.
- [ ] Hand-corrupted storage value does not crash script evaluation; app can still load.

---

## 3. App shell, routes, and page titles

**Depends on:** 0.

**Work:**

- Screens: Collection (`/`), Detail (`/recipes/:id`), Create (`/recipes/new`), Edit (`/recipes/:id/edit`) — hash or History API both OK (FR-9).
- Every screen has a single action back to Collection (home link).
- Browser back works for detail → list and edit → detail (or list).
- Document title or visible H1: “Recipes”, recipe title, “New recipe”, “Edit {title}” (FR-9).

**Verify:**

- [ ] Visiting the app root shows Collection.
- [ ] Navigating to Create and using the collection link returns to Collection in one action.
- [ ] From a detail URL, browser Back returns to Collection.
- [ ] Unknown path does not white-screen; user can reach Collection.
- [ ] Visible heading or `document.title` matches the current screen.

---

## 4. Collection empty state and layout shell

**Depends on:** 2, 3.

**Work:**

- Collection view: if zero recipes, show “No recipes yet” and primary “Add your first recipe” (FR-3, UX-4).
- Primary control also available as “New recipe” when the list is non-empty (FR-2).
- Responsive shell: usable 360px–1440px; under 640px single column (UX-1).
- Text/control contrast AA (UX-3).

**Verify:**

- [ ] Empty storage → empty copy + CTA visible; CTA opens Create.
- [ ] At ~360px width, no horizontal scroll on Collection.
- [ ] New recipe control is keyboard reachable and labeled (UX-3).

---

## 5. Create recipe form

**Depends on:** 1, 2, 3, 4.

**Work:**

- Form fields for all editable FR-1 fields; `id` / `createdAt` / `updatedAt` not shown as inputs.
- Visible `<label>` for every field (UX-3).
- Ingredients and steps: add / remove / reorder; support ≥ 20 lines each (FR-2).
- Tags: free-text entry; stored normalized per task 1.
- Client validation on submit using task 1; field-level errors; no write on failure (FR-2).
- Save disabled or in-progress during write; double-submit does not duplicate (UX-2).
- Success: persist via task 2, then navigate to Detail for the new id (FR-2).
- Cancel/back: if dirty, confirm discard; if confirmed, no save (FR-2).
- Invalid `imageUrl`: warn optional; other fields still save (UX-4).

**Verify:**

- [ ] Submit blank title + no ingredients/steps → no new record; errors next to those fields (e2e #6).
- [ ] Title “Tomato Soup”, ingredient name “tomatoes”, step “Simmer” → save succeeds; detail URL for new id (e2e #1).
- [ ] Storage contains the record after save; refresh still has it.
- [ ] Adding 20 ingredient rows and 20 steps is possible in the UI.
- [ ] Dirty cancel shows confirmation; confirm leaves storage unchanged.
- [ ] Rapid double-click Save creates exactly one recipe.

---

## 6. Recipe detail view

**Depends on:** 2, 3, 5.

**Work:**

- Load by id; missing/deleted id → not-found copy + link to Collection (FR-4, e2e #7).
- Show only fields that have values; never render “null” (FR-4).
- Ingredients as a list; line format `quantity unit name` when parts exist (FR-4).
- Steps as a numbered list in stored order.
- Optional image: `alt` = recipe title; on error hide or placeholder (UX-3).
- Actions: Edit, Delete (styled distinct from Save), Back to collection (FR-4, UX-2).

**Verify:**

- [ ] Tomato Soup detail shows title, ingredient line, numbered step “Simmer” (e2e #1).
- [ ] Empty optional fields (no description, no image, no times) are omitted.
- [ ] Bogus id shows not-found and Collection link, no exception in console that blanks the page (e2e #7).
- [ ] Edit and Delete controls are present and keyboard reachable.

---

## 7. Collection list (populated)

**Depends on:** 2, 3, 6.

**Work:**

- Cards/rows: title, up to 3 tags, total time if both or either times set (sum when both), servings if set (FR-3).
- Sorted `updatedAt` desc.
- Click/activate card → Detail.
- Titles wrap or ellipsis; 50 items no layout break (FR-3, NFR-1).
- Grid/list: single column under 640px (UX-1).

**Verify:**

- [ ] After two recipes, both cards show; most recently saved/updated first (e2e #2).
- [ ] Card shows at most 3 tags.
- [ ] Activating a card opens the matching detail.
- [ ] 50-recipe fixture (seed in console/storage) renders without overlap/breakage in under 2s locally (NFR-1).

---

## 8. Edit recipe

**Depends on:** 1, 2, 5, 6.

**Work:**

- Edit route prefills all editable fields including ingredient/step lists (FR-5).
- Same validation and dirty-cancel behavior as Create.
- Save uses `applyRecipeUpdate`; then show Detail with new values.
- Cancel without confirm-accept leaves storage unchanged.

**Verify:**

- [ ] Opening edit for Tomato Soup shows existing title, ingredients, steps.
- [ ] Add a second step, save → detail has two steps; `updatedAt` > `createdAt`; `id` unchanged (e2e #4).
- [ ] Invalid edit (clear title) does not write.
- [ ] Cancel after a change + discard confirm → detail still has old values.

---

## 9. Delete recipe

**Depends on:** 2, 6, 7.

**Work:**

- Delete opens a confirmation that includes the recipe title (FR-6).
- Dialog traps focus until dismissed (UX-3).
- Confirm: `deleteRecipe`, navigate to Collection; recipe gone from list (FR-6).
- Dismiss: no storage change, remain on detail.
- Confirm control disabled while delete in progress (UX-2).

**Verify:**

- [ ] Cancel confirmation → recipe still on detail and in list (FR-6).
- [ ] Confirm delete of Grilled Cheese → collection only has remaining recipes; refresh still gone (e2e #5).
- [ ] Direct URL to deleted id → not-found (task 6).
- [ ] Tab/Shift+Tab stays inside the open dialog.

---

## 10. Search and tag filter

**Depends on:** 7.

**Work:**

- Search box on Collection; filter as the user types; debounce ≤ 300ms (FR-7).
- Case-insensitive match on title, ingredient `name`s, and tags.
- Zero hits: empty state that includes the query string (FR-7).
- Clearing the box restores the full list.
- Clicking a tag chip on a card or detail applies that tag as the collection filter (FR-7).
- Filter of 50 recipes completes in < 100ms after debounce (NFR-1).

**Verify:**

- [ ] Query `tomato` shows Tomato Soup only (e2e #3).
- [ ] Query `lunch` shows the recipe tagged lunch only (e2e #3).
- [ ] Query `xyz-no-match` shows empty state containing `xyz-no-match` (e2e #3).
- [ ] Clearing search restores both recipes.
- [ ] Clicking tag `lunch` on a card/detail filters equivalently to searching that tag.

---

## 11. Feedback, images, and accessibility pass

**Depends on:** 5–10.

**Work:**

- Save success: toast/inline or immediate detail navigation (UX-2).
- Storage failure on save/delete: user-safe message, no stack trace (UX-4, FR-8).
- Broken `imageUrl` does not break layout (UX-3).
- Focus order matches visual order on form, detail, collection (UX-3).
- Labels, contrast, dialog focus already required above; fix gaps found in a keyboard-only pass.

**Verify:**

- [ ] Keyboard-only: create a recipe, open it, edit, delete-cancel, search — no mouse.
- [ ] Forced storage failure (e.g. quota mock) shows “Couldn't save your recipe. Try again.” or equivalent.
- [ ] Recipe with a 404 image URL still shows title/ingredients/steps.

---

## 12. End-to-end acceptance (clean install)

**Depends on:** 1–11.

**Work:**

- Run `APP_REQUIREMENTS.md` scenarios 1–7 on a clean storage state.
- Confirm README start steps still match the app.

**Verify (all must pass):**

- [ ] **#1 First recipe:** empty state → create Tomato Soup → detail → refresh still present.
- [ ] **#2 Collection growth:** add Grilled Cheese tagged `lunch`; both listed, newest first.
- [ ] **#3 Search:** `tomato` / `lunch` / `xyz-no-match` behave as specified.
- [ ] **#4 Edit:** second step on Tomato Soup; `updatedAt` newer than `createdAt`.
- [ ] **#5 Delete:** confirm remove Grilled Cheese; refresh still only Tomato Soup.
- [ ] **#6 Validation:** blank required fields blocked; filling them allows save.
- [ ] **#7 Not found:** bogus id shows not-found, not a crash.

---

## Suggested implementation order

```
0 Bootstrap
1 Model + validation
2 Persistence
3 Shell + routes + titles
4 Collection empty state
5 Create form
6 Detail + not-found
7 Collection list
8 Edit form
9 Delete + confirm dialog
10 Search + tag filter
11 A11y / errors / images polish
12 E2E scenarios 1–7
```

v1 is complete when task 12 checkboxes pass and no in-scope FR/UX/NFR item remains unimplemented.
