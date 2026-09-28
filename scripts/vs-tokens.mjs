// Prints the colour tokens a Visual Studio install ships for its themes — the source the palettes'
// provenance notes cite — so they can be re-checked after a VS update.
//
//   node scripts/vs-tokens.mjs <VS install dir> [--theme <names>] [--diff] [--json <file>] [filter]
//
// <VS install dir> is the edition folder (the one holding Common7/).
//   --theme  comma-separated theme names, as VS lists them ("Dark,Juicy Plum"); default "Dark,Light".
//            --theme list prints every registered theme and its base.
//   --diff   show only tokens where a theme differs from the theme it falls back to.
//   --json   also write {theme: {"Category.Token": {bg, fg}}} for the selected themes to <file>,
//            with each variant's inherited tokens merged in.
//   filter   case-insensitive regular expression matched against "Category.Token".
//
//   node scripts/vs-tokens.mjs "<VS install>" "^Shell\.(Accent|SolidBackground)"
//   node scripts/vs-tokens.mjs "<VS install>" --theme "Juicy Plum" --diff

import { writeFileSync } from 'node:fs';
import { loadVsThemes } from './lib/vs-themes.mjs';

const argv = process.argv.slice(2);
const install = argv.shift();
const opt = (f) => { const i = argv.indexOf(f); if (i < 0) return undefined; const [, v] = argv.splice(i, 2); return v; };
const flag = (f) => { const i = argv.indexOf(f); if (i < 0) return false; argv.splice(i, 1); return true; };
const themeArg = opt('--theme') ?? 'Dark,Light';
const jsonOut = opt('--json');
const diff = flag('--diff');
const filter = argv[0] ? new RegExp(argv[0], 'i') : null;
if (!install) {
  console.error('usage: node scripts/vs-tokens.mjs <VS install dir> [--theme <names>] [--diff] [--json <file>] [filter]');
  process.exit(2);
}

const vs = loadVsThemes(install);

if (themeArg === 'list') {
  for (const [guid, t] of Object.entries(vs.themes).sort((a, b) => a[1].name.localeCompare(b[1].name))) {
    const base = t.fallback ? vs.themes[t.fallback]?.name : '-';
    console.log(`${t.name.padEnd(26)} base ${String(base).padEnd(8)} ${String(vs.ownCount(guid)).padStart(5)} own tokens  {${guid}}`);
  }
  process.exit(0);
}

const views = themeArg.split(',').map((n) => n.trim()).map((n) => {
  const g = vs.byName(n);
  if (!g) { console.error(`unknown theme '${n}' (use --theme list)`); process.exit(2); }
  const fb = vs.themes[g].fallback;
  return { name: vs.themes[g].name, tokens: vs.tokens(g), base: fb ? vs.tokens(fb) : null };
});

if (jsonOut) {
  const out = Object.fromEntries(views.map((v) => [v.name, Object.fromEntries([...v.tokens].sort(([a], [b]) => a.localeCompare(b)))]));
  writeFileSync(jsonOut, JSON.stringify(out, null, 1));
}

const keys = [...new Set(views.flatMap((v) => [...v.tokens.keys()]))].sort((a, b) => a.localeCompare(b));
const cell = (v) => (v ?? '-').padEnd(10);
console.log('token'.padEnd(72) + views.map((v) => ` ${v.name.slice(0, 21).padEnd(21)}`).join(''));
for (const key of keys) {
  if (filter && !filter.test(key)) continue;
  if (diff && !views.some((v) => v.base && JSON.stringify(v.tokens.get(key)) !== JSON.stringify(v.base.get(key)))) continue;
  console.log(key.padEnd(72) + views.map((v) => ` ${cell(v.tokens.get(key)?.bg)} ${cell(v.tokens.get(key)?.fg)}`).join(''));
}
