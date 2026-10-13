#!/usr/bin/env node
/*
 * Regenerates a JS file's -min sibling with the MinifyAll VS Code
 * extension's own code, run from the terminal.
 *
 * MinifyAll's npm CLI doesn't run on current Node, so this loads the
 * installed extension (~/.vscode/extensions/josee9988.minifyall-*) with a
 * small stand-in for the VS Code API and calls its "Minify this document
 * and preserve the original" command, the same one the editor runs.
 * Settings are the extension's own defaults, plus terser's
 * format.wrap_func_args = false: with that, the output for footer.js was
 * byte-identical to the committed footer-min.js (2026-10-13). Without it
 * terser wraps arrow-function arguments in extra parentheses.
 *
 * JS only. The committed CSS -min files were not produced by MinifyAll
 * (different output style), so running its CSS minifier would rewrite the
 * whole file - see "CSS and JS assets" in AGENTS.md.
 *
 * Usage: node scripts/minifyall.cjs assets/js/footer.js [more.js ...]
 * Writes assets/js/footer-min.js next to each source file.
 */
const Module = require("module");
const fs = require("fs");
const os = require("os");
const path = require("path");

const extDir = path.join(os.homedir(), ".vscode", "extensions");
const ext = fs.existsSync(extDir)
  ? fs.readdirSync(extDir).filter((d) => d.startsWith("josee9988.minifyall-")).sort().pop()
  : null;
if (!ext) {
  console.error(`MinifyAll extension not found in ${extDir}`);
  process.exit(1);
}
const EXT = path.join(extDir, ext);
const pkg = require(path.join(EXT, "package.json"));

const props = [].concat(pkg.contributes.configuration).reduce((all, c) => Object.assign(all, c.properties), {});
const settings = {};
for (const [key, spec] of Object.entries(props)) settings[key.replace(/^MinifyAll\./, "")] = spec.default;
settings.terserMinifyOptions = {
  ...settings.terserMinifyOptions,
  format: { ...(settings.terserMinifyOptions.format || {}), wrap_func_args: false },
};
settings.disableMessages = true;
settings.openMinifiedDocument = false;

const files = process.argv.slice(2).map((f) => path.resolve(f));
if (!files.length || files.some((f) => path.extname(f) !== ".js" || f.endsWith("-min.js"))) {
  console.error("Usage: node scripts/minifyall.cjs <source.js> [more.js ...]  (JS sources only, not -min files)");
  process.exit(1);
}

// Any VS Code API the extension touches that isn't stubbed below is a no-op.
const noop = new Proxy(function () {}, {
  get: (t, p) => (p === "then" ? undefined : noop),
  apply: () => noop,
  construct: () => noop,
});
const withNoops = (obj) => new Proxy(obj, { get: (t, p) => (p in t ? t[p] : noop) });
const commands = {};
const editor = { document: null };
const vscode = withNoops({
  workspace: withNoops({ getConfiguration: () => ({ get: (k) => settings[k] }) }),
  window: withNoops({
    get activeTextEditor() {
      return editor;
    },
    showErrorMessage: (m) => console.error(`MinifyAll: ${m}`),
  }),
  commands: withNoops({ registerCommand: (name, fn) => ((commands[name] = fn), { dispose() {} }) }),
});
const load = Module._load;
Module._load = function (request, ...rest) {
  return request === "vscode" ? vscode : load.call(this, request, ...rest);
};
require(path.join(EXT, "out", "main.js")).activate({ subscriptions: [], extensionPath: EXT, globalState: noop, workspaceState: noop });

function waitFor(file, since) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function poll() {
      if (fs.existsSync(file) && fs.statSync(file).mtimeMs >= since && fs.statSync(file).size > 0) return resolve();
      if (Date.now() - start > 15000) return reject(new Error(`timed out waiting for ${file}`));
      setTimeout(poll, 50);
    })();
  });
}

(async () => {
  for (const file of files) {
    const out = file.replace(/\.js$/, `${settings.PrefixOfNewMinifiedFiles || "-min"}.js`);
    const since = Date.now() - 1;
    editor.document = { getText: () => fs.readFileSync(file, "utf8"), fileName: file, languageId: "javascript" };
    await commands["extension.MinifyAll2OtherDoc"]();
    await waitFor(out, since);
    console.log(`MinifyAll ${ext.split("-").pop()}: ${path.relative(process.cwd(), file)} -> ${path.relative(process.cwd(), out)}`);
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
