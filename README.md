# Recipe Collector

A simple static web app for collecting food recipes in the browser. v1 is a **single local collection** stored in `localStorage`. It is **not** a private multi-user product: anyone with access to the same browser profile can see the recipes, and nothing is sent to a server.

## Run the app

No build step and no install required for the UI.

1. Clone or open this repository.
2. Start a static server from the repo root, for example:
   - `python3 -m http.server 8080`
   - or `npx --yes serve .`
3. Open `http://localhost:8080` in your browser.

You can also open `index.html` directly as a file. Hash routes still work; a local server is preferred so browser storage and modules behave consistently.

The empty collection screen should appear with **No recipes yet** and **Add your first recipe**.

## Tests

Node.js is enough (no extra packages):

```bash
npm test
```

or `node tests/run.js`.

The suite covers the recipe model, validation, persistence (including corrupted JSON and write failures), search, routing, and the end-to-end scenarios from `APP_REQUIREMENTS.md`.

## Stack

- Static HTML, CSS, and JavaScript (no framework, no bundler).
- Persistence: `localStorage` key `recipe-collector.recipes.v1`.
- Routing: hash URLs (`#/`, `#/recipes/new`, `#/recipes/:id`, `#/recipes/:id/edit`).

## Browser support

Latest two versions of Chrome, Firefox, Safari, and Edge. No Internet Explorer 11 support.

## What you can do

- Create, view, edit, and delete recipes (title, description, servings, prep/cook time, ingredients, steps, tags, notes, optional image URL).
- Search by title, ingredient name, or tag.
- Click a tag chip to filter the collection.
- Data survives a page refresh in the same browser profile.

Out of scope for v1: accounts, sharing, scraping recipe URLs, nutrition, unit conversion, file uploads, shopping lists, and meal planning.
