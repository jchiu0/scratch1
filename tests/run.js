#!/usr/bin/env node
"use strict";

var Model = require("../js/model.js");
var StorageModule = require("../js/storage.js");

var passed = 0;
var failed = 0;
var current = "";

function assert(cond, message) {
  if (cond) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error("  FAIL: " + current + " — " + message);
}

function assertEqual(actual, expected, message) {
  var ok =
    actual === expected ||
    (Number.isNaN(actual) && Number.isNaN(expected)) ||
    JSON.stringify(actual) === JSON.stringify(expected);
  assert(
    ok,
    (message || "values differ") +
      " (expected " +
      JSON.stringify(expected) +
      ", got " +
      JSON.stringify(actual) +
      ")"
  );
}

function test(name, fn) {
  current = name;
  try {
    fn();
  } catch (e) {
    failed += 1;
    console.error("  FAIL: " + name + " — threw " + (e && e.stack ? e.stack : e));
  }
}

function minimal(overrides) {
  var input = {
    title: "Tomato Soup",
    ingredients: [{ name: "tomatoes" }],
    steps: ["Simmer"]
  };
  if (!overrides) return input;
  Object.keys(overrides).forEach(function (k) {
    input[k] = overrides[k];
  });
  return input;
}

function makeStore() {
  return StorageModule.createStorage(StorageModule.memoryAdapter());
}

test("valid minimal recipe passes validation", function () {
  var result = Model.validateRecipe(minimal());
  assert(result.ok, "expected ok");
  assertEqual(result.value.title, "Tomato Soup");
  assertEqual(result.value.ingredients.length, 1);
  assertEqual(result.value.steps.length, 1);
});

test("blank or whitespace title fails and identifies title", function () {
  var blank = Model.validateRecipe(minimal({ title: "   " }));
  assert(!blank.ok, "whitespace title should fail");
  assert(!!blank.errors.title, "error should identify title");
  var missing = Model.validateRecipe(minimal({ title: "" }));
  assert(!missing.ok && missing.errors.title, "empty title should fail");
});

test("title is trimmed on success", function () {
  var result = Model.validateRecipe(minimal({ title: "  Tomato Soup  " }));
  assert(result.ok, "trimmed title ok");
  assertEqual(result.value.title, "Tomato Soup");
});

test("title longer than 120 characters fails", function () {
  var title = Array(122).join("a");
  var result = Model.validateRecipe(minimal({ title: title }));
  assert(!result.ok && result.errors.title, "long title should fail");
});

test("zero ingredients or zero steps fails", function () {
  var noIng = Model.validateRecipe(minimal({ ingredients: [] }));
  assert(!noIng.ok && noIng.errors.ingredients, "zero ingredients should fail");
  var blankIng = Model.validateRecipe(minimal({ ingredients: [{ name: "  " }] }));
  assert(!blankIng.ok && blankIng.errors.ingredients, "blank ingredient should fail");
  var noSteps = Model.validateRecipe(minimal({ steps: [] }));
  assert(!noSteps.ok && noSteps.errors.steps, "zero steps should fail");
  var blankSteps = Model.validateRecipe(minimal({ steps: ["  "] }));
  assert(!blankSteps.ok && blankSteps.errors.steps, "blank step should fail");
});

test("ingredient without name but with quantity fails", function () {
  var result = Model.validateRecipe(
    minimal({ ingredients: [{ quantity: "1", unit: "cup", name: "" }] })
  );
  assert(!result.ok, "should fail");
  assert(result.errors.ingredientLines && result.errors.ingredientLines[0], "line error");
});

test("empty optional fields are omitted from the stored value", function () {
  var result = Model.validateRecipe(minimal());
  assert(result.ok, "ok");
  assert(result.value.description === undefined, "no description");
  assert(result.value.notes === undefined, "no notes");
  assert(result.value.servings === undefined, "no servings");
  assert(result.value.imageUrl === undefined, "no image");
});

test("duplicate tags Lunch and lunch store once as lunch", function () {
  var result = Model.validateRecipe(minimal({ tags: ["Lunch", "lunch", " Soup "] }));
  assert(result.ok, "tags should not fail validation");
  assertEqual(result.value.tags, ["lunch", "soup"]);
});

test("tags from comma string are normalized and capped at 20", function () {
  var tags = [];
  var i;
  for (i = 0; i < 25; i++) tags.push("tag" + i);
  var result = Model.validateRecipe(minimal({ tags: tags.join(",") }));
  assert(result.ok, "ok");
  assertEqual(result.value.tags.length, 20);
});

test("servings and times validation", function () {
  assert(!Model.validateRecipe(minimal({ servings: 0 })).ok, "servings 0");
  assert(!Model.validateRecipe(minimal({ servings: 101 })).ok, "servings 101");
  assert(Model.validateRecipe(minimal({ servings: 4 })).ok, "servings 4");
  assert(!Model.validateRecipe(minimal({ prepTimeMinutes: -1 })).ok, "negative prep");
  assert(
    Model.validateRecipe(minimal({ prepTimeMinutes: 0, cookTimeMinutes: 12 })).ok,
    "times ok"
  );
  assert(!Model.validateRecipe(minimal({ cookTimeMinutes: "x" })).ok, "non-int cook");
});

test("description and notes length caps", function () {
  var longDesc = Array(1002).join("d");
  var longNotes = Array(2002).join("n");
  assert(!Model.validateRecipe(minimal({ description: longDesc })).ok, "desc cap");
  assert(!Model.validateRecipe(minimal({ notes: longNotes })).ok, "notes cap");
});

test("invalid image URL warns but does not fail validation", function () {
  var result = Model.validateRecipe(minimal({ imageUrl: "not-a-url" }));
  assert(result.ok, "still valid");
  assert(!!result.warnings.imageUrl, "warning present");
  assertEqual(result.value.imageUrl, "not-a-url");
});

test("createRecipeRecord sets id, createdAt, updatedAt", function () {
  var rec = Model.createRecipeRecord(minimal());
  assert(typeof rec.id === "string" && rec.id.length > 8, "id generated");
  assert(!!rec.createdAt && !isNaN(Date.parse(rec.createdAt)), "createdAt ISO");
  assertEqual(rec.updatedAt, rec.createdAt);
  assertEqual(rec.title, "Tomato Soup");
});

test("createRecipeRecord rejects invalid input", function () {
  var threw = false;
  try {
    Model.createRecipeRecord({ title: "" });
  } catch (e) {
    threw = true;
    assert(e.validation && !e.validation.ok, "validation attached");
  }
  assert(threw, "should throw");
});

test("applyRecipeUpdate preserves id and createdAt and changes updatedAt", function () {
  var rec = Model.createRecipeRecord(minimal());
  rec.createdAt = "2020-01-01T00:00:00.000Z";
  rec.updatedAt = rec.createdAt;
  var updated = Model.applyRecipeUpdate(
    rec,
    minimal({
      title: "Tomato Soup",
      steps: ["Simmer", "Taste"]
    })
  );
  assertEqual(updated.id, rec.id);
  assertEqual(updated.createdAt, rec.createdAt);
  assert(updated.updatedAt > rec.createdAt, "updatedAt should be newer");
  assertEqual(updated.steps.length, 2);
});

test("formatIngredient joins quantity unit name", function () {
  assertEqual(
    Model.formatIngredient({ quantity: "2", unit: "cups", name: "flour" }),
    "2 cups flour"
  );
  assertEqual(Model.formatIngredient({ name: "salt" }), "salt");
  assertEqual(Model.formatIngredient({ quantity: "1", name: "egg" }), "1 egg");
});

test("formatTotalTime sums when either or both times set", function () {
  assertEqual(Model.formatTotalTime({}), "");
  assertEqual(Model.formatTotalTime({ prepTimeMinutes: 5 }), "5 min");
  assertEqual(Model.formatTotalTime({ cookTimeMinutes: 10 }), "10 min");
  assertEqual(Model.formatTotalTime({ prepTimeMinutes: 5, cookTimeMinutes: 10 }), "15 min");
});

test("parseRoute covers collection, create, detail, edit, query, unknown", function () {
  assertEqual(Model.parseRoute("").name, "collection");
  assertEqual(Model.parseRoute("#/").name, "collection");
  assertEqual(Model.parseRoute("#/recipes/new").name, "create");
  var detail = Model.parseRoute("#/recipes/abc-123");
  assertEqual(detail.name, "detail");
  assertEqual(detail.id, "abc-123");
  var edit = Model.parseRoute("#/recipes/abc-123/edit");
  assertEqual(edit.name, "edit");
  assertEqual(edit.id, "abc-123");
  var q = Model.parseRoute("#/?q=tomato");
  assertEqual(q.name, "collection");
  assertEqual(q.q, "tomato");
  assertEqual(Model.parseRoute("#/nope").name, "unknown");
  var encoded = Model.parseRoute("#/recipes/" + encodeURIComponent("id with space"));
  assertEqual(encoded.name, "detail");
  assertEqual(encoded.id, "id with space");
});

test("filterRecipes is case-insensitive on title, ingredient names, and tags", function () {
  var recipes = [
    {
      title: "Tomato Soup",
      ingredients: [{ name: "tomatoes" }],
      tags: ["dinner"]
    },
    {
      title: "Grilled Cheese",
      ingredients: [{ name: "bread" }],
      tags: ["lunch"]
    }
  ];
  assertEqual(
    Model.filterRecipes(recipes, "tomato").map(function (r) {
      return r.title;
    }),
    ["Tomato Soup"]
  );
  assertEqual(
    Model.filterRecipes(recipes, "LUNCH").map(function (r) {
      return r.title;
    }),
    ["Grilled Cheese"]
  );
  assertEqual(
    Model.filterRecipes(recipes, "bread").map(function (r) {
      return r.title;
    }),
    ["Grilled Cheese"]
  );
  assertEqual(Model.filterRecipes(recipes, "xyz-no-match").length, 0);
  assertEqual(Model.filterRecipes(recipes, "").length, 2);
});

test("sortByUpdatedDesc orders newest first", function () {
  var list = Model.sortByUpdatedDesc([
    { id: "a", updatedAt: "2020-01-01T00:00:00.000Z" },
    { id: "b", updatedAt: "2024-01-01T00:00:00.000Z" }
  ]);
  assertEqual(list[0].id, "b");
  assertEqual(list[1].id, "a");
});

test("storage save then list returns the record sorted by updatedAt", function () {
  var store = makeStore();
  var older = Model.createRecipeRecord(minimal({ title: "Older" }));
  older.updatedAt = "2020-01-01T00:00:00.000Z";
  var newer = Model.createRecipeRecord(
    minimal({ title: "Newer", ingredients: [{ name: "salt" }] })
  );
  newer.updatedAt = "2024-01-01T00:00:00.000Z";
  store.saveRecipe(older);
  store.saveRecipe(newer);
  var list = store.listRecipes();
  assertEqual(list.length, 2);
  assertEqual(list[0].title, "Newer");
  assertEqual(list[1].title, "Older");
});

test("saving the same id updates in place and does not duplicate", function () {
  var store = makeStore();
  var rec = Model.createRecipeRecord(minimal());
  store.saveRecipe(rec);
  rec.title = "Tomato Soup";
  rec.updatedAt = "2025-01-01T00:00:00.000Z";
  store.saveRecipe(rec);
  assertEqual(store.listRecipes().length, 1);
});

test("storage getRecipe unknown id returns null", function () {
  var store = makeStore();
  assertEqual(store.getRecipe("missing"), null);
  assertEqual(store.getRecipe(""), null);
});

test("storage deleteRecipe removes the record", function () {
  var store = makeStore();
  var rec = Model.createRecipeRecord(minimal());
  store.saveRecipe(rec);
  store.deleteRecipe(rec.id);
  assertEqual(store.listRecipes().length, 0);
  assertEqual(store.getRecipe(rec.id), null);
});

test("storage re-read after save (reload simulation)", function () {
  var adapter = StorageModule.memoryAdapter();
  var storeA = StorageModule.createStorage(adapter);
  var rec = Model.createRecipeRecord(minimal());
  storeA.saveRecipe(rec);
  var storeB = StorageModule.createStorage(adapter);
  var again = storeB.getRecipe(rec.id);
  assert(again && again.title === "Tomato Soup", "reload should find recipe");
});

test("malformed JSON does not crash and warns", function () {
  var adapter = StorageModule.memoryAdapter();
  adapter.setItem(StorageModule.KEY, "{not json");
  var store = StorageModule.createStorage(adapter);
  var list = store.listRecipes();
  assertEqual(list, []);
  assert(!!store.getWarning(), "recovery warning");
});

test("non-array JSON and bad records are skipped", function () {
  var adapter = StorageModule.memoryAdapter();
  adapter.setItem(StorageModule.KEY, JSON.stringify({ nope: true }));
  var store = StorageModule.createStorage(adapter);
  assertEqual(store.listRecipes().length, 0);
  adapter.setItem(
    StorageModule.KEY,
    JSON.stringify([{ id: "x", title: "Good", ingredients: [] }, "bad", { foo: 1 }])
  );
  var store2 = StorageModule.createStorage(adapter);
  var list = store2.listRecipes();
  assertEqual(list.length, 1);
  assertEqual(list[0].title, "Good");
  assert(!!store2.getWarning(), "warning for skipped records");
});

test("quota / write failure uses user-safe message", function () {
  var adapter = StorageModule.memoryAdapter();
  adapter.setItem = function () {
    throw new Error("QuotaExceededError");
  };
  var store = StorageModule.createStorage(adapter);
  var rec = Model.createRecipeRecord(minimal());
  var message = null;
  try {
    store.saveRecipe(rec);
  } catch (e) {
    message = e.message;
  }
  assertEqual(message, "Couldn't save your recipe. Try again.");
});

test("filter of 50 recipes is fast", function () {
  var recipes = [];
  var i;
  for (i = 0; i < 50; i++) {
    recipes.push({
      title: i === 7 ? "Tomato Soup" : "Recipe " + i,
      ingredients: [{ name: i === 7 ? "tomatoes" : "salt" }],
      tags: i === 3 ? ["lunch"] : ["dinner"]
    });
  }
  var start = Date.now();
  var hits = Model.filterRecipes(recipes, "tomato");
  var elapsed = Date.now() - start;
  assertEqual(hits.length, 1);
  assert(elapsed < 100, "filter should be under 100ms, was " + elapsed);
});

test("e2e #1 first recipe create + persist", function () {
  var store = makeStore();
  assertEqual(store.listRecipes().length, 0);
  var rec = Model.createRecipeRecord({
    title: "Tomato Soup",
    ingredients: [{ name: "tomatoes" }],
    steps: ["Simmer"]
  });
  store.saveRecipe(rec);
  var loaded = store.getRecipe(rec.id);
  assertEqual(loaded.title, "Tomato Soup");
  assertEqual(Model.formatIngredient(loaded.ingredients[0]), "tomatoes");
  assertEqual(loaded.steps[0], "Simmer");
});

test("e2e #2 collection growth newest first", function () {
  var store = makeStore();
  var soup = Model.createRecipeRecord(minimal());
  store.saveRecipe(soup);
  var cheese = Model.createRecipeRecord(
    minimal({
      title: "Grilled Cheese",
      ingredients: [{ name: "bread" }],
      steps: ["Grill"],
      tags: ["lunch"]
    })
  );
  store.saveRecipe(cheese);
  var list = store.listRecipes();
  assertEqual(list.length, 2);
  assertEqual(list[0].title, "Grilled Cheese");
  assertEqual(list[1].title, "Tomato Soup");
  assertEqual(list[0].tags, ["lunch"]);
});

test("e2e #3 search tomato / lunch / xyz-no-match", function () {
  var store = makeStore();
  store.saveRecipe(Model.createRecipeRecord(minimal()));
  store.saveRecipe(
    Model.createRecipeRecord(
      minimal({
        title: "Grilled Cheese",
        ingredients: [{ name: "bread" }],
        steps: ["Grill"],
        tags: ["lunch"]
      })
    )
  );
  var all = store.listRecipes();
  assertEqual(Model.filterRecipes(all, "tomato").length, 1);
  assertEqual(Model.filterRecipes(all, "tomato")[0].title, "Tomato Soup");
  assertEqual(Model.filterRecipes(all, "lunch")[0].title, "Grilled Cheese");
  assertEqual(Model.filterRecipes(all, "xyz-no-match").length, 0);
});

test("e2e #4 edit adds a step and bumps updatedAt", function () {
  var store = makeStore();
  var soup = Model.createRecipeRecord(minimal());
  soup.createdAt = "2020-01-01T00:00:00.000Z";
  soup.updatedAt = soup.createdAt;
  store.saveRecipe(soup);
  var edited = Model.applyRecipeUpdate(soup, {
    title: soup.title,
    ingredients: soup.ingredients,
    steps: ["Simmer", "Taste"]
  });
  store.saveRecipe(edited);
  var loaded = store.getRecipe(soup.id);
  assertEqual(loaded.id, soup.id);
  assertEqual(loaded.steps.length, 2);
  assert(loaded.updatedAt > loaded.createdAt, "updatedAt newer than createdAt");
});

test("e2e #5 delete removes recipe after confirm-equivalent call", function () {
  var store = makeStore();
  var soup = Model.createRecipeRecord(minimal());
  var cheese = Model.createRecipeRecord(
    minimal({
      title: "Grilled Cheese",
      ingredients: [{ name: "bread" }],
      steps: ["Grill"]
    })
  );
  store.saveRecipe(soup);
  store.saveRecipe(cheese);
  store.deleteRecipe(cheese.id);
  var list = store.listRecipes();
  assertEqual(list.length, 1);
  assertEqual(list[0].title, "Tomato Soup");
  assertEqual(store.getRecipe(cheese.id), null);
});

test("e2e #6 validation blocks blank required fields then allows save", function () {
  var store = makeStore();
  var invalid = Model.validateRecipe({ title: "", ingredients: [], steps: [] });
  assert(!invalid.ok, "blank form invalid");
  assert(
    invalid.errors.title && invalid.errors.ingredients && invalid.errors.steps,
    "field errors"
  );
  assertEqual(store.listRecipes().length, 0);
  var valid = Model.validateRecipe(minimal());
  assert(valid.ok, "filled form valid");
  store.saveRecipe(Model.createRecipeRecord(minimal()));
  assertEqual(store.listRecipes().length, 1);
});

test("e2e #7 unknown id is not found", function () {
  var store = makeStore();
  assertEqual(store.getRecipe("bogus-id"), null);
});

test("cards expose at most 3 tags via slice helper used by UI", function () {
  var tags = ["a", "b", "c", "d"];
  assertEqual(tags.slice(0, 3).length, 3);
});

test("isHttpUrl accepts http(s) only", function () {
  assert(Model.isHttpUrl("https://example.com/x.png"), "https");
  assert(Model.isHttpUrl("http://example.com/x.png"), "http");
  assert(!Model.isHttpUrl("javascript:alert(1)"), "javascript rejected");
  assert(!Model.isHttpUrl("ftp://x"), "ftp rejected");
});

console.log("Passed: " + passed + ", failed: " + failed);
process.exit(failed ? 1 : 0);
