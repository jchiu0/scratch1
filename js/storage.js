(function (global) {
  var STORAGE_KEY = "recipe-collector.recipes.v1";
  var SAVE_ERROR = "Couldn't save your recipe. Try again.";

  function createStorage(store) {
    function readRaw() {
      if (!store) return { recipes: [], recovery: false };
      var raw;
      try {
        raw = store.getItem(STORAGE_KEY);
      } catch (err) {
        return { recipes: [], recovery: true };
      }
      if (!raw) return { recipes: [], recovery: false };
      try {
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return { recipes: [], recovery: true };
        var recipes = [];
        var skipped = false;
        for (var i = 0; i < parsed.length; i++) {
          var rec = parsed[i];
          if (rec && typeof rec === "object" && typeof rec.id === "string" && rec.id) {
            recipes.push(rec);
          } else {
            skipped = true;
          }
        }
        return { recipes: recipes, recovery: skipped };
      } catch (err) {
        return { recipes: [], recovery: true };
      }
    }

    function writeAll(recipes) {
      if (!store) {
        var missing = new Error(SAVE_ERROR);
        throw missing;
      }
      try {
        store.setItem(STORAGE_KEY, JSON.stringify(recipes));
      } catch (err) {
        var wrapped = new Error(SAVE_ERROR);
        wrapped.cause = err;
        throw wrapped;
      }
    }

    function listRecipes() {
      var recipes = readRaw().recipes.slice();
      recipes.sort(function (a, b) {
        var av = a && a.updatedAt ? String(a.updatedAt) : "";
        var bv = b && b.updatedAt ? String(b.updatedAt) : "";
        if (av < bv) return 1;
        if (av > bv) return -1;
        return 0;
      });
      return recipes;
    }

    function getRecipe(id) {
      var recipes = readRaw().recipes;
      for (var i = 0; i < recipes.length; i++) {
        if (recipes[i].id === id) return recipes[i];
      }
      return null;
    }

    function saveRecipe(record) {
      if (!record || !record.id) {
        throw new Error(SAVE_ERROR);
      }
      var recipes = readRaw().recipes;
      var idx = -1;
      for (var i = 0; i < recipes.length; i++) {
        if (recipes[i].id === record.id) {
          idx = i;
          break;
        }
      }
      if (idx >= 0) recipes[idx] = record;
      else recipes.push(record);
      writeAll(recipes);
      return record;
    }

    function deleteRecipe(id) {
      var recipes = readRaw().recipes.filter(function (rec) {
        return rec.id !== id;
      });
      writeAll(recipes);
    }

    function hadRecovery() {
      return !!readRaw().recovery;
    }

    return {
      STORAGE_KEY: STORAGE_KEY,
      SAVE_ERROR: SAVE_ERROR,
      listRecipes: listRecipes,
      getRecipe: getRecipe,
      saveRecipe: saveRecipe,
      deleteRecipe: deleteRecipe,
      hadRecovery: hadRecovery,
      readRaw: readRaw
    };
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    SAVE_ERROR: SAVE_ERROR,
    createStorage: createStorage
  };

  if (typeof localStorage !== "undefined") {
    api.default = createStorage(localStorage);
  }

  global.RecipeStorage = api;
})(typeof window !== "undefined" ? window : globalThis);
