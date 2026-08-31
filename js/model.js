(function (global) {
  var TITLE_MAX = 120;
  var DESC_MAX = 1000;
  var NOTES_MAX = 2000;
  var NAME_MAX = 200;
  var TAGS_MAX = 20;

  function trim(value) {
    return String(value == null ? "" : value).trim();
  }

  function isValidUrl(url) {
    if (!url) return true;
    try {
      var parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (err) {
      return false;
    }
  }

  function normalizeTags(tags) {
    if (!tags) return [];
    var list = Array.isArray(tags) ? tags : String(tags).split(/[,\n]/);
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var tag = trim(list[i]).toLowerCase();
      if (!tag || seen[tag]) continue;
      seen[tag] = true;
      out.push(tag);
      if (out.length >= TAGS_MAX) break;
    }
    return out;
  }

  function parseOptionalInt(value, min, max) {
    if (value === "" || value == null) return { empty: true };
    if (typeof value === "string" && trim(value) === "") return { empty: true };
    var n = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(n)) return { invalid: true };
    if (min != null && n < min) return { invalid: true };
    if (max != null && n > max) return { invalid: true };
    return { value: n };
  }

  function collectIngredients(input) {
    var source = Array.isArray(input && input.ingredients) ? input.ingredients : [];
    var ingredients = [];
    var lineErrors = [];
    var hasLineError = false;
    for (var i = 0; i < source.length; i++) {
      var ing = source[i] || {};
      var name = trim(ing.name);
      var quantity = trim(ing.quantity);
      var unit = trim(ing.unit);
      if (!name && !quantity && !unit) continue;
      if (!name) {
        lineErrors[ingredients.length] = "Ingredient name is required.";
        hasLineError = true;
      } else if (name.length > NAME_MAX) {
        lineErrors[ingredients.length] = "Ingredient name must be 200 characters or fewer.";
        hasLineError = true;
      }
      ingredients.push({
        name: name,
        quantity: quantity || undefined,
        unit: unit || undefined
      });
    }
    return { ingredients: ingredients, lineErrors: lineErrors, hasLineError: hasLineError };
  }

  function collectSteps(input) {
    var source = Array.isArray(input && input.steps) ? input.steps : [];
    var steps = [];
    for (var i = 0; i < source.length; i++) {
      var raw = source[i];
      var text = trim(typeof raw === "string" ? raw : raw && raw.text);
      if (!text) continue;
      steps.push(text);
    }
    return steps;
  }

  function validateRecipe(input) {
    input = input || {};
    var errors = {};
    var warnings = {};
    var data = {};

    var title = trim(input.title);
    if (!title) errors.title = "Title is required.";
    else if (title.length > TITLE_MAX) errors.title = "Title must be 120 characters or fewer.";
    else data.title = title;

    var description = trim(input.description);
    if (description.length > DESC_MAX) errors.description = "Description must be 1000 characters or fewer.";
    else if (description) data.description = description;

    var notes = trim(input.notes);
    if (notes.length > NOTES_MAX) errors.notes = "Notes must be 2000 characters or fewer.";
    else if (notes) data.notes = notes;

    var servings = parseOptionalInt(input.servings, 1, 100);
    if (servings.invalid) errors.servings = "Servings must be a whole number from 1 to 100.";
    else if (!servings.empty) data.servings = servings.value;

    var prep = parseOptionalInt(input.prepTimeMinutes, 0, null);
    if (prep.invalid) errors.prepTimeMinutes = "Prep time must be a whole number of 0 or more.";
    else if (!prep.empty) data.prepTimeMinutes = prep.value;

    var cook = parseOptionalInt(input.cookTimeMinutes, 0, null);
    if (cook.invalid) errors.cookTimeMinutes = "Cook time must be a whole number of 0 or more.";
    else if (!cook.empty) data.cookTimeMinutes = cook.value;

    var collected = collectIngredients(input);
    data.ingredients = collected.ingredients;
    if (collected.ingredients.length === 0) {
      errors.ingredients = "Add at least one ingredient.";
    } else if (collected.hasLineError) {
      errors.ingredients = "Each ingredient needs a name (1-200 characters).";
      errors.ingredientLines = collected.lineErrors;
    }

    var steps = collectSteps(input);
    data.steps = steps;
    if (steps.length === 0) errors.steps = "Add at least one step.";

    data.tags = normalizeTags(input.tags);

    var imageUrl = trim(input.imageUrl);
    if (imageUrl) {
      data.imageUrl = imageUrl;
      if (!isValidUrl(imageUrl)) {
        warnings.imageUrl = "That image URL does not look valid; it will be saved but may not display.";
      }
    }

    return {
      ok: Object.keys(errors).length === 0,
      errors: errors,
      warnings: warnings,
      data: data
    };
  }

  function generateId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function stamp(data, extra) {
    var record = {
      id: extra.id,
      title: data.title,
      ingredients: data.ingredients,
      steps: data.steps,
      tags: data.tags || [],
      createdAt: extra.createdAt,
      updatedAt: extra.updatedAt
    };
    if (data.description) record.description = data.description;
    if (data.servings != null) record.servings = data.servings;
    if (data.prepTimeMinutes != null) record.prepTimeMinutes = data.prepTimeMinutes;
    if (data.cookTimeMinutes != null) record.cookTimeMinutes = data.cookTimeMinutes;
    if (data.notes) record.notes = data.notes;
    if (data.imageUrl) record.imageUrl = data.imageUrl;
    return record;
  }

  function createRecipeRecord(input) {
    var result = validateRecipe(input);
    if (!result.ok) {
      var err = new Error("Invalid recipe");
      err.validation = result;
      throw err;
    }
    var ts = nowIso();
    return stamp(result.data, { id: generateId(), createdAt: ts, updatedAt: ts });
  }

  function applyRecipeUpdate(existing, input) {
    var result = validateRecipe(input);
    if (!result.ok) {
      var err = new Error("Invalid recipe");
      err.validation = result;
      throw err;
    }
    return stamp(result.data, {
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: nowIso()
    });
  }

  function formatIngredientLine(ing) {
    if (!ing) return "";
    return [ing.quantity, ing.unit, ing.name].filter(Boolean).join(" ");
  }

  function totalTimeMinutes(recipe) {
    if (!recipe) return null;
    var hasPrep = Number.isInteger(recipe.prepTimeMinutes);
    var hasCook = Number.isInteger(recipe.cookTimeMinutes);
    if (!hasPrep && !hasCook) return null;
    return (hasPrep ? recipe.prepTimeMinutes : 0) + (hasCook ? recipe.cookTimeMinutes : 0);
  }

  function recipeMatchesQuery(recipe, query) {
    var q = trim(query).toLowerCase();
    if (!q) return true;
    if (!recipe) return false;
    if (String(recipe.title || "").toLowerCase().indexOf(q) !== -1) return true;
    var tags = recipe.tags || [];
    for (var i = 0; i < tags.length; i++) {
      if (String(tags[i]).toLowerCase().indexOf(q) !== -1) return true;
    }
    var ingredients = recipe.ingredients || [];
    for (var j = 0; j < ingredients.length; j++) {
      if (String(ingredients[j].name || "").toLowerCase().indexOf(q) !== -1) return true;
    }
    return false;
  }

  function filterRecipes(recipes, query) {
    var list = Array.isArray(recipes) ? recipes : [];
    return list.filter(function (recipe) {
      return recipeMatchesQuery(recipe, query);
    });
  }

  global.RecipeModel = {
    validateRecipe: validateRecipe,
    createRecipeRecord: createRecipeRecord,
    applyRecipeUpdate: applyRecipeUpdate,
    normalizeTags: normalizeTags,
    formatIngredientLine: formatIngredientLine,
    totalTimeMinutes: totalTimeMinutes,
    recipeMatchesQuery: recipeMatchesQuery,
    filterRecipes: filterRecipes,
    isValidUrl: isValidUrl
  };
})(typeof window !== "undefined" ? window : globalThis);
