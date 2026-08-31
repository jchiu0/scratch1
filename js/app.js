(function () {
  var model = window.RecipeModel;
  var storageApi = window.RecipeStorage.default;
  var parseHash = window.RecipeRouter.parseHash;
  var appRoot = document.getElementById("app");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var searchTimer = null;
  var saving = false;
  var formDirty = false;
  var dialogOpen = false;
  var dialogPreviousFocus = null;
  var currentRouteName = null;
  var currentRouteId = null;
  var ignoreHashChange = false;
  var rowUid = 0;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (value == null || value === false) return;
      if (key === "className") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.indexOf("on") === 0 && typeof value === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === "checked" || key === "disabled") {
        node[key] = !!value;
      } else if (key === "value" && (tag === "input" || tag === "textarea" || tag === "select")) {
        node.value = value;
      } else {
        node.setAttribute(key, value === true ? "" : value);
      }
    });
    (children || []).forEach(function (child) {
      if (child == null || child === false) return;
      if (typeof child === "string") node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    });
    return node;
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.hidden = true;
    }, 2200);
  }

  function setTitle(text) {
    document.title = text;
  }

  function go(hash) {
    if (hash.charAt(0) !== "#") hash = "#" + hash;
    location.hash = hash;
  }

  function collectionHref(query) {
    if (!query) return "#/";
    return "#/?q=" + encodeURIComponent(query);
  }

  function confirmIfDirty() {
    if (!formDirty) return true;
    return window.confirm("Discard unsaved changes?");
  }

  function homeLink() {
    return el("a", { href: "#/", className: "btn btn-secondary" }, ["Back to collection"]);
  }

  function renderRecovery() {
    if (!storageApi.hadRecovery()) return null;
    return el("div", { className: "recovery", role: "status" }, [
      "Some saved data could not be read and was skipped."
    ]);
  }

  function renderCollection(route) {
    var query = route.query || "";
    var all = storageApi.listRecipes();
    var recipes = model.filterRecipes(all, query);
    var active = document.activeElement;
    var restoreSearch = active && active.id === "search";
    var selectionStart = restoreSearch ? active.selectionStart : null;
    var selectionEnd = restoreSearch ? active.selectionEnd : null;
    setTitle("Recipes");
    var heading = el("h1", { text: "Recipes" });
    var search = el("div", { className: "search-field" }, [
      el("label", { for: "search" }, ["Search recipes"]),
      el("input", {
        id: "search",
        type: "search",
        value: query,
        placeholder: "Search by title, ingredient, or tag",
        onInput: function (event) {
          var value = event.target.value;
          clearTimeout(searchTimer);
          searchTimer = setTimeout(function () {
            go(collectionHref(value));
          }, 200);
        }
      })
    ]);
    var toolbar = el("div", { className: "toolbar" }, [
      search,
      el("a", { href: "#/recipes/new", className: "btn" }, [all.length ? "New recipe" : "Add your first recipe"])
    ]);

    var body;
    if (!all.length && !query) {
      body = el("div", { className: "empty-state" }, [
        el("p", { text: "No recipes yet" }),
        el("p", { className: "muted", text: "Save a recipe you already know, then find it later by name or ingredient." }),
        el("a", { href: "#/recipes/new", className: "btn" }, ["Add your first recipe"])
      ]);
    } else if (!recipes.length) {
      body = el("div", { className: "empty-state" }, [
        el("p", { text: "No recipes match \"" + query + "\"." }),
        el("p", { className: "muted", text: "Try another word, or clear search to see the full collection." }),
        el("a", { href: "#/", className: "btn btn-secondary" }, ["Clear search"])
      ]);
    } else {
      body = el("div", { className: "recipe-grid" }, recipes.map(function (recipe) {
        var time = model.totalTimeMinutes(recipe);
        var tags = (recipe.tags || []).slice(0, 3);
        return el("article", { className: "recipe-card" }, [
          el("a", { className: "recipe-card-link", href: "#/recipes/" + encodeURIComponent(recipe.id) }, [
            el("h2", { text: recipe.title }),
            el("div", { className: "meta" }, [
              time != null ? el("span", { text: time + " min" }) : null,
              recipe.servings != null ? el("span", { text: recipe.servings + " servings" }) : null
            ])
          ]),
          tags.length ? el("div", { className: "tags" }, tags.map(function (tag) {
            return el("a", { className: "tag", href: collectionHref(tag) }, [tag]);
          })) : null
        ]);
      }));
    }

    appRoot.replaceChildren.apply(appRoot, [renderRecovery(), heading, toolbar, body].filter(Boolean));
    if (restoreSearch) {
      var input = document.getElementById("search");
      if (input) {
        input.focus();
        if (selectionStart != null) input.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }

  function closeDialog() {
    var existing = document.getElementById("confirm-dialog");
    if (existing) existing.remove();
    dialogOpen = false;
    document.removeEventListener("keydown", trapDialog);
    if (dialogPreviousFocus && typeof dialogPreviousFocus.focus === "function") {
      dialogPreviousFocus.focus();
    }
    dialogPreviousFocus = null;
  }

  function trapDialog(event) {
    if (!dialogOpen) return;
    var dialog = document.querySelector(".dialog");
    if (!dialog) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;
    var focusable = dialog.querySelectorAll("button, [href], input, textarea, select");
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

  function openDeleteDialog(recipe) {
    closeDialog();
    dialogPreviousFocus = document.activeElement;
    dialogOpen = true;
    var cancelBtn = el("button", {
      type: "button",
      className: "btn btn-secondary",
      onClick: function () { closeDialog(); }
    }, ["Cancel"]);
    var confirmBtn = el("button", {
      type: "button",
      className: "btn btn-danger",
      onClick: function () {
        if (confirmBtn.disabled) return;
        confirmBtn.disabled = true;
        try {
          storageApi.deleteRecipe(recipe.id);
          formDirty = false;
          closeDialog();
          showToast("Recipe deleted");
          go("#/");
        } catch (err) {
          confirmBtn.disabled = false;
          showToast(window.RecipeStorage.SAVE_ERROR);
        }
      }
    }, ["Delete recipe"]);
    var backdrop = el("div", { className: "dialog-backdrop", id: "confirm-dialog" }, [
      el("div", { className: "dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "delete-title" }, [
        el("h2", { id: "delete-title", text: "Delete " + recipe.title + "?" }),
        el("p", { text: "This removes the recipe from your collection." }),
        el("div", { className: "actions" }, [cancelBtn, confirmBtn])
      ])
    ]);
    backdrop.addEventListener("click", function (event) {
      if (event.target === backdrop) closeDialog();
    });
    document.body.appendChild(backdrop);
    document.addEventListener("keydown", trapDialog);
    confirmBtn.focus();
  }

  function renderNotFound() {
    setTitle("Recipe not found");
    appRoot.replaceChildren(
      el("div", { className: "not-found" }, [
        el("h1", { text: "Recipe not found" }),
        el("p", { className: "muted", text: "That recipe is missing or was deleted." }),
        homeLink()
      ])
    );
  }

  function renderUnknown() {
    setTitle("Page not found");
    appRoot.replaceChildren(
      el("div", { className: "not-found" }, [
        el("h1", { text: "Page not found" }),
        el("p", { className: "muted", text: "Use the collection to get back on track." }),
        homeLink()
      ])
    );
  }

  function renderDetail(id) {
    var recipe = storageApi.getRecipe(id);
    if (!recipe) {
      renderNotFound();
      return;
    }
    setTitle(recipe.title);
    var time = model.totalTimeMinutes(recipe);
    var image = null;
    if (recipe.imageUrl && model.isValidUrl(recipe.imageUrl)) {
      image = el("img", {
        className: "detail-image",
        src: recipe.imageUrl,
        alt: recipe.title,
        onError: function (event) {
          event.target.hidden = true;
        }
      });
    }
    var metaBits = [];
    if (recipe.servings != null) metaBits.push(el("span", { text: recipe.servings + " servings" }));
    if (time != null) metaBits.push(el("span", { text: time + " min" }));
    if (recipe.prepTimeMinutes != null) metaBits.push(el("span", { text: "Prep " + recipe.prepTimeMinutes + " min" }));
    if (recipe.cookTimeMinutes != null) metaBits.push(el("span", { text: "Cook " + recipe.cookTimeMinutes + " min" }));

    var children = [
      homeLink(),
      el("div", { className: "detail-hero" + (image ? " with-image" : "") }, [
        image,
        el("div", {}, [
          el("h1", { text: recipe.title }),
          recipe.description ? el("p", { text: recipe.description }) : null,
          metaBits.length ? el("div", { className: "meta" }, metaBits) : null,
          (recipe.tags || []).length ? el("div", { className: "tags" }, recipe.tags.map(function (tag) {
            return el("a", { className: "tag", href: collectionHref(tag) }, [tag]);
          })) : null
        ])
      ]),
      el("div", { className: "actions" }, [
        el("a", { className: "btn", href: "#/recipes/" + encodeURIComponent(recipe.id) + "/edit" }, ["Edit"]),
        el("button", {
          type: "button",
          className: "btn btn-danger",
          onClick: function () { openDeleteDialog(recipe); }
        }, ["Delete"])
      ]),
      el("section", { className: "section card" }, [
        el("h2", { text: "Ingredients" }),
        el("ul", {}, (recipe.ingredients || []).map(function (ing) {
          return el("li", { text: model.formatIngredientLine(ing) });
        }))
      ]),
      el("section", { className: "section card" }, [
        el("h2", { text: "Steps" }),
        el("ol", { className: "steps" }, (recipe.steps || []).map(function (step) {
          return el("li", { text: step });
        }))
      ]),
      recipe.notes ? el("section", { className: "section card" }, [
        el("h2", { text: "Notes" }),
        el("p", { text: recipe.notes })
      ]) : null
    ];
    appRoot.replaceChildren.apply(appRoot, children.filter(Boolean));
  }

  function readListValues(container, selector) {
    return Array.prototype.map.call(container.querySelectorAll(selector), function (node) {
      return node.value;
    });
  }

  function bindDirty(form) {
    formDirty = false;
    form.addEventListener("input", function () { formDirty = true; });
    form.addEventListener("change", function () { formDirty = true; });
  }

  function collectForm(form) {
    var ingredientRows = form.querySelectorAll("[data-ingredient-row]");
    var ingredients = Array.prototype.map.call(ingredientRows, function (row) {
      return {
        quantity: row.querySelector('[name="quantity"]').value,
        unit: row.querySelector('[name="unit"]').value,
        name: row.querySelector('[name="name"]').value
      };
    });
    var steps = readListValues(form, '[name="step"]');
    return {
      title: form.querySelector('[name="title"]').value,
      description: form.querySelector('[name="description"]').value,
      servings: form.querySelector('[name="servings"]').value,
      prepTimeMinutes: form.querySelector('[name="prepTimeMinutes"]').value,
      cookTimeMinutes: form.querySelector('[name="cookTimeMinutes"]').value,
      imageUrl: form.querySelector('[name="imageUrl"]').value,
      notes: form.querySelector('[name="notes"]').value,
      tags: form.querySelector('[name="tags"]').value,
      ingredients: ingredients,
      steps: steps
    };
  }

  function addIngredientRow(list, values) {
    values = values || {};
    rowUid += 1;
    var qid = "quantity-" + rowUid;
    var uid = "unit-" + rowUid;
    var nid = "name-" + rowUid;
    var row = el("div", { className: "dynamic-row ingredient", "data-ingredient-row": "true" }, [
      el("div", { className: "field" }, [
        el("label", { for: qid }, ["Quantity"]),
        el("input", { id: qid, name: "quantity", type: "text", value: values.quantity || "" })
      ]),
      el("div", { className: "field" }, [
        el("label", { for: uid }, ["Unit"]),
        el("input", { id: uid, name: "unit", type: "text", value: values.unit || "" })
      ]),
      el("div", { className: "field" }, [
        el("label", { for: nid }, ["Ingredient name"]),
        el("input", { id: nid, name: "name", type: "text", value: values.name || "" })
      ]),
      el("div", { className: "row-actions" }, [
        el("button", { type: "button", className: "btn btn-secondary", "data-move": "up" }, ["Up"]),
        el("button", { type: "button", className: "btn btn-secondary", "data-move": "down" }, ["Down"]),
        el("button", { type: "button", className: "btn btn-secondary", "data-remove": "ingredient" }, ["Remove"])
      ])
    ]);
    list.appendChild(row);
  }

  function addStepRow(list, value) {
    rowUid += 1;
    var sid = "step-" + rowUid;
    var row = el("div", { className: "dynamic-row", "data-step-row": "true" }, [
      el("div", { className: "field" }, [
        el("label", { for: sid }, ["Step"]),
        el("textarea", { id: sid, name: "step", value: value || "" })
      ]),
      el("div", { className: "row-actions" }, [
        el("button", { type: "button", className: "btn btn-secondary", "data-move": "up" }, ["Up"]),
        el("button", { type: "button", className: "btn btn-secondary", "data-move": "down" }, ["Down"]),
        el("button", { type: "button", className: "btn btn-secondary", "data-remove": "step" }, ["Remove"])
      ])
    ]);
    list.appendChild(row);
  }

  function moveRow(row, direction) {
    var parent = row.parentNode;
    if (direction === "up" && row.previousElementSibling) parent.insertBefore(row, row.previousElementSibling);
    if (direction === "down" && row.nextElementSibling) parent.insertBefore(row.nextElementSibling, row);
  }

  function showFieldErrors(form, errors, warnings) {
    Array.prototype.forEach.call(form.querySelectorAll(".error, .warn"), function (node) {
      node.remove();
    });
    function attach(name, message, className) {
      if (!message) return;
      var field = form.querySelector('[name="' + name + '"]');
      var target = field ? field.closest(".field") || field.parentNode : form;
      target.appendChild(el("p", { className: className || "error", role: "alert" }, [message]));
    }
    attach("title", errors.title);
    attach("description", errors.description);
    attach("servings", errors.servings);
    attach("prepTimeMinutes", errors.prepTimeMinutes);
    attach("cookTimeMinutes", errors.cookTimeMinutes);
    attach("notes", errors.notes);
    if (errors.ingredients) {
      var ingBox = form.querySelector("[data-ingredient-list]");
      ingBox.appendChild(el("p", { className: "error", id: "ingredients-error", role: "alert" }, [errors.ingredients]));
    }
    if (errors.steps) {
      var stepBox = form.querySelector("[data-step-list]");
      stepBox.appendChild(el("p", { className: "error", id: "steps-error", role: "alert" }, [errors.steps]));
    }
    if (warnings && warnings.imageUrl) attach("imageUrl", warnings.imageUrl, "warn");
  }

  function renderForm(options) {
    var recipe = options.recipe || {};
    var isEdit = !!options.recipe;
    setTitle(isEdit ? "Edit " + recipe.title : "New recipe");
    var ingredientList = el("div", { "data-ingredient-list": "true" });
    var stepList = el("div", { "data-step-list": "true" });
    var initialIngredients = recipe.ingredients && recipe.ingredients.length ? recipe.ingredients : [{}];
    var initialSteps = recipe.steps && recipe.steps.length ? recipe.steps : [""];
    initialIngredients.forEach(function (ing) { addIngredientRow(ingredientList, ing); });
    initialSteps.forEach(function (step) { addStepRow(stepList, step); });

    var form = el("form", { className: "form-card form-grid", novalidate: "true" }, [
      el("h1", { text: isEdit ? "Edit " + recipe.title : "New recipe" }),
      el("div", { className: "field" }, [
        el("label", { for: "title" }, ["Title"]),
        el("input", { id: "title", name: "title", type: "text", maxlength: "120", value: recipe.title || "" })
      ]),
      el("div", { className: "field" }, [
        el("label", { for: "description" }, ["Description"]),
        el("textarea", { id: "description", name: "description", maxlength: "1000", value: recipe.description || "" })
      ]),
      el("div", { className: "field-row" }, [
        el("div", { className: "field" }, [
          el("label", { for: "servings" }, ["Servings"]),
          el("input", { id: "servings", name: "servings", type: "number", min: "1", max: "100", value: recipe.servings != null ? String(recipe.servings) : "" })
        ]),
        el("div", { className: "field" }, [
          el("label", { for: "prepTimeMinutes" }, ["Prep time (minutes)"]),
          el("input", { id: "prepTimeMinutes", name: "prepTimeMinutes", type: "number", min: "0", value: recipe.prepTimeMinutes != null ? String(recipe.prepTimeMinutes) : "" })
        ]),
        el("div", { className: "field" }, [
          el("label", { for: "cookTimeMinutes" }, ["Cook time (minutes)"]),
          el("input", { id: "cookTimeMinutes", name: "cookTimeMinutes", type: "number", min: "0", value: recipe.cookTimeMinutes != null ? String(recipe.cookTimeMinutes) : "" })
        ])
      ]),
      el("div", { className: "field" }, [
        el("label", { for: "imageUrl" }, ["Image URL"]),
        el("input", { id: "imageUrl", name: "imageUrl", type: "url", value: recipe.imageUrl || "" })
      ]),
      el("div", { className: "field" }, [
        el("label", { for: "tags" }, ["Tags"]),
        el("input", { id: "tags", name: "tags", type: "text", value: (recipe.tags || []).join(", "), placeholder: "lunch, soup" })
      ]),
      el("div", { className: "field" }, [
        el("span", {}, ["Ingredients"]),
        ingredientList,
        el("button", {
          type: "button",
          className: "btn btn-secondary",
          onClick: function () { addIngredientRow(ingredientList, {}); formDirty = true; }
        }, ["Add ingredient"])
      ]),
      el("div", { className: "field" }, [
        el("span", {}, ["Steps"]),
        stepList,
        el("button", {
          type: "button",
          className: "btn btn-secondary",
          onClick: function () { addStepRow(stepList, ""); formDirty = true; }
        }, ["Add step"])
      ]),
      el("div", { className: "field" }, [
        el("label", { for: "notes" }, ["Notes"]),
        el("textarea", { id: "notes", name: "notes", maxlength: "2000", value: recipe.notes || "" })
      ]),
      el("div", { className: "actions" }, [
        el("button", { type: "submit", className: "btn", id: "save-btn" }, ["Save"]),
        el("button", { type: "button", className: "btn btn-secondary", id: "cancel-btn" }, ["Cancel"])
      ])
    ]);

    form.addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      var row = event.target.closest("[data-ingredient-row], [data-step-row]");
      if (btn.getAttribute("data-remove") && row) {
        var list = row.parentNode;
        row.remove();
        formDirty = true;
        if (btn.getAttribute("data-remove") === "ingredient" && !list.querySelector("[data-ingredient-row]")) addIngredientRow(list, {});
        if (btn.getAttribute("data-remove") === "step" && !list.querySelector("[data-step-row]")) addStepRow(list, "");
      }
      if (btn.getAttribute("data-move") && row) {
        moveRow(row, btn.getAttribute("data-move"));
        formDirty = true;
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (saving) return;
      var input = collectForm(form);
      var result = model.validateRecipe(input);
      showFieldErrors(form, result.errors, result.warnings);
      if (!result.ok) return;
      saving = true;
      var saveBtn = form.querySelector("#save-btn");
      saveBtn.disabled = true;
      try {
        var record = isEdit ? model.applyRecipeUpdate(recipe, input) : model.createRecipeRecord(input);
        storageApi.saveRecipe(record);
        formDirty = false;
        saving = false;
        showToast("Recipe saved");
        go("#/recipes/" + encodeURIComponent(record.id));
      } catch (err) {
        saving = false;
        saveBtn.disabled = false;
        showToast(window.RecipeStorage.SAVE_ERROR);
      }
    });

    form.querySelector("#cancel-btn").addEventListener("click", function () {
      if (!confirmIfDirty()) return;
      formDirty = false;
      if (isEdit) go("#/recipes/" + encodeURIComponent(recipe.id));
      else go("#/");
    });

    bindDirty(form);
    appRoot.replaceChildren(homeLink(), form);
  }

  function render() {
    if (ignoreHashChange) {
      ignoreHashChange = false;
      return;
    }
    var route = parseHash(location.hash || "#/");
    var leavingForm = (currentRouteName === "create" || currentRouteName === "edit") &&
      !(route.name === currentRouteName && String(route.id || "") === String(currentRouteId || ""));
    if (leavingForm && formDirty) {
      if (!confirmIfDirty()) {
        ignoreHashChange = true;
        var back = currentRouteName === "create"
          ? "#/recipes/new"
          : "#/recipes/" + encodeURIComponent(currentRouteId) + "/edit";
        location.hash = back;
        return;
      }
      formDirty = false;
    }
    if (dialogOpen) closeDialog();
    currentRouteName = route.name;
    currentRouteId = route.id;
    saving = false;
    if (route.name === "collection") renderCollection(route);
    else if (route.name === "create") renderForm({ recipe: null });
    else if (route.name === "detail") renderDetail(route.id);
    else if (route.name === "edit") {
      var existing = storageApi.getRecipe(route.id);
      if (!existing) renderNotFound();
      else renderForm({ recipe: existing });
    } else renderUnknown();
  }

  window.addEventListener("hashchange", render);
  window.addEventListener("beforeunload", function (event) {
    if (!formDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  document.querySelector(".brand").addEventListener("click", function (event) {
    if (formDirty && !confirmIfDirty()) {
      event.preventDefault();
    } else {
      formDirty = false;
    }
  });

  render();
})();
