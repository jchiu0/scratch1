(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.RecipeModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TITLE_MAX = 120;
  var DESCRIPTION_MAX = 1000;
  var NOTES_MAX = 2000;
  var NAME_MAX = 200;
  var TAGS_MAX = 20;

  function generateId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    var s = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    return s.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function trimStr(value) {
    if (value == null) return "";
    return String(value).trim();
  }

  function isHttpUrl(value) {
    var s = trimStr(value);
    if (!s) return false;
    try {
      var u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  function normalizeTags(tags) {
    var list = tags;
    if (typeof tags === "string") {
      list = tags.split(/[,\n]/);
    }
    if (!Array.isArray(list)) list = [];
    var seen = {};
    var result = [];
    for (var i = 0; i < list.length; i++) {
      var n = trimStr(list[i]).toLowerCase();
      if (!n || seen[n]) continue;
      seen[n] = true;
      result.push(n);
      if (result.length >= TAGS_MAX) break;
    }
    return result;
  }

  function parseOptionalInt(value, min, max) {
    if (value === undefined || value === null || value === "") {
      return { present: false };
    }
    var n;
    if (typeof value === "number") {
      n = value;
    } else {
      var t = String(value).trim();
      if (!t) return { present: false };
      if (!/^-?\d+$/.test(t)) return { present: true, error: true };
      n = Number(t);
    }
    if (!Number.isInteger(n) || n < min || (max != null && n > max)) {
      return { present: true, error: true };
    }
    return { present: true, value: n };
  }

  function cleanIngredients(raw) {
    var list = Array.isArray(raw) ? raw : [];
    var cleaned = [];
    for (var i = 0; i < list.length; i++) {
      var ing = list[i] || {};
      var name = trimStr(ing.name);
      var quantity = trimStr(ing.quantity);
      var unit = trimStr(ing.unit);
      if (!name && !quantity && !unit) continue;
      var row = { name: name };
      if (quantity) row.quantity = quantity;
      if (unit) row.unit = unit;
      cleaned.push(row);
    }
    return cleaned;
  }

  function cleanSteps(raw) {
    var list = Array.isArray(raw) ? raw : [];
    var cleaned = [];
    for (var i = 0; i < list.length; i++) {
      var step = trimStr(list[i]);
      if (!step) continue;
      cleaned.push(step);
    }
    return cleaned;
  }

  function validateRecipe(input) {
    input = input || {};
    var errors = {};
    var warnings = {};

    var title = trimStr(input.title);
    if (!title) {
      errors.title = "Title is required.";
    } else if (title.length > TITLE_MAX) {
      errors.title = "Title must be 1-120 characters.";
    }

    var description = input.description == null ? "" : String(input.description);
    if (description.length > DESCRIPTION_MAX) {
      errors.description = "Description must be at most 1000 characters.";
    }
    description = description.trim();

    var notes = input.notes == null ? "" : String(input.notes);
    if (notes.length > NOTES_MAX) {
      errors.notes = "Notes must be at most 2000 characters.";
    }
    notes = notes.trim();

    var servingsRes = parseOptionalInt(input.servings, 1, 100);
    if (servingsRes.error) {
      errors.servings = "Servings must be an integer from 1 to 100.";
    }

    var prepRes = parseOptionalInt(input.prepTimeMinutes, 0, null);
    if (prepRes.error) {
      errors.prepTimeMinutes = "Prep time must be a non-negative integer.";
    }

    var cookRes = parseOptionalInt(input.cookTimeMinutes, 0, null);
    if (cookRes.error) {
      errors.cookTimeMinutes = "Cook time must be a non-negative integer.";
    }

    var ingredients = cleanIngredients(input.ingredients);
    var ingredientLines = [];
    var hasIngredientError = false;
    for (var i = 0; i < ingredients.length; i++) {
      var name = ingredients[i].name;
      if (!name) {
        ingredientLines[i] = "Ingredient name is required.";
        hasIngredientError = true;
      } else if (name.length > NAME_MAX) {
        ingredientLines[i] = "Ingredient name must be 1-200 characters.";
        hasIngredientError = true;
      }
    }
    if (ingredients.length < 1) {
      errors.ingredients = "Add at least one ingredient.";
    }
    if (hasIngredientError) {
      errors.ingredientLines = ingredientLines;
      if (!errors.ingredients) errors.ingredients = "Fix the highlighted ingredients.";
    }

    var steps = cleanSteps(input.steps);
    if (steps.length < 1) {
      errors.steps = "Add at least one step.";
    }

    var tags = normalizeTags(input.tags);
    var imageUrl = trimStr(input.imageUrl);
    if (imageUrl && !isHttpUrl(imageUrl)) {
      warnings.imageUrl =
        "Image URL does not look valid; it will be ignored when displaying.";
    }

    var value = { title: title, ingredients: ingredients, steps: steps, tags: tags };
    if (description) value.description = description;
    if (notes) value.notes = notes;
    if (servingsRes.present && !servingsRes.error) value.servings = servingsRes.value;
    if (prepRes.present && !prepRes.error) value.prepTimeMinutes = prepRes.value;
    if (cookRes.present && !cookRes.error) value.cookTimeMinutes = cookRes.value;
    if (imageUrl) value.imageUrl = imageUrl;

    return {
      ok: Object.keys(errors).length === 0,
      errors: errors,
      warnings: warnings,
      value: value
    };
  }

  function createRecipeRecord(input) {
    var result = validateRecipe(input);
    if (!result.ok) {
      var err = new Error("Invalid recipe");
      err.validation = result;
      throw err;
    }
    var now = new Date().toISOString();
    var record = {};
    var k;
    for (k in result.value) {
      if (Object.prototype.hasOwnProperty.call(result.value, k)) {
        record[k] = result.value[k];
      }
    }
    record.id = generateId();
    record.createdAt = now;
    record.updatedAt = now;
    return record;
  }

  function applyRecipeUpdate(existing, input) {
    var result = validateRecipe(input);
    if (!result.ok) {
      var err = new Error("Invalid recipe");
      err.validation = result;
      throw err;
    }
    var record = {};
    var k;
    for (k in result.value) {
      if (Object.prototype.hasOwnProperty.call(result.value, k)) {
        record[k] = result.value[k];
      }
    }
    record.id = existing.id;
    record.createdAt = existing.createdAt;
    record.updatedAt = new Date().toISOString();
    return record;
  }

  function formatIngredient(ing) {
    ing = ing || {};
    var parts = [];
    if (trimStr(ing.quantity)) parts.push(trimStr(ing.quantity));
    if (trimStr(ing.unit)) parts.push(trimStr(ing.unit));
    if (trimStr(ing.name)) parts.push(trimStr(ing.name));
    return parts.join(" ");
  }

  function formatTotalTime(recipe) {
    recipe = recipe || {};
    var hasP = Number.isInteger(recipe.prepTimeMinutes);
    var hasC = Number.isInteger(recipe.cookTimeMinutes);
    if (!hasP && !hasC) return "";
    var total = (hasP ? recipe.prepTimeMinutes : 0) + (hasC ? recipe.cookTimeMinutes : 0);
    return total + " min";
  }

  function filterRecipes(recipes, query) {
    var list = Array.isArray(recipes) ? recipes : [];
    var q = trimStr(query).toLowerCase();
    if (!q) return list.slice();
    return list.filter(function (r) {
      if ((r.title || "").toLowerCase().indexOf(q) !== -1) return true;
      var tags = r.tags || [];
      var t;
      for (t = 0; t < tags.length; t++) {
        if (String(tags[t]).toLowerCase().indexOf(q) !== -1) return true;
      }
      var ings = r.ingredients || [];
      var i;
      for (i = 0; i < ings.length; i++) {
        if (trimStr(ings[i] && ings[i].name).toLowerCase().indexOf(q) !== -1) return true;
      }
      return false;
    });
  }

  function parseRoute(hash) {
    var raw = String(hash == null ? "" : hash).replace(/^#/, "");
    if (!raw) raw = "/";
    var qIndex = raw.indexOf("?");
    var pathPart = qIndex === -1 ? raw : raw.slice(0, qIndex);
    var queryPart = qIndex === -1 ? "" : raw.slice(qIndex + 1);
    var path = pathPart || "/";
    if (path.charAt(0) !== "/") path = "/" + path;
    if (path.length > 1 && path.slice(-1) === "/") path = path.slice(0, -1);

    var q = "";
    var params = queryPart.split("&");
    var p;
    for (p = 0; p < params.length; p++) {
      if (!params[p]) continue;
      var pair = params[p].split("=");
      var key = decodeURIComponent(pair[0] || "");
      if (key === "q") {
        try {
          q = decodeURIComponent((pair.slice(1).join("=") || "").replace(/\+/g, " "));
        } catch (e) {
          q = pair.slice(1).join("=") || "";
        }
      }
    }

    if (path === "/") return { name: "collection", q: q };
    if (path === "/recipes/new") return { name: "create", q: q };

    var editMatch = path.match(/^\/recipes\/([^/]+)\/edit$/);
    if (editMatch) {
      return { name: "edit", id: decodeURIComponent(editMatch[1]), q: q };
    }
    var detailMatch = path.match(/^\/recipes\/([^/]+)$/);
    if (detailMatch) {
      var id = decodeURIComponent(detailMatch[1]);
      if (id === "new") return { name: "create", q: q };
      return { name: "detail", id: id, q: q };
    }
    return { name: "unknown", q: q };
  }

  function sortByUpdatedDesc(recipes) {
    return recipes.slice().sort(function (a, b) {
      var av = a && a.updatedAt ? String(a.updatedAt) : "";
      var bv = b && b.updatedAt ? String(b.updatedAt) : "";
      if (av === bv) return 0;
      return av > bv ? -1 : 1;
    });
  }

  function isLikelyRecipe(item) {
    return !!(item && typeof item === "object" && item.id && item.title);
  }

  return {
    generateId: generateId,
    normalizeTags: normalizeTags,
    validateRecipe: validateRecipe,
    createRecipeRecord: createRecipeRecord,
    applyRecipeUpdate: applyRecipeUpdate,
    formatIngredient: formatIngredient,
    formatTotalTime: formatTotalTime,
    filterRecipes: filterRecipes,
    parseRoute: parseRoute,
    sortByUpdatedDesc: sortByUpdatedDesc,
    isHttpUrl: isHttpUrl,
    isLikelyRecipe: isLikelyRecipe,
    SAVE_ERROR: "Couldn't save your recipe. Try again."
  };
});
