// Snapshots every workbench colour id a VS Code install registers into scripts/vscode-color-ids.json,
// which the build validates against. Re-run it after a VS Code update to pick up new keys.
//
//   node scripts/registry.mjs <VS Code resources/app directory>
//
// The directory is the one holding VS Code's own package.json and out/; on Windows it sits under the
// install folder, e.g. "<install>/<commit>/resources/app".

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = process.argv[2];
if (!app || !existsSync(join(app, 'out', 'vs', 'workbench', 'workbench.desktop.main.js'))) {
  console.error('usage: node scripts/registry.mjs <VS Code resources/app directory>');
  process.exit(2);
}

const version = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8')).version;
const js = readFileSync(join(app, 'out', 'vs', 'workbench', 'workbench.desktop.main.js'), 'utf8');
const colors = new Map();

// Core colours: registerColor("id", default, description). The bundle is minified, so find the
// name registerColor was given from a colour that has always existed, then take every call to it.
const fn = /([\w$]+)\("focusBorder",/.exec(js)?.[1];
if (!fn) { console.error('could not find registerColor in the workbench bundle'); process.exit(1); }
const escaped = fn.replace(/\$/g, '\\$');
const core = new RegExp(`(?<![\\w$.])${escaped}\\("([a-zA-Z][\\w-]*(?:\\.[\\w-]+)*)",`, 'g');
for (const m of js.matchAll(core)) colors.set(m[1], 'core');
// Terminal ANSI colours live in a {"terminal.ansiX": {index, defaults}} table instead.
for (const m of js.matchAll(/"(terminal\.ansi\w+)":\{index:/g)) colors.set(m[1], 'core');

// Built-in extensions contribute the rest (gitDecoration.*, merge editor, ...).
const extensions = join(app, 'extensions');
for (const dir of readdirSync(extensions)) {
  const manifest = join(extensions, dir, 'package.json');
  if (!existsSync(manifest)) continue;
  for (const c of JSON.parse(readFileSync(manifest, 'utf8')).contributes?.colors ?? []) colors.set(c.id, dir);
}

const sorted = Object.fromEntries([...colors].sort(([a], [b]) => a.localeCompare(b)));
const out = join(dirname(fileURLToPath(import.meta.url)), 'vscode-color-ids.json');
writeFileSync(out, JSON.stringify({ vscodeVersion: version, colors: sorted }, null, 1) + '\n');
console.log(`VS Code ${version}: ${colors.size} colour ids -> scripts/vscode-color-ids.json`);
