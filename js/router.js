(function (global) {
  function safeDecode(value) {
    try {
      return decodeURIComponent(String(value || "").replace(/\+/g, " "));
    } catch (err) {
      return String(value || "");
    }
  }

  function parseQuery(queryString) {
    var params = {};
    if (!queryString) return params;
    var parts = String(queryString).split("&");
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var pair = parts[i].split("=");
      params[safeDecode(pair[0])] = safeDecode(pair.slice(1).join("="));
    }
    return params;
  }

  function parseHash(hash) {
    var raw = String(hash == null ? "" : hash);
    if (raw.charAt(0) === "#") raw = raw.slice(1);
    if (!raw) raw = "/";
    if (raw.charAt(0) !== "/") raw = "/" + raw;
    var qIndex = raw.indexOf("?");
    var path = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    var queryString = qIndex >= 0 ? raw.slice(qIndex + 1) : "";
    path = path.replace(/\/+$/, "") || "/";
    var params = parseQuery(queryString);
    var segs = path.split("/").filter(Boolean);
    if (path === "/") {
      return { name: "collection", path: path, params: params, query: params.q || "" };
    }
    if (segs[0] === "recipes" && segs[1] === "new" && segs.length === 2) {
      return { name: "create", path: path, params: params };
    }
    if (segs[0] === "recipes" && segs.length === 2) {
      return { name: "detail", path: path, params: params, id: segs[1] };
    }
    if (segs[0] === "recipes" && segs.length === 3 && segs[2] === "edit") {
      return { name: "edit", path: path, params: params, id: segs[1] };
    }
    return { name: "unknown", path: path, params: params };
  }

  global.RecipeRouter = { parseHash: parseHash };
})(typeof window !== "undefined" ? window : globalThis);
