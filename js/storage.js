(function (root, factory) {
  var api = factory(root.RecipeModel);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.RecipeStorage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (fallbackModel) {
  "use strict";

  var KEY = "recipe-collector.recipes.v1";
  var SAVE_ERROR = "Couldn't save your recipe. Try again.";
  var Model =
    fallbackModel ||
    (typeof require === "function" ? require("./model.js") : null);

  function memoryAdapter() {
    var data = {};
    return {
      getItem: function (k) {
        return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
      },
      setItem: function (k, v) {
        data[k] = String(v);
      },
      removeItem: function (k) {
        delete data[k];
      }
    };
  }

  function browserAdapter() {
    var ls = typeof localStorage === "undefined" ? null : localStorage;
    if (!ls) return memoryAdapter();
    return {
      getItem: function (k) {
        return ls.getItem(k);
      },
      setItem: function (k, v) {
        ls.setItem(k, v);
      },
      removeItem: function (k) {
        ls.removeItem(k);
      }
    };
  }

  function createStorage(adapter) {
    var store = adapter || browserAdapter();
    var lastWarning = null;

    function getWarning() {
      return lastWarning;
    }

    function readAll() {
      lastWarning = null;
      var raw;
      try {
        raw = store.getItem(KEY);
      } catch (e) {
        lastWarning = "Some saved recipes could not be read. You can keep using the app.";
        return [];
      }
      if (raw == null || raw === "") return [];
      var parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        lastWarning = "Some saved recipes could not be read. You can keep using the app.";
        return [];
      }
      if (!Array.isArray(parsed)) {
        lastWarning = "Some saved recipes could not be read. You can keep using the app.";
        return [];
      }
      var good = [];
      var i;
      for (i = 0; i < parsed.length; i++) {
        if (Model.isLikelyRecipe(parsed[i])) good.push(parsed[i]);
      }
      if (good.length !== parsed.length) {
        lastWarning = "Some saved recipes could not be read. You can keep using the app.";
      }
      return Model.sortByUpdatedDesc(good);
    }

    function writeAll(list) {
      try {
        store.setItem(KEY, JSON.stringify(list));
      } catch (e) {
        var err = new Error(SAVE_ERROR);
        err.cause = e;
        throw err;
      }
    }

    function listRecipes() {
      return readAll();
    }

    function getRecipe(id) {
      if (!id) return null;
      var list = readAll();
      var i;
      for (i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i];
      }
      return null;
    }

    function saveRecipe(record) {
      if (!record || !record.id) {
        throw new Error(SAVE_ERROR);
      }
      var list = readAll();
      var found = false;
      var i;
      for (i = 0; i < list.length; i++) {
        if (list[i].id === record.id) {
          list[i] = record;
          found = true;
          break;
        }
      }
      if (!found) list.push(record);
      writeAll(list);
      return record;
    }

    function deleteRecipe(id) {
      var list = readAll();
      var next = [];
      var i;
      for (i = 0; i < list.length; i++) {
        if (list[i].id !== id) next.push(list[i]);
      }
      writeAll(next);
    }

    return {
      KEY: KEY,
      SAVE_ERROR: SAVE_ERROR,
      listRecipes: listRecipes,
      getRecipe: getRecipe,
      saveRecipe: saveRecipe,
      deleteRecipe: deleteRecipe,
      getWarning: getWarning,
      readAll: readAll
    };
  }

  var defaultStorage = createStorage();
  defaultStorage.createStorage = createStorage;
  defaultStorage.memoryAdapter = memoryAdapter;
  defaultStorage.SAVE_ERROR = SAVE_ERROR;
  defaultStorage.KEY = KEY;
  return defaultStorage;
});
