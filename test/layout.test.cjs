// Tests the Visual Studio 2026 layout commands in extension.js against an in-memory stand-in for the
// vscode API, so it runs with plain Node (npm test) and no VS Code.
const assert = require('assert');
const Module = require('module');
const path = require('path');

const settings = {};          // user (global) settings
const commands = {};
const messages = [];
let answer = undefined;       // what the user clicks in the next notification
let configListener = null;
const state = new Map();

const vscode = {
  ConfigurationTarget: { Global: 1 },
  workspace: {
    getConfiguration: (section) => ({
      get: (k) => settings[section ? `${section}.${k}` : k],
      inspect: (k) => ({ globalValue: settings[k] }),
      update: async (k, v) => { if (v === undefined) delete settings[k]; else settings[k] = v; },
    }),
    onDidChangeConfiguration: (fn) => { configListener = fn; return { dispose() {} }; },
  },
  window: { showInformationMessage: async (msg, ...items) => { messages.push(msg); return items.length ? answer : undefined; } },
  commands: { registerCommand: (id, fn) => { commands[id] = fn; return { dispose() {} }; } },
};
const load = Module._load;
Module._load = (req, ...rest) => (req === 'vscode' ? vscode : load(req, ...rest));
const ext = require(path.join(__dirname, '..', 'extension.js'));
const context = { subscriptions: [], globalState: { get: (k) => state.get(k), update: async (k, v) => state.set(k, v) } };
const tick = () => new Promise((r) => setTimeout(r, 10));

(async () => {
  // 1. A user on another theme is never prompted.
  settings['workbench.colorTheme'] = 'Default Dark Modern';
  settings['files.exclude'] = { '**/node_modules': true };
  ext.activate(context); await tick();
  assert.strictEqual(messages.length, 0, 'no offer without a Fili theme');

  // 2. Switching to a Fili theme offers once; "Not now" changes nothing and never asks again.
  answer = 'Not now';
  settings['workbench.colorTheme'] = 'Fili.VSCode2026 Dark';
  configListener({ affectsConfiguration: (k) => k === 'workbench.colorTheme' }); await tick();
  assert.strictEqual(messages.length, 1, 'offered once');
  assert.strictEqual(settings['workbench.sideBar.location'], undefined, '"Not now" applies nothing');
  configListener({ affectsConfiguration: (k) => k === 'workbench.colorTheme' }); await tick();
  assert.strictEqual(messages.length, 1, 'never offered twice');

  // 3. Apply writes the layout and merges files.exclude with the user's own entries.
  await commands['fili-vscode2026.applyLayout']();
  assert.strictEqual(settings['workbench.sideBar.location'], 'right');
  assert.strictEqual(settings['editor.minimap.enabled'], false);
  assert.deepStrictEqual(settings['files.exclude'], { '**/node_modules': true, '**/bin': true, '**/obj': true, '**/.vs': true });

  // 4. A setting the user changes afterwards survives Remove; everything else is reverted.
  settings['editor.fontSize'] = 15;
  await commands['fili-vscode2026.removeLayout']();
  assert.strictEqual(settings['editor.fontSize'], 15, 'user change kept');
  assert.strictEqual(settings['workbench.sideBar.location'], undefined, 'reverted');
  assert.strictEqual(settings['editor.minimap.enabled'], undefined, 'reverted');
  assert.deepStrictEqual(settings['files.exclude'], { '**/node_modules': true }, 'own exclude kept, ours removed');
  assert.strictEqual(settings['workbench.colorTheme'], 'Fili.VSCode2026 Dark', 'theme untouched');

  // 5. Remove on a profile that never applied the layout is harmless.
  delete settings['files.exclude'];
  await commands['fili-vscode2026.removeLayout']();
  assert.strictEqual(settings['files.exclude'], undefined);

  console.log('all layout command checks passed');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
