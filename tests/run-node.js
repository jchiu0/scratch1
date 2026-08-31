const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const context = {
  console: console,
  URL: URL,
  Date: Date,
  Math: Math,
  JSON: JSON,
  Error: Error,
  Number: Number,
  Array: Array,
  String: String,
  Object: Object,
  Boolean: Boolean,
  parseInt: parseInt,
  isNaN: isNaN,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
context.globalThis = context;
context.window = context;
vm.createContext(context);

function load(rel) {
  const code = fs.readFileSync(path.join(root, rel), "utf8");
  vm.runInContext(code, context, { filename: rel });
}

load("js/model.js");
load("js/storage.js");
load("js/router.js");
load("tests/tests.js");

const results = context.runRecipeTests();
const failed = results.filter(function (r) { return !r.ok; });
results.forEach(function (r) {
  const mark = r.ok ? "PASS" : "FAIL";
  const extra = r.ok ? "" : " — " + r.detail;
  console.log(mark + "  " + r.name + extra);
});
console.log("\n" + (results.length - failed.length) + " passed, " + failed.length + " failed, " + results.length + " total");
if (failed.length) process.exit(1);
