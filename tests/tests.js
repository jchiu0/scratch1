(function (global) {
  function runRecipeTests() {
    var results = [];
    var model = global.RecipeModel;
    var storageFactory = global.RecipeStorage;
    var router = global.RecipeRouter;

    function pass(name) {
      results.push({ name: name, ok: true });
    }
    function fail(name, detail) {
      results.push({ name: name, ok: false, detail: String(detail || "") });
    }
    function assert(name, condition, detail) {
      if (condition) pass(name);
      else fail(name, detail || "assertion failed");
    }
    function assertEqual(name, actual, expected) {
      var ok = actual === expected;
      if (!ok && actual && expected && typeof actual === "object" && JSON.stringify(actual) === JSON.stringify(expected)) ok = true;
      if (ok) pass(name);
      else fail(name, "expected " + JSON.stringify(expected) + " but got " + JSON.stringify(actual));
    }
    function throws(name, fn, match) {
      try {
        fn();
        fail(name, "expected throw");
      } catch (err) {
        if (match && String(err.message).indexOf(match) === -1) fail(name, err.message);
        else pass(name);
      }
    }

    var minimal = {
      title: "Tomato Soup",
      ingredients: [{ name: "tomatoes" }],
      steps: ["Simmer"]
    };

    var valid = model.validateRecipe(minimal);
    assert("minimal recipe validates", valid.ok, JSON.stringify(valid.errors));
    assertEqual("minimal title stored trimmed", valid.data.title, "Tomato Soup");

    var blank = model.validateRecipe({ title: "   ", ingredients: [], steps: [] });
    assert("blank title fails", !blank.ok && !!blank.errors.title, JSON.stringify(blank.errors));
    assert("zero ingredients fails", !!blank.errors.ingredients);
    assert("zero steps fails", !!blank.errors.steps);

    var tagged = model.validateRecipe({
      title: "Grilled Cheese",
      ingredients: [{ name: "bread" }, { quantity: "1", unit: "slice", name: "cheddar" }],
      steps: ["Grill"],
      tags: ["Lunch", "lunch", "  sandwich  "]
    });
    assert("duplicate tags collapse case-insensitively", tagged.ok && tagged.data.tags.join(",") === "lunch,sandwich");

    var tooLong = "";
    for (var t = 0; t < 121; t++) tooLong += "a";
    var longTitle = model.validateRecipe({
      title: tooLong,
      ingredients: [{ name: "x" }],
      steps: ["y"]
    });
    assert("title over 120 fails", !longTitle.ok && !!longTitle.errors.title);

    var servings = model.validateRecipe({
      title: "Stew",
      servings: 0,
      ingredients: [{ name: "beef" }],
      steps: ["Cook"]
    });
    assert("servings 0 fails", !servings.ok && !!servings.errors.servings);

    var times = model.validateRecipe({
      title: "Stew",
      prepTimeMinutes: -1,
      ingredients: [{ name: "beef" }],
      steps: ["Cook"]
    });
    assert("negative prep time fails", !times.ok && !!times.errors.prepTimeMinutes);

    var img = model.validateRecipe({
      title: "Cake",
      ingredients: [{ name: "flour" }],
      steps: ["Bake"],
      imageUrl: "not-a-url"
    });
    assert("invalid image URL still validates", img.ok);
    assert("invalid image URL warns", !!img.warnings.imageUrl);

    var created = model.createRecipeRecord(minimal);
    assert("create assigns id", typeof created.id === "string" && created.id.length > 0);
    assert("create assigns createdAt", typeof created.createdAt === "string" && created.createdAt.indexOf("T") !== -1);
    assertEqual("create createdAt equals updatedAt", created.createdAt, created.updatedAt);
    assertEqual("create keeps title", created.title, "Tomato Soup");

    var later = model.applyRecipeUpdate(created, {
      title: created.title,
      ingredients: created.ingredients,
      steps: ["Simmer", "Taste"]
    });
    assertEqual("update preserves id", later.id, created.id);
    assertEqual("update preserves createdAt", later.createdAt, created.createdAt);
    assert("update changes updatedAt", later.updatedAt >= created.updatedAt && later.steps.length === 2);
    assertEqual("update has two steps", later.steps.length, 2);

    throws("create rejects invalid", function () {
      model.createRecipeRecord({ title: "" });
    }, "Invalid recipe");

    assertEqual("format ingredient with all parts", model.formatIngredientLine({
      quantity: "2", unit: "cups", name: "flour"
    }), "2 cups flour");
    assertEqual("format ingredient name only", model.formatIngredientLine({ name: "salt" }), "salt");
    assertEqual("total time sums prep and cook", model.totalTimeMinutes({
      prepTimeMinutes: 10, cookTimeMinutes: 20
    }), 30);
    assertEqual("total time with only cook", model.totalTimeMinutes({ cookTimeMinutes: 15 }), 15);
    assertEqual("total time omitted when missing", model.totalTimeMinutes({ title: "x" }), null);

    var soup = { title: "Tomato Soup", ingredients: [{ name: "tomatoes" }], tags: ["dinner"], updatedAt: "2020-01-01" };
    var sandwich = { title: "Grilled Cheese", ingredients: [{ name: "bread" }], tags: ["lunch"], updatedAt: "2020-02-01" };
    assert("search matches title case-insensitively", model.recipeMatchesQuery(soup, "tomato"));
    assert("search matches ingredient", model.recipeMatchesQuery(soup, "TOMATOES"));
    assert("search matches tag", model.recipeMatchesQuery(sandwich, "lunch"));
    assert("search misses unrelated", !model.recipeMatchesQuery(soup, "xyz-no-match"));
    var filtered = model.filterRecipes([soup, sandwich], "lunch");
    assertEqual("filter by tag returns one", filtered.length, 1);
    assertEqual("filter by tag keeps grilled cheese", filtered[0].title, "Grilled Cheese");
    assertEqual("empty query returns all", model.filterRecipes([soup, sandwich], "").length, 2);

    var mem = {
      data: {},
      getItem: function (key) { return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null; },
      setItem: function (key, value) {
        if (this.fail) throw new Error("QuotaExceededError");
        this.data[key] = String(value);
      }
    };
    var db = storageFactory.createStorage(mem);
    db.saveRecipe(created);
    var listed = db.listRecipes();
    assertEqual("save then list returns one", listed.length, 1);
    assertEqual("list contains saved id", listed[0].id, created.id);
    var db2 = storageFactory.createStorage(mem);
    assertEqual("reload simulation finds recipe", db2.getRecipe(created.id).title, "Tomato Soup");
    assertEqual("unknown id returns null", db.getRecipe("missing"), null);
    db.deleteRecipe(created.id);
    assertEqual("delete removes recipe", db.getRecipe(created.id), null);
    assertEqual("list empty after delete", db.listRecipes().length, 0);

    var newer = model.createRecipeRecord({
      title: "Grilled Cheese",
      ingredients: [{ name: "bread" }],
      steps: ["Toast"],
      tags: ["lunch"]
    });
    var older = model.createRecipeRecord({
      title: "Tomato Soup",
      ingredients: [{ name: "tomatoes" }],
      steps: ["Simmer"]
    });
    older.updatedAt = "2020-01-01T00:00:00.000Z";
    newer.updatedAt = "2020-02-01T00:00:00.000Z";
    db.saveRecipe(older);
    db.saveRecipe(newer);
    var ordered = db.listRecipes();
    assertEqual("list sorted updatedAt desc first title", ordered[0].title, "Grilled Cheese");
    assertEqual("list sorted updatedAt desc second title", ordered[1].title, "Tomato Soup");

    mem.data[storageFactory.STORAGE_KEY] = "{not json";
    var recovered = storageFactory.createStorage(mem);
    assertEqual("malformed JSON yields empty list", recovered.listRecipes().length, 0);
    assert("malformed JSON sets recovery flag", recovered.hadRecovery());
    assertEqual("getRecipe after corrupt storage is null", recovered.getRecipe("x"), null);

    mem.data[storageFactory.STORAGE_KEY] = JSON.stringify([{ nope: true }, { id: "ok", title: "Kept", updatedAt: "2021-01-01" }]);
    var skipped = storageFactory.createStorage(mem);
    assertEqual("skips records without id", skipped.listRecipes().length, 1);
    assert("skipping bad records is recovery", skipped.hadRecovery());

    mem.fail = true;
    mem.data = {};
    var quota = storageFactory.createStorage(mem);
    throws("quota failure uses user-safe message", function () {
      quota.saveRecipe(created);
    }, storageFactory.SAVE_ERROR);

    assertEqual("root hash is collection", router.parseHash("#/").name, "collection");
    assertEqual("empty hash is collection", router.parseHash("").name, "collection");
    assertEqual("create route", router.parseHash("#/recipes/new").name, "create");
    assertEqual("detail route id", router.parseHash("#/recipes/abc-123").id, "abc-123");
    assertEqual("edit route", router.parseHash("#/recipes/abc-123/edit").name, "edit");
    assertEqual("search query parsed", router.parseHash("#/?q=tomato").query, "tomato");
    assertEqual("unknown path", router.parseHash("#/nope").name, "unknown");

    var e2eStore = {
      data: {},
      getItem: function (key) { return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null; },
      setItem: function (key, value) { this.data[key] = String(value); }
    };
    var e2e = storageFactory.createStorage(e2eStore);
    assertEqual("e2e empty collection", e2e.listRecipes().length, 0);
    var soupRec = model.createRecipeRecord({
      title: "Tomato Soup",
      ingredients: [{ name: "tomatoes" }],
      steps: ["Simmer"]
    });
    e2e.saveRecipe(soupRec);
    assertEqual("e2e #1 saved soup", e2e.getRecipe(soupRec.id).title, "Tomato Soup");
    var cheeseRec = model.createRecipeRecord({
      title: "Grilled Cheese",
      ingredients: [{ name: "bread" }],
      steps: ["Grill"],
      tags: ["lunch"]
    });
    e2e.saveRecipe(cheeseRec);
    var both = e2e.listRecipes();
    assertEqual("e2e #2 two recipes", both.length, 2);
    assertEqual("e2e #2 newest first", both[0].id, cheeseRec.id);
    var tomatoHits = model.filterRecipes(e2e.listRecipes(), "tomato");
    assert("e2e #3 tomato query", tomatoHits.length === 1 && tomatoHits[0].title === "Tomato Soup");
    var lunchHits = model.filterRecipes(e2e.listRecipes(), "lunch");
    assert("e2e #3 lunch query", lunchHits.length === 1 && lunchHits[0].title === "Grilled Cheese");
    assertEqual("e2e #3 no match", model.filterRecipes(e2e.listRecipes(), "xyz-no-match").length, 0);
    var edited = model.applyRecipeUpdate(soupRec, {
      title: soupRec.title,
      ingredients: soupRec.ingredients,
      steps: ["Simmer", "Taste"]
    });
    e2e.saveRecipe(edited);
    var editedStored = e2e.getRecipe(soupRec.id);
    assert("e2e #4 two steps", editedStored.steps.length === 2);
    assert("e2e #4 timestamps", editedStored.updatedAt >= editedStored.createdAt && editedStored.id === soupRec.id);
    e2e.deleteRecipe(cheeseRec.id);
    assertEqual("e2e #5 cheese gone", e2e.getRecipe(cheeseRec.id), null);
    assertEqual("e2e #5 one remains", e2e.listRecipes().length, 1);
    var invalid = model.validateRecipe({ title: "", ingredients: [], steps: [] });
    assert("e2e #6 validation blocks incomplete", !invalid.ok);
    var validAgain = model.validateRecipe({
      title: "Tomato Soup",
      ingredients: [{ name: "tomatoes" }],
      steps: ["Simmer"]
    });
    assert("e2e #6 complete recipe allowed", validAgain.ok);
    assertEqual("e2e #7 unknown id not found", e2e.getRecipe("does-not-exist"), null);

    var twentyIng = [];
    var twentySteps = [];
    for (var i = 0; i < 20; i++) {
      twentyIng.push({ name: "item " + (i + 1) });
      twentySteps.push("step " + (i + 1));
    }
    var bulky = model.validateRecipe({
      title: "Big recipe",
      ingredients: twentyIng,
      steps: twentySteps
    });
    assert("supports 20 ingredients and steps", bulky.ok && bulky.data.ingredients.length === 20 && bulky.data.steps.length === 20);

    var manyTags = [];
    for (var n = 0; n < 25; n++) manyTags.push("tag" + n);
    var tagCap = model.validateRecipe({
      title: "Tagged",
      ingredients: [{ name: "salt" }],
      steps: ["Mix"],
      tags: manyTags
    });
    assertEqual("tags capped at 20", tagCap.data.tags.length, 20);

    var desc = "";
    for (var d = 0; d < 1001; d++) desc += "d";
    var longDesc = model.validateRecipe({
      title: "Long", ingredients: [{ name: "x" }], steps: ["y"], description: desc
    });
    assert("description over 1000 fails", !longDesc.ok && !!longDesc.errors.description);

    return results;
  }

  global.runRecipeTests = runRecipeTests;
})(typeof window !== "undefined" ? window : globalThis);
