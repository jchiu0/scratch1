(function () {
  "use strict";

  var Model = window.RecipeModel;
  var storage = window.RecipeStorage;
  var appRoot = document.getElementById("app");
  var toastEl = document.getElementById("toast");
  var dialog = document.getElementById("confirm-dialog");
  var dialogTitle = document.getElementById("confirm-title");
  var dialogBody = document.getElementById("confirm-body");
  var dialogCancel = document.getElementById("confirm-cancel");
  var dialogOk = document.getElementById("confirm-ok");
  var saving = false;
  var toastTimer = null;
  var searchTimer = null;
  var lastFocus = null;
  var dialogResolver = null;

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setTitle(text) {
    document.title = text + " · Recipe Collector";
  }

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.hidden = true;
    }, 2400);
  }

  function navigate(path, replace) {
    if (replace) location.replace("#" + path);
    else location.hash = path;
  }

  function currentRoute() {
    return Model.parseRoute(location.hash || "#/");
  }

  function fieldError(id, message) {
    if (!message) return "";
    return (
      '<p class="field-error" id="' +
      id +
      '-error" role="alert">' +
      escapeHtml(message) +
      "</p>"
    );
  }

  function describedBy(id, hasError) {
    return hasError
      ? ' aria-invalid="true" aria-describedby="' + id + '-error"'
      : "";
  }

  function emptyIngredient() {
    return { quantity: "", unit: "", name: "" };
  }

  function formStateFromRecipe(recipe) {
    recipe = recipe || {};
    var ingredients =
      recipe.ingredients && recipe.ingredients.length
        ? recipe.ingredients.map(function (ing) {
            return {
              quantity: ing.quantity || "",
              unit: ing.unit || "",
              name: ing.name || ""
            };
          })
        : [emptyIngredient()];
    var steps = recipe.steps && recipe.steps.length ? recipe.steps.slice() : [""];
    return {
      title: recipe.title || "",
      description: recipe.description || "",
      servings: recipe.servings != null ? String(recipe.servings) : "",
      prepTimeMinutes:
        recipe.prepTimeMinutes != null ? String(recipe.prepTimeMinutes) : "",
      cookTimeMinutes:
        recipe.cookTimeMinutes != null ? String(recipe.cookTimeMinutes) : "",
      ingredients: ingredients.slice(),
      steps: steps,
      tags: (recipe.tags || []).join(", "),
      notes: recipe.notes || "",
      imageUrl: recipe.imageUrl || ""
    };
  }

  function fieldValue(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value : "";
  }

  function readForm(form) {
    var ingredients = [];
    var ingRows = form.querySelectorAll("[data-ingredient-row]");
    var i;
    for (i = 0; i < ingRows.length; i++) {
      ingredients.push({
        quantity: ingRows[i].querySelector('[name="ing-quantity"]').value,
        unit: ingRows[i].querySelector('[name="ing-unit"]').value,
        name: ingRows[i].querySelector('[name="ing-name"]').value
      });
    }
    var steps = [];
    var stepRows = form.querySelectorAll('[name="step"]');
    for (i = 0; i < stepRows.length; i++) steps.push(stepRows[i].value);
    return {
      title: fieldValue(form, "title"),
      description: fieldValue(form, "description"),
      servings: fieldValue(form, "servings"),
      prepTimeMinutes: fieldValue(form, "prepTimeMinutes"),
      cookTimeMinutes: fieldValue(form, "cookTimeMinutes"),
      ingredients: ingredients,
      steps: steps,
      tags: fieldValue(form, "tags"),
      notes: fieldValue(form, "notes"),
      imageUrl: fieldValue(form, "imageUrl")
    };
  }

  function snapshotForm(form) {
    return JSON.stringify(readForm(form));
  }

  function isFormDirty(form) {
    if (!form) return false;
    return form.getAttribute("data-clean") !== snapshotForm(form);
  }

  function openConfirm(opts) {
    return new Promise(function (resolve) {
      dialogResolver = resolve;
      lastFocus = document.activeElement;
      dialogTitle.textContent = opts.title || "Please confirm";
      dialogBody.textContent = opts.body || "";
      dialogOk.textContent = opts.okLabel || "Confirm";
      dialogOk.className = "btn " + (opts.danger ? "btn-danger" : "btn-primary");
      dialogOk.disabled = false;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      dialogOk.focus();
    });
  }

  function closeConfirm(result) {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    if (dialogResolver) {
      var r = dialogResolver;
      dialogResolver = null;
      r(result);
    }
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function trapDialogFocus(event) {
    if (!dialog.open && !dialog.hasAttribute("open")) return;
    if (event.key !== "Tab") return;
    var focusable = dialog.querySelectorAll("button");
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  dialogCancel.addEventListener("click", function () {
    closeConfirm(false);
  });
  dialogOk.addEventListener("click", function () {
    closeConfirm(true);
  });
  dialog.addEventListener("cancel", function (event) {
    event.preventDefault();
    closeConfirm(false);
  });
  dialog.addEventListener("keydown", trapDialogFocus);

  function maybeDiscard(form) {
    if (!form) return Promise.resolve(true);
    if (!isFormDirty(form)) return Promise.resolve(true);
    return openConfirm({
      title: "Discard changes?",
      body: "You have unsaved changes. Leave this form without saving?",
      okLabel: "Discard",
      danger: true
    });
  }

  function renderRecoveryBanner() {
    var warning = storage.getWarning && storage.getWarning();
    if (!warning) return "";
    return '<div class="banner" role="status">' + escapeHtml(warning) + "</div>";
  }

  function renderTags(tags, limit) {
    tags = tags || [];
    var shown = typeof limit === "number" ? tags.slice(0, limit) : tags;
    if (!shown.length) return "";
    return (
      '<div class="tags">' +
      shown
        .map(function (tag) {
          return (
            '<button type="button" class="tag" data-tag-filter="' +
            escapeHtml(tag) +
            '">#' +
            escapeHtml(tag) +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderCollection(route) {
    var recipes = storage.listRecipes();
    var query = route.q || "";
    var filtered = Model.filterRecipes(recipes, query);
    setTitle("Recipes");
    var html = renderRecoveryBanner();
    html += '<div class="page-head"><div>';
    html += "<h1>Recipes</h1>";
    html += '<p class="muted">A local recipe box in your browser.</p></div>';
    html +=
      '<a class="btn btn-primary" href="#/recipes/new">' +
      (recipes.length ? "New recipe" : "Add your first recipe") +
      "</a></div>";
    html +=
      '<div class="search-row"><label for="search">Search recipes</label>';
    html +=
      '<input id="search" type="search" placeholder="Search by title, ingredient, or tag" value="' +
      escapeHtml(query) +
      '"></div>';

    if (!recipes.length) {
      html +=
        '<div class="empty"><h2>No recipes yet</h2><p>Add a dish you already know. Ingredients and steps are enough.</p>';
      html +=
        '<a class="btn btn-primary" href="#/recipes/new">Add your first recipe</a></div>';
      appRoot.innerHTML = html;
      return;
    }

    if (!filtered.length) {
      html +=
        '<div class="empty"><h2>No matching recipes</h2><p>Nothing matched "' +
        escapeHtml(query) +
        '".</p></div>';
      appRoot.innerHTML = html;
      bindCollection();
      return;
    }

    html += '<div class="recipe-grid">';
    filtered.forEach(function (recipe) {
      var bits = [];
      var time = Model.formatTotalTime(recipe);
      if (time) bits.push(time);
      if (recipe.servings) bits.push(recipe.servings + " servings");
      html += '<article class="recipe-card">';
      html +=
        '<a class="recipe-card-link" href="#/recipes/' +
        encodeURIComponent(recipe.id) +
        '">';
      html += "<h2>" + escapeHtml(recipe.title) + "</h2>";
      if (bits.length) {
        html += '<p class="meta">' + escapeHtml(bits.join(" · ")) + "</p>";
      }
      html += "</a>";
      html += renderTags(recipe.tags, 3);
      html += "</article>";
    });
    html += "</div>";
    appRoot.innerHTML = html;
    bindCollection();
  }

  function bindCollection() {
    var search = document.getElementById("search");
    if (!search) return;
    search.addEventListener("input", function () {
      clearTimeout(searchTimer);
      var value = search.value;
      searchTimer = setTimeout(function () {
        var next = value.trim() ? "/?q=" + encodeURIComponent(value.trim()) : "/";
        navigate(next, true);
      }, 180);
    });
  }

  function renderNotFound() {
    setTitle("Recipe not found");
    appRoot.innerHTML =
      '<div class="empty"><h1>Recipe not found</h1><p>That recipe is missing or was deleted.</p>' +
      '<a class="btn btn-primary" href="#/">Back to collection</a></div>';
  }

  function renderUnknown() {
    setTitle("Not found");
    appRoot.innerHTML =
      '<div class="empty"><h1>Page not found</h1><p>That link does not match a screen in this app.</p>' +
      '<a class="btn btn-primary" href="#/">Back to collection</a></div>';
  }

  function renderDetail(id) {
    var recipe = storage.getRecipe(id);
    if (!recipe) {
      renderNotFound();
      return;
    }
    setTitle(recipe.title);
    var html = '<article class="detail">';
    if (recipe.imageUrl && Model.isHttpUrl(recipe.imageUrl)) {
      html +=
        '<img src="' +
        escapeHtml(recipe.imageUrl) +
        '" alt="' +
        escapeHtml(recipe.title) +
        '" data-optional-image>';
    }
    html += "<h1>" + escapeHtml(recipe.title) + "</h1>";
    html += '<div class="detail-actions">';
    html += '<a class="btn btn-ghost" href="#/">Back to collection</a>';
    html +=
      '<a class="btn" href="#/recipes/' +
      encodeURIComponent(recipe.id) +
      '/edit">Edit</a>';
    html +=
      '<button type="button" class="btn btn-danger" id="delete-recipe">Delete</button>';
    html += "</div>";
    var meta = [];
    var time = Model.formatTotalTime(recipe);
    if (time) meta.push(time + " total");
    if (recipe.servings) meta.push(recipe.servings + " servings");
    if (recipe.prepTimeMinutes != null) meta.push(recipe.prepTimeMinutes + " min prep");
    if (recipe.cookTimeMinutes != null) meta.push(recipe.cookTimeMinutes + " min cook");
    if (meta.length) html += '<p class="meta">' + escapeHtml(meta.join(" · ")) + "</p>";
    if (recipe.description) html += "<p>" + escapeHtml(recipe.description) + "</p>";
    html += renderTags(recipe.tags);
    html += '<h2>Ingredients</h2><ul class="ingredient-list">';
    recipe.ingredients.forEach(function (ing) {
      html += "<li>" + escapeHtml(Model.formatIngredient(ing)) + "</li>";
    });
    html += '</ul><h2>Steps</h2><ol class="step-list">';
    recipe.steps.forEach(function (step) {
      html += "<li>" + escapeHtml(step) + "</li>";
    });
    html += "</ol>";
    if (recipe.notes) {
      html += "<h2>Notes</h2><p>" + escapeHtml(recipe.notes) + "</p>";
    }
    html += "</article>";
    appRoot.innerHTML = html;

    var img = appRoot.querySelector("[data-optional-image]");
    if (img) {
      img.addEventListener("error", function () {
        img.remove();
      });
    }
    document.getElementById("delete-recipe").addEventListener("click", function () {
      openConfirm({
        title: "Delete recipe?",
        body: 'Delete "' + recipe.title + '"? This cannot be undone.',
        okLabel: "Delete",
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        try {
          storage.deleteRecipe(recipe.id);
          showToast("Recipe deleted");
          navigate("/");
        } catch (e) {
          showToast(storage.SAVE_ERROR || Model.SAVE_ERROR);
        }
      });
    });
  }

  function ingredientRowHtml(ing, index, lineError) {
    ing = ing || emptyIngredient();
    var html = '<div class="list-row ingredient-row" data-ingredient-row>';
    html +=
      '<div class="field"><label for="ing-qty-' +
      index +
      '">Quantity ' +
      (index + 1) +
      "</label>";
    html +=
      '<input id="ing-qty-' +
      index +
      '" name="ing-quantity" type="text" placeholder="2" value="' +
      escapeHtml(ing.quantity || "") +
      '"></div>';
    html +=
      '<div class="field"><label for="ing-unit-' +
      index +
      '">Unit ' +
      (index + 1) +
      "</label>";
    html +=
      '<input id="ing-unit-' +
      index +
      '" name="ing-unit" type="text" placeholder="cups" value="' +
      escapeHtml(ing.unit || "") +
      '"></div>';
    html +=
      '<div class="field"><label for="ing-name-' +
      index +
      '">Ingredient ' +
      (index + 1) +
      "</label>";
    html +=
      '<input id="ing-name-' +
      index +
      '" name="ing-name" type="text" placeholder="flour" value="' +
      escapeHtml(ing.name || "") +
      '"' +
      describedBy("ing-name-" + index, !!lineError) +
      "></div>";
    html += '<div class="row-actions">';
    html +=
      '<button type="button" class="btn" data-move-ing="-1" aria-label="Move ingredient ' +
      (index + 1) +
      ' up">Up</button>';
    html +=
      '<button type="button" class="btn" data-move-ing="1" aria-label="Move ingredient ' +
      (index + 1) +
      ' down">Down</button>';
    html +=
      '<button type="button" class="btn" data-remove-ing aria-label="Remove ingredient ' +
      (index + 1) +
      '">Remove</button>';
    html += "</div>";
    if (lineError) html += fieldError("ing-name-" + index, lineError);
    html += "</div>";
    return html;
  }

  function stepRowHtml(step, index) {
    var html = '<div class="list-row step-row" data-step-row>';
    html +=
      '<div class="field"><label for="step-' +
      index +
      '">Step ' +
      (index + 1) +
      "</label>";
    html +=
      '<textarea id="step-' +
      index +
      '" name="step" rows="2" placeholder="What to do">' +
      escapeHtml(step || "") +
      "</textarea></div>";
    html += '<div class="row-actions">';
    html +=
      '<button type="button" class="btn" data-move-step="-1" aria-label="Move step ' +
      (index + 1) +
      ' up">Up</button>';
    html +=
      '<button type="button" class="btn" data-move-step="1" aria-label="Move step ' +
      (index + 1) +
      ' down">Down</button>';
    html +=
      '<button type="button" class="btn" data-remove-step aria-label="Remove step ' +
      (index + 1) +
      '">Remove</button>';
    html += "</div></div>";
    return html;
  }

  function renderForm(opts) {
    var state = opts.state;
    var errors = opts.errors || {};
    var warnings = opts.warnings || {};
    var heading =
      opts.mode === "edit" ? "Edit " + (opts.originalTitle || "recipe") : "New recipe";
    setTitle(
      opts.mode === "edit" ? "Edit " + (opts.originalTitle || "recipe") : "New recipe"
    );
    var html = '<div class="page-head"><div><h1>' + escapeHtml(heading) + "</h1>";
    html +=
      '<p class="muted">Title, at least one ingredient, and one step are required.</p></div>';
    html += '<a class="btn btn-ghost" href="#/" data-cancel>Back to collection</a></div>';
    html += '<form class="form" id="recipe-form" novalidate>';
    html += '<div class="field"><label for="title">Title</label>';
    html +=
      '<input id="title" name="title" type="text" maxlength="120" required value="' +
      escapeHtml(state.title) +
      '"' +
      describedBy("title", !!errors.title) +
      ">";
    html += fieldError("title", errors.title) + "</div>";

    html += '<div class="field"><label for="description">Description</label>';
    html +=
      '<textarea id="description" name="description" maxlength="1000"' +
      describedBy("description", !!errors.description) +
      ">" +
      escapeHtml(state.description) +
      "</textarea>";
    html += fieldError("description", errors.description) + "</div>";

    html += '<div class="row-2">';
    html += '<div class="field"><label for="servings">Servings</label>';
    html +=
      '<input id="servings" name="servings" type="number" min="1" max="100" value="' +
      escapeHtml(state.servings) +
      '"' +
      describedBy("servings", !!errors.servings) +
      ">";
    html += fieldError("servings", errors.servings) + "</div>";
    html += '<div class="field"><label for="prepTimeMinutes">Prep time (minutes)</label>';
    html +=
      '<input id="prepTimeMinutes" name="prepTimeMinutes" type="number" min="0" value="' +
      escapeHtml(state.prepTimeMinutes) +
      '"' +
      describedBy("prepTimeMinutes", !!errors.prepTimeMinutes) +
      ">";
    html += fieldError("prepTimeMinutes", errors.prepTimeMinutes) + "</div>";
    html += '<div class="field"><label for="cookTimeMinutes">Cook time (minutes)</label>';
    html +=
      '<input id="cookTimeMinutes" name="cookTimeMinutes" type="number" min="0" value="' +
      escapeHtml(state.cookTimeMinutes) +
      '"' +
      describedBy("cookTimeMinutes", !!errors.cookTimeMinutes) +
      ">";
    html += fieldError("cookTimeMinutes", errors.cookTimeMinutes) + "</div></div>";

    html += '<div class="field"><span id="ingredients-label">Ingredients</span>';
    if (errors.ingredients) html += fieldError("ingredients", errors.ingredients);
    html += '<div class="list-editor" id="ingredient-editor">';
    state.ingredients.forEach(function (ing, i) {
      var lineErr = errors.ingredientLines && errors.ingredientLines[i];
      html += ingredientRowHtml(ing, i, lineErr);
    });
    html += "</div>";
    html += '<button type="button" class="btn" id="add-ingredient">Add ingredient</button></div>';

    html += '<div class="field"><span id="steps-label">Steps</span>';
    if (errors.steps) html += fieldError("steps", errors.steps);
    html += '<div class="list-editor" id="step-editor">';
    state.steps.forEach(function (step, i) {
      html += stepRowHtml(step, i);
    });
    html += "</div>";
    html += '<button type="button" class="btn" id="add-step">Add step</button></div>';

    html += '<div class="field"><label for="tags">Tags</label>';
    html +=
      '<input id="tags" name="tags" type="text" placeholder="lunch, soup" value="' +
      escapeHtml(state.tags) +
      '">';
    html += '<p class="muted">Comma-separated. Duplicates are stored once, lowercase.</p></div>';

    html += '<div class="field"><label for="notes">Notes</label>';
    html +=
      '<textarea id="notes" name="notes" maxlength="2000"' +
      describedBy("notes", !!errors.notes) +
      ">" +
      escapeHtml(state.notes) +
      "</textarea>";
    html += fieldError("notes", errors.notes) + "</div>";

    html += '<div class="field"><label for="imageUrl">Image URL</label>';
    html +=
      '<input id="imageUrl" name="imageUrl" type="url" placeholder="https://" value="' +
      escapeHtml(state.imageUrl) +
      '">';
    if (warnings.imageUrl) {
      html += '<p class="warning">' + escapeHtml(warnings.imageUrl) + "</p>";
    }
    html += "</div>";

    html += '<div class="form-actions">';
    html += '<button type="submit" class="btn btn-primary" id="save-recipe">Save</button>';
    html += '<button type="button" class="btn" data-cancel>Cancel</button>';
    html += "</div></form>";

    appRoot.innerHTML = html;
    var form = document.getElementById("recipe-form");
    if (!opts.originalClean) opts.originalClean = snapshotForm(form);
    form.setAttribute("data-clean", opts.originalClean);
    bindForm(form, opts);
  }

  function moveItem(list, index, delta) {
    var next = index + delta;
    if (next < 0 || next >= list.length) return list;
    var copy = list.slice();
    var tmp = copy[index];
    copy[index] = copy[next];
    copy[next] = tmp;
    return copy;
  }

  function reindexAndKeep(form, opts, mutate) {
    var state = readForm(form);
    mutate(state);
    if (!state.ingredients.length) state.ingredients = [emptyIngredient()];
    if (!state.steps.length) state.steps = [""];
    opts.state = state;
    opts.errors = {};
    renderForm(opts);
  }

  function leaveForm(opts) {
    if (opts.mode === "edit") {
      navigate("/recipes/" + encodeURIComponent(opts.existing.id));
    } else {
      navigate("/");
    }
  }

  function bindForm(form, opts) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (saving || opts.submitted) return;
      var input = readForm(form);
      var result = Model.validateRecipe(input);
      if (!result.ok) {
        opts.state = input;
        opts.errors = result.errors;
        opts.warnings = result.warnings;
        renderForm(opts);
        var focusable = appRoot.querySelector('[aria-invalid="true"]');
        if (focusable) focusable.focus();
        return;
      }
      opts.submitted = true;
      saving = true;
      var saveBtn = document.getElementById("save-recipe");
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
      }
      try {
        var record;
        if (opts.mode === "edit") {
          record = Model.applyRecipeUpdate(opts.existing, input);
        } else {
          record = Model.createRecipeRecord(input);
        }
        storage.saveRecipe(record);
        form.setAttribute("data-clean", snapshotForm(form));
        showToast("Recipe saved");
        navigate("/recipes/" + encodeURIComponent(record.id));
      } catch (e) {
        opts.submitted = false;
        showToast((e && e.message) || storage.SAVE_ERROR || Model.SAVE_ERROR);
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save";
        }
      } finally {
        saving = false;
      }
    });

    document.getElementById("add-ingredient").addEventListener("click", function () {
      reindexAndKeep(form, opts, function (state) {
        state.ingredients.push(emptyIngredient());
      });
    });
    document.getElementById("add-step").addEventListener("click", function () {
      reindexAndKeep(form, opts, function (state) {
        state.steps.push("");
      });
    });

    form.addEventListener("click", function (event) {
      var removeIng = event.target.closest("[data-remove-ing]");
      var moveIngBtn = event.target.closest("[data-move-ing]");
      var removeStep = event.target.closest("[data-remove-step]");
      var moveStepBtn = event.target.closest("[data-move-step]");
      var ingRow = event.target.closest("[data-ingredient-row]");
      var stepRow = event.target.closest("[data-step-row]");
      if (removeIng && ingRow) {
        var ingIndex = Array.prototype.indexOf.call(
          form.querySelectorAll("[data-ingredient-row]"),
          ingRow
        );
        reindexAndKeep(form, opts, function (state) {
          state.ingredients.splice(ingIndex, 1);
        });
      }
      if (moveIngBtn && ingRow) {
        var moveIng = Number(moveIngBtn.getAttribute("data-move-ing"));
        var fromIng = Array.prototype.indexOf.call(
          form.querySelectorAll("[data-ingredient-row]"),
          ingRow
        );
        reindexAndKeep(form, opts, function (state) {
          state.ingredients = moveItem(state.ingredients, fromIng, moveIng);
        });
      }
      if (removeStep && stepRow) {
        var stepIndex = Array.prototype.indexOf.call(
          form.querySelectorAll("[data-step-row]"),
          stepRow
        );
        reindexAndKeep(form, opts, function (state) {
          state.steps.splice(stepIndex, 1);
        });
      }
      if (moveStepBtn && stepRow) {
        var moveStep = Number(moveStepBtn.getAttribute("data-move-step"));
        var fromStep = Array.prototype.indexOf.call(
          form.querySelectorAll("[data-step-row]"),
          stepRow
        );
        reindexAndKeep(form, opts, function (state) {
          state.steps = moveItem(state.steps, fromStep, moveStep);
        });
      }
    });

    var cancels = appRoot.querySelectorAll("[data-cancel]");
    var c;
    for (c = 0; c < cancels.length; c++) {
      cancels[c].addEventListener("click", function (event) {
        event.preventDefault();
        maybeDiscard(form).then(function (ok) {
          if (!ok) return;
          form.setAttribute("data-clean", snapshotForm(form));
          leaveForm(opts);
        });
      });
    }
  }

  function renderCreate() {
    renderForm({
      mode: "create",
      state: formStateFromRecipe(null),
      errors: {},
      warnings: {}
    });
  }

  function renderEdit(id) {
    var recipe = storage.getRecipe(id);
    if (!recipe) {
      renderNotFound();
      return;
    }
    renderForm({
      mode: "edit",
      existing: recipe,
      originalTitle: recipe.title,
      state: formStateFromRecipe(recipe),
      errors: {},
      warnings: {}
    });
  }

  function render() {
    saving = false;
    var route = currentRoute();
    if (route.name === "collection") renderCollection(route);
    else if (route.name === "create") renderCreate();
    else if (route.name === "detail") renderDetail(route.id);
    else if (route.name === "edit") renderEdit(route.id);
    else renderUnknown();
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-tag-filter]");
    if (btn) {
      event.preventDefault();
      event.stopPropagation();
      navigate("/?q=" + encodeURIComponent(btn.getAttribute("data-tag-filter")));
      return;
    }
    var form = document.getElementById("recipe-form");
    var link = event.target.closest('a[href^="#"]');
    if (!form || !link || link.hasAttribute("data-cancel")) return;
    if (!isFormDirty(form)) return;
    event.preventDefault();
    var href = link.getAttribute("href") || "#/";
    maybeDiscard(form).then(function (ok) {
      if (!ok) return;
      form.setAttribute("data-clean", snapshotForm(form));
      location.hash = href.replace(/^#/, "");
    });
  });

  window.addEventListener("hashchange", render);
  if (!location.hash) location.replace("#/");
  else render();
})();
