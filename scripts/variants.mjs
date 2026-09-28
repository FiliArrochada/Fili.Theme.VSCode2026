// Generates src/palettes/variants/*.json — one per Visual Studio 2026 theme variant — from the
// variant's own tokens, using the shared rules in src/palettes/derive.mjs.
//
//   node scripts/variants.mjs <VS install dir>
//
// A variant file holds only the roles Visual Studio changes relative to the variant's base theme;
// everything else is inherited from src/palettes/dark.json or light.json when the build merges them.
// It is committed, like vscode-color-ids.json: the build needs no Visual Studio. Rerun this after a
// Visual Studio update, and edit derive.mjs rather than a generated variant file.
//
// Before writing anything the rules are checked against the base themes: evaluated for Dark and
// Light, each rule must reproduce that palette's value (within one step per channel, the rounding of
// a sampled pixel). A rule that does not is reported and stops the run.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadVsThemes } from './lib/vs-themes.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const install = process.argv[2];
if (!install) { console.error('usage: node scripts/variants.mjs <VS install dir>'); process.exit(2); }

const rules = (await import(pathToFileURL(join(root, 'src/palettes/derive.mjs')).href)).default;
const readJson = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
const bases = { dark: readJson('src/palettes/dark.json'), light: readJson('src/palettes/light.json') };
const vs = loadVsThemes(install);
const BASE_GUID = { dark: vs.byName('Dark'), light: vs.byName('Light') };

// --- colour helpers -------------------------------------------------------------------------------
const norm = (hex) => {
  if (!hex || !/^#[0-9A-F]{6}([0-9A-F]{2})?$/i.test(hex)) return undefined;
  const h = hex.toUpperCase();
  return h.length === 9 && h.endsWith('FF') ? h.slice(0, 7) : h;
};
const rgba = (hex) => [1, 3, 5, 7].map((i) => (i < hex.length ? parseInt(hex.slice(i, i + 2), 16) : 255));
const toHex = (vals) => '#' + vals.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const over = (color, base) => {
  if (!color || !base) return undefined;
  const [r, g, b, a] = rgba(color); const [R, G, B] = rgba(base); const k = a / 255;
  return toHex([r * k + R * (1 - k), g * k + G * (1 - k), b * k + B * (1 - k)]);
};
const alpha = (color, pct) => (color ? toHex([...rgba(color).slice(0, 3), Math.round(rgba(color)[3] * pct / 100)]) : undefined);
const close = (a, b) => { const x = rgba(a), y = rgba(b); return x.every((v, i) => Math.abs(v - y[i]) <= 1); };

// Evaluates every rule against one theme's tokens. `role` resolves another role in the same theme.
function evaluate(tokens, type) {
  const memo = {};
  const t = {
    type,
    bg: (k) => norm(tokens.get(k)?.bg),
    fg: (k) => norm(tokens.get(k)?.fg),
    first: (...vals) => vals.find((v) => v !== undefined),
    over, alpha,
    role: (name) => value(name) ?? bases[type].roles[name]?.[0],
  };
  function value(name) {
    if (!(name in rules)) return undefined;
    if (!(name in memo)) memo[name] = norm(rules[name].value(t));
    return memo[name];
  }
  return Object.fromEntries(Object.keys(rules).map((r) => [r, value(r)]));
}

// --- self-check: the rules must reproduce both base palettes ------------------------------------
const baseValues = {};
let bad = 0;
for (const type of ['dark', 'light']) {
  baseValues[type] = evaluate(vs.tokens(BASE_GUID[type]), type);
  for (const [role, v] of Object.entries(baseValues[type])) {
    if (!(role in bases[type].roles)) { console.error(`derive.mjs: '${role}' is not a palette role`); bad++; continue; }
    const want = bases[type].roles[role][0];
    if (v !== undefined && !close(v, want)) { console.error(`derive.mjs: ${role} gives ${v} for ${type}, palette has ${want}`); bad++; }
  }
}
if (bad) { console.error(`${bad} rule(s) do not reproduce the base palettes; fix derive.mjs first.`); process.exit(1); }

// --- variants -----------------------------------------------------------------------------------
// Every registered theme built on Dark or Light is a variant. VS 2026 selects the Extra Contrast
// ones as an editor appearance, not a colour theme; here each becomes a theme with its base's shell.
const slug = (name) => name.toLowerCase().replace(/[()]/g, '').trim().replace(/\s+/g, '-');
const outDir = join(root, 'src/palettes/variants');
mkdirSync(outDir, { recursive: true });
const written = new Set();
const version = (() => {
  try { return JSON.parse(readFileSync(join(install, 'Common7/IDE/devenv.isolation.ini'), 'utf8')); } catch { return null; }
})();
for (const [guid, theme] of Object.entries(vs.themes).sort((a, b) => a[1].name.localeCompare(b[1].name))) {
  const type = Object.keys(BASE_GUID).find((k) => BASE_GUID[k] === theme.fallback);
  if (!type) continue;
  const values = evaluate(vs.tokens(guid), type);
  const roles = {};
  for (const [role, v] of Object.entries(values)) {
    if (v === undefined || v === baseValues[type][role]) continue;
    if (baseValues[type][role] === undefined && v === norm(bases[type].roles[role][0])) continue;
    roles[role] = [v, `${rules[role].from} in VS ${theme.name}`];
  }
  const file = `${slug(theme.name)}.json`;
  const doc = {
    $comment: `Generated by scripts/variants.mjs from Visual Studio's '${theme.name}' theme. Holds only the roles that differ from ${type}.json; do not edit — change src/palettes/derive.mjs and regenerate.`,
    name: `Fili.VSCode2026 ${theme.name}`,
    vs: theme.name,
    base: type,
    roles,
  };
  writeFileSync(join(outDir, file), JSON.stringify(doc, null, 2) + '\n');
  written.add(file);
  console.log(`${file.padEnd(28)} ${type.padEnd(5)} ${Object.keys(roles).length} role(s) overridden`);
}
for (const f of readdirSync(outDir)) if (f.endsWith('.json') && !written.has(f)) { rmSync(join(outDir, f)); console.log(`removed ${f}`); }
void version; void existsSync;
