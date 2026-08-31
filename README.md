# Recipe Collector

A simple browser web app for collecting food recipes. Add ingredients and steps, browse your collection, search by name, ingredient, or tag, then edit or delete entries.

v1 is a **single local collection** stored in this browser (`localStorage`). There are no accounts. Data is **not private/multi-user** — anyone with access to this browser profile can see the recipes, and nothing is synced to a server.

## Stack

Static HTML, CSS, and JavaScript. No build step. Persistence: `localStorage`.

## Run the app

1. Clone or copy this repository.
2. Serve the project root over HTTP (opening `index.html` as a file also works in most browsers):

   ```bash
   python3 -m http.server 8080
   ```

   or `npx --yes serve .`

3. Open http://localhost:8080

You should see the collection page. If you have no recipes yet, it shows **No recipes yet** and **Add your first recipe**.

## Tests

From the project root:

```bash
node tests/run-node.js
```

or `npm test`.

In a browser, open `tests.html` (same static server).

## Browser support

Latest two versions of Chrome, Firefox, Safari, and Edge. No IE11.

## Features (v1)

- Create, view, edit, and delete recipes
- Title, description, servings, prep/cook time, ingredients, steps, tags, notes, optional image URL
- Search and tag filter
- Data survives a page reload in this browser

## Privacy

Recipe content stays in local browser storage and is not sent to a server by this app.
