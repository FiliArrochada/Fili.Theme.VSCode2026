// Prints the TextMate scopes VS Code gives each token of a file, using VS Code's own engine and the
// grammars VS Code and the C# extension ship, so a rule in src/syntax.json can target the real
// scope instead of a guess.
//
//   node tools/sampling/scopes.mjs <root scope> <file> [line filter regex]
//   node tools/sampling/scopes.mjs source.powershell build.ps1 "foreach|param"
//
// The engine is not a dependency of this repo. Install it once into a scratch folder and point
// FILI_TEXTMATE at it (default: %TEMP%\fili-textmate):
//   npm install --prefix "%TEMP%\fili-textmate" vscode-textmate vscode-oniguruma
// Grammars come from the VS Code install (FILI_VSCODE_DIR, default: the user install) and from
// every extension folder in FILI_EXTENSIONS (default: %USERPROFILE%\.vscode\extensions, plus the
// verification profile tools/sampling/vscode-verify.ps1 uses).
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const temp = process.env.TEMP ?? process.env.TMPDIR ?? '/tmp';
const modules = join(process.env.FILI_TEXTMATE ?? join(temp, 'fili-textmate'), 'node_modules');
if (!existsSync(join(modules, 'vscode-textmate'))) {
  console.error(`vscode-textmate not found in ${modules}; see the comment at the top of this file`);
  process.exit(2);
}
const require = createRequire(join(modules, 'x.js'));
const vsctm = require('vscode-textmate');
const oniguruma = require('vscode-oniguruma');

// VS Code keeps its built-in extensions under <install>/<commit>/resources/app/extensions (or
// directly under resources/ in older layouts); take whichever exists.
const vscodeDir = process.env.FILI_VSCODE_DIR ?? join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Microsoft VS Code');
const builtIn = [join(vscodeDir, 'resources', 'app', 'extensions')];
if (existsSync(vscodeDir)) {
  for (const d of readdirSync(vscodeDir)) builtIn.push(join(vscodeDir, d, 'resources', 'app', 'extensions'));
}
const extensionRoots = (process.env.FILI_EXTENSIONS?.split(';') ?? [
  join(process.env.USERPROFILE ?? '', '.vscode', 'extensions'),
  join(temp, 'fili-vscode-capture', 'extensions'),
]);

const byScope = {};
function scan(dir, depth) {
  if (depth > 5 || !existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    let s; try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) { if (f !== 'node_modules') scan(p, depth + 1); continue; }
    if (!/\.tmLanguage\.json$/i.test(f)) continue;
    try { const g = JSON.parse(readFileSync(p, 'utf8')); if (g.scopeName && !byScope[g.scopeName]) byScope[g.scopeName] = p; } catch {}
  }
}
for (const r of [...extensionRoots, ...builtIn]) scan(r, 0);

await oniguruma.loadWASM(readFileSync(join(modules, 'vscode-oniguruma', 'release', 'onig.wasm')).buffer);
const registry = new vsctm.Registry({
  onigLib: Promise.resolve({ createOnigScanner: (p) => new oniguruma.OnigScanner(p), createOnigString: (s) => new oniguruma.OnigString(s) }),
  loadGrammar: async (scope) => (byScope[scope] ? vsctm.parseRawGrammar(readFileSync(byScope[scope], 'utf8'), byScope[scope]) : null),
});

const [rootScope, file, filter] = process.argv.slice(2);
if (!rootScope || !file) { console.error('usage: node scopes.mjs <root scope> <file> [line filter regex]'); process.exit(2); }
const grammar = await registry.loadGrammar(rootScope);
if (!grammar) { console.error(`no grammar for ${rootScope} (${Object.keys(byScope).length} grammars found)`); process.exit(1); }
let state = vsctm.INITIAL;
const re = filter ? new RegExp(filter) : null;
readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
  const r = grammar.tokenizeLine(line, state); state = r.ruleStack;
  if (re && !re.test(line)) return;
  console.log(`${i + 1}: ${line}`);
  for (const t of r.tokens) {
    const text = line.slice(t.startIndex, t.endIndex);
    if (text.trim()) console.log(`    ${JSON.stringify(text).padEnd(20)} ${t.scopes.slice(1).join('  ')}`);
  }
});
