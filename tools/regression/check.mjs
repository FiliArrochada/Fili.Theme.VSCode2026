// Visual regression check for syntax colours: tokenizes the sample files with VS Code's own TextMate
// engine and grammars, applies every theme in themes/ the way VS Code does, and compares the colour
// and font style each token gets with tools/regression/expected.json.
//
//   npm run regression                 compare; exit 1 and list every token whose look changed
//   npm run regression -- --update     rewrite expected.json after an intended change
//
// The themes' JSON already shows *what* changed in a colour rule; this shows what a reader of the
// code would see change — including a selector that wins (or loses) somewhere it was not meant to.
// It covers the TextMate layer only: C#'s semantic colours come from the language server.
//
// Nothing here is a dependency of the repository. The engine (tools/regression/inputs.json pins the
// versions VS Code ships) is installed with npm, and the grammars are downloaded at pinned tags,
// both into a cache folder: FILI_REGRESSION_CACHE, default <temp>/fili-regression.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const inputs = JSON.parse(readFileSync(join(here, 'inputs.json'), 'utf8'));
const expectedPath = join(here, 'expected.json');
const update = process.argv.includes('--update');
const cache = process.env.FILI_REGRESSION_CACHE ?? join(tmpdir(), 'fili-regression');

// --- the engine ---------------------------------------------------------------------------------
const engineDir = join(cache, 'engine');
const installed = (name) => {
  const p = join(engineDir, 'node_modules', name, 'package.json');
  return existsSync(p) && JSON.parse(readFileSync(p, 'utf8')).version === inputs.engine[name];
};
if (!Object.keys(inputs.engine).every(installed)) {
  mkdirSync(engineDir, { recursive: true });
  const specs = Object.entries(inputs.engine).map(([n, v]) => `${n}@${v}`);
  console.log(`installing ${specs.join(', ')} into ${engineDir}`);
  // One command string through the shell: npm is a .cmd on Windows, which Node only starts that way.
  const r = spawnSync(`npm install --prefix "${engineDir}" --no-save --no-audit --no-fund ${specs.join(' ')}`,
    { stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(2);
}
const require = createRequire(join(engineDir, 'node_modules', 'x.js'));
const vsctm = require('vscode-textmate');
const oniguruma = require('vscode-oniguruma');

// --- the grammars -------------------------------------------------------------------------------
const grammarDir = join(cache, 'grammars');
mkdirSync(grammarDir, { recursive: true });
const grammarFiles = {};
for (const [scope, url] of Object.entries(inputs.grammars)) {
  // The URL is part of the name, so pinning a new tag downloads afresh. The extension is kept:
  // vscode-textmate reads a .json path as JSON and anything else as a plist.
  const ext = extname(decodeURIComponent(new URL(url).pathname));
  const file = join(grammarDir, `${scope}-${createHash('sha1').update(url).digest('hex').slice(0, 10)}${ext}`);
  if (!existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) { console.error(`${url}: HTTP ${res.status}`); process.exit(2); }
    writeFileSync(file, await res.text());
  }
  grammarFiles[scope] = file;
}

await oniguruma.loadWASM(readFileSync(join(engineDir, 'node_modules', 'vscode-oniguruma', 'release', 'onig.wasm')).buffer);
const registry = new vsctm.Registry({
  onigLib: Promise.resolve({ createOnigScanner: (p) => new oniguruma.OnigScanner(p), createOnigString: (s) => new oniguruma.OnigString(s) }),
  // An embedded language with no pinned grammar stays plain, as it would without its extension.
  loadGrammar: async (scope) => (grammarFiles[scope] ? vsctm.parseRawGrammar(readFileSync(grammarFiles[scope], 'utf8'), grammarFiles[scope]) : null),
});

// --- tokenize every sample in every theme -------------------------------------------------------
// vscode-textmate's token metadata: font style in bits 11-14, foreground colour-map index in 15-23.
const FONT_STYLE = (m) => (m >>> 11) & 0b1111;
const FOREGROUND = (m) => (m >>> 15) & 0b111111111;
const STYLE_FLAGS = [[1, 'i'], [2, 'b'], [4, 'u'], [8, 's']];

const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
const themes = pkg.contributes.themes;
const grammars = {};
for (const scope of new Set(Object.values(inputs.files))) grammars[scope] = await registry.loadGrammar(scope);

// Token boundaries come from the scopes, which no theme affects; tokenizeLine2, which carries the
// colours, merges neighbouring tokens that look alike, so its boundaries differ between themes.
const sources = Object.fromEntries(Object.entries(inputs.files).map(([file, scope]) => {
  const lines = readFileSync(join(repo, file), 'utf8').split(/\r?\n/);
  let stack = vsctm.INITIAL;
  const tokens = lines.map((line, li) => {
    const r = grammars[scope].tokenizeLine(line, stack);
    stack = r.ruleStack;
    return r.tokens.map((tk) => ({ start: tk.startIndex, text: line.slice(tk.startIndex, tk.endIndex) }))
      .filter((tk) => tk.text.trim()).map((tk) => ({ ...tk, key: `${li + 1}:${tk.start + 1} ${tk.text.trim().slice(0, 40)}` }));
  });
  return [file, { scope, lines, tokens }];
}));

// looks[file][key] = one "#RRGGBB[/ibus]" per theme, in package.json's order.
const looks = {};
for (const [ti, t] of themes.entries()) {
  const theme = JSON.parse(readFileSync(join(repo, t.path), 'utf8'));
  // VS Code puts the editor's colours first, as the defaults every rule inherits from.
  registry.setTheme({ name: t.label, settings: [
    { settings: { foreground: theme.colors['editor.foreground'], background: theme.colors['editor.background'] } },
    ...theme.tokenColors,
  ] });
  const colorMap = registry.getColorMap();
  for (const [file, { scope, lines, tokens }] of Object.entries(sources)) {
    const out = (looks[file] ??= {});
    let stack = vsctm.INITIAL;
    lines.forEach((line, li) => {
      const r = grammars[scope].tokenizeLine2(line, stack);
      stack = r.ruleStack;
      for (const tk of tokens[li]) {
        let i = 0;
        while (i + 2 < r.tokens.length && r.tokens[i + 2] <= tk.start) i += 2;
        const m = r.tokens[i + 1];
        const style = STYLE_FLAGS.filter(([bit]) => FONT_STYLE(m) & bit).map(([, c]) => c).join('');
        (out[tk.key] ??= [])[ti] = colorMap[FOREGROUND(m)].toUpperCase() + (style ? `/${style}` : '');
      }
    });
  }
}
const snapshot = {
  $comment: 'Generated by tools/regression/check.mjs --update: the colour (and /i /b /u /s font style) each token of the sample files gets in each theme, in the order of "themes". Review its diff like a screenshot diff.',
  themes: themes.map((t) => t.label),
  files: Object.fromEntries(Object.entries(looks).map(([f, keys]) => [f, Object.fromEntries(Object.entries(keys).map(([k, v]) => [k, v.join(' ')]))])),
};

if (update) {
  writeFileSync(expectedPath, `${JSON.stringify(snapshot, null, 1)}\n`);
  const tokens = Object.values(snapshot.files).reduce((n, f) => n + Object.keys(f).length, 0);
  console.log(`wrote ${expectedPath}: ${tokens} tokens in ${themes.length} themes`);
  process.exit(0);
}

// --- compare ------------------------------------------------------------------------------------
if (!existsSync(expectedPath)) { console.error('no expected.json yet; run with --update'); process.exit(1); }
const expected = JSON.parse(readFileSync(expectedPath, 'utf8'));
const problems = [];
const was = new Map(expected.themes.map((label, i) => [label, i]));
for (const label of snapshot.themes) if (!was.has(label)) problems.push(`theme ${label} is not in expected.json`);
for (const label of expected.themes) if (!snapshot.themes.includes(label)) problems.push(`theme ${label} is gone`);
for (const file of new Set([...Object.keys(expected.files), ...Object.keys(snapshot.files)])) {
  const before = expected.files[file] ?? {}, after = snapshot.files[file] ?? {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!(key in before) || !(key in after)) { problems.push(`${file}:${key}: ${key in after ? 'new token' : 'token gone'} (sample or grammar changed?)`); continue; }
    const b = before[key].split(' '), a = after[key].split(' ');
    const changes = snapshot.themes.flatMap((label, i) => (was.has(label) && b[was.get(label)] !== a[i] ? [`${label.replace('Fili.VSCode2026 ', '')} ${b[was.get(label)]} → ${a[i]}`] : []));
    if (changes.length) problems.push(`${file}:${key}: ${changes.join('; ')}`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} token(s) look different. If that is intended, run: npm run regression -- --update`);
  process.exit(1);
}
console.log(`regression OK: ${Object.values(snapshot.files).reduce((n, f) => n + Object.keys(f).length, 0)} tokens in ${themes.length} themes look as expected`);
