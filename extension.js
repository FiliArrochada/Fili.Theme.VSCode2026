// Fili.VSCode2026: the "Visual Studio 2026 layout" commands.
//
// The colour, file icon and product icon themes need no code. This adds two opt-in commands for the
// settings that change behaviour rather than looks, so they are never forced on anyone:
//   Fili.VSCode2026: Apply Visual Studio 2026 Layout   writes the settings below to user settings
//   Fili.VSCode2026: Remove Visual Studio 2026 Layout  takes back exactly what Apply wrote
// and offers Apply once, in a notification, the first time one of the themes is active.

const vscode = require('vscode');

// Only settings whose VS Code default differs; Apply writes them, Remove reverts each one that still
// holds the value Apply wrote, so a setting the user changed afterwards is left alone.
const LAYOUT = {
  'workbench.sideBar.location': 'right', // Solution Explorer sits on the right in Visual Studio.
  'editor.fontFamily': "'Cascadia Mono', Consolas, 'Courier New', monospace", // VS's default editor font,
  'editor.fontSize': 13, //                                                       at its default 10pt.
  'terminal.integrated.fontFamily': "'Cascadia Mono', Consolas, monospace",
  'editor.minimap.enabled': false, // VS shows a scroll bar map instead.
  'editor.renderLineHighlight': 'line',
  'editor.inlayHints.enabled': 'offUnlessPressed', // Hints while a key is held, like Alt+F1 in VS.
  'explorer.decorations.colors': false, // VS never tints file names by Git status...
  'workbench.editor.decorations.colors': false, // ...in Solution Explorer or on tabs.
  'window.title': '${dirty}${rootName}${separator}${activeEditorShort}', // Solution first, as VS does.
};
// Merged into the user's own files.exclude rather than replacing it.
const EXCLUDE = { '**/bin': true, '**/obj': true, '**/.vs': true };
const PROMPTED = 'fili-vscode2026.layoutOffered';

async function apply() {
  const config = vscode.workspace.getConfiguration();
  for (const [key, value] of Object.entries(LAYOUT)) {
    await config.update(key, value, vscode.ConfigurationTarget.Global);
  }
  const exclude = { ...(config.inspect('files.exclude')?.globalValue ?? {}), ...EXCLUDE };
  await config.update('files.exclude', exclude, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(
    'Fili.VSCode2026: Visual Studio 2026 layout applied. Run "Remove Visual Studio 2026 Layout" to undo it.');
}

async function remove() {
  const config = vscode.workspace.getConfiguration();
  let removed = 0;
  for (const [key, value] of Object.entries(LAYOUT)) {
    if (JSON.stringify(config.inspect(key)?.globalValue) === JSON.stringify(value)) {
      await config.update(key, undefined, vscode.ConfigurationTarget.Global);
      removed++;
    }
  }
  const current = config.inspect('files.exclude')?.globalValue;
  if (current) {
    const rest = Object.fromEntries(Object.entries(current).filter(([k, v]) => !(k in EXCLUDE && v === EXCLUDE[k])));
    await config.update('files.exclude', Object.keys(rest).length ? rest : undefined, vscode.ConfigurationTarget.Global);
  }
  vscode.window.showInformationMessage(`Fili.VSCode2026: Visual Studio 2026 layout removed (${removed} setting(s) restored).`);
}

async function offerOnce(context) {
  if (context.globalState.get(PROMPTED)) return;
  const theme = vscode.workspace.getConfiguration('workbench').get('colorTheme') ?? '';
  if (!String(theme).startsWith('Fili.VSCode2026')) return;
  await context.globalState.update(PROMPTED, true);
  const choice = await vscode.window.showInformationMessage(
    'Fili.VSCode2026: also apply Visual Studio 2026\'s layout? Side bar on the right, Cascadia Mono, no minimap, no Git-tinted file names, and bin/obj hidden. You can undo it with one command.',
    'Apply', 'Not now');
  if (choice === 'Apply') await apply();
}

exports.activate = (context) => {
  context.subscriptions.push(
    vscode.commands.registerCommand('fili-vscode2026.applyLayout', apply),
    vscode.commands.registerCommand('fili-vscode2026.removeLayout', remove),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('workbench.colorTheme')) offerOnce(context);
    }),
  );
  offerOnce(context);
};

exports.deactivate = () => {};
