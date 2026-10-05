// Scratch-only driver: walks VS Code through each surface under both Fili.VSCode2026 themes and
// hands off to an external capture script through marker files (<name>.ready -> <name>.done).
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const dir = process.env.FILI_SHOTS_DIR;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cmd = (id, ...a) => vscode.commands.executeCommand(id, ...a).then(undefined, (e) => log(`cmd ${id} failed: ${e}`));
const log = (m) => fs.appendFileSync(path.join(dir, 'driver.log'), `${new Date().toISOString()} ${m}\n`);

async function shot(name, settle = 1800) {
  await sleep(settle);
  fs.writeFileSync(path.join(dir, `${name}.ready`), '');
  for (let i = 0; i < 600 && !fs.existsSync(path.join(dir, `${name}.done`)); i++) await sleep(100);
  log(`shot ${name}`);
}

async function openAt(file, line, col) {
  const uri = vscode.Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, file));
  const doc = await vscode.workspace.openTextDocument(uri);
  const ed = await vscode.window.showTextDocument(doc, { preview: false });
  const pos = new vscode.Position(line, col);
  ed.selection = new vscode.Selection(pos, pos);
  ed.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  return ed;
}

function fakeTests() {
  const ctrl = vscode.tests.createTestController('fili-shots', 'Orders.Tests');
  const file = ctrl.createTestItem('OrderServiceTests', 'OrderServiceTests');
  const names = ['PlaceAsync_ValidSku_ReturnsTrue', 'PlaceAsync_InvalidSku_ReturnsFalse', 'PlaceAsync_StoreThrows_Retries', 'Truncate_LongValue_AddsEllipsis', 'Dispose_Twice_DoesNotThrow'];
  for (const n of names) file.children.add(ctrl.createTestItem(n, n));
  ctrl.items.add(file);
  const run = ctrl.createTestRun(new vscode.TestRunRequest(), 'shots', false);
  const items = [...file.children].map(([, t]) => t);
  run.passed(items[0], 12); run.passed(items[1], 3);
  run.failed(items[2], new vscode.TestMessage('Expected 3 attempts but saw 1.'), 41);
  run.skipped(items[3]); run.errored(items[4], new vscode.TestMessage('ObjectDisposedException'));
  run.end();
}

async function scenario(theme) {
  const tag = theme.includes('Dark') ? 'dark' : 'light';
  await vscode.workspace.getConfiguration().update('workbench.colorTheme', theme, vscode.ConfigurationTarget.Global);
  await cmd('workbench.action.closeAllEditors');
  await cmd('workbench.action.closePanel');

  // Overview: Explorer, C# editor with a selection, terminal with ANSI colours.
  await cmd('workbench.view.explorer');
  const ed = await openAt('Sample.cs', 29, 0);
  ed.selection = new vscode.Selection(new vscode.Position(35, 12), new vscode.Position(35, 51));
  await cmd('workbench.action.terminal.focus');
  const term = vscode.window.activeTerminal ?? vscode.window.createTerminal('pwsh');
  term.show();
  term.sendText('cls; & ./colors.ps1; git status --short');
  await sleep(2500);
  await vscode.window.showTextDocument(ed.document, { preview: false });
  await shot(`${tag}-overview`);

  // IntelliSense.
  await openAt('Sample.cs', 37, 30);
  await cmd('editor.action.triggerSuggest');
  await shot(`${tag}-intellisense`, 3500);
  await cmd('hideSuggestWidget');

  // Hover.
  await openAt('Sample.cs', 32, 22);
  await cmd('editor.action.showHover');
  await shot(`${tag}-hover`, 3500);
  await cmd('editor.action.hideHover');

  // Peek Definition.
  await openAt('Program.cs', 2, 22);
  await cmd('editor.action.peekDefinition');
  await shot(`${tag}-peek`, 3500);
  await cmd('closeReferenceSearch');

  // Problems panel with the C# diagnostics.
  await openAt('Broken.cs', 4, 34);
  await cmd('workbench.actions.view.problems');
  await shot(`${tag}-problems`, 2500);

  // Command Palette.
  await cmd('workbench.action.showCommands');
  await shot(`${tag}-palette`, 1500);
  await cmd('workbench.action.closeQuickOpen');

  // Source Control.
  await cmd('workbench.view.scm');
  await shot(`${tag}-scm`, 2000);

  // Diff editor.
  const root = vscode.workspace.workspaceFolders[0].uri.fsPath;
  await cmd('vscode.diff', vscode.Uri.file(path.join(root, 'before.cs.txt')), vscode.Uri.file(path.join(root, 'after.cs.txt')), 'Pricing.cs (before ↔ after)');
  await shot(`${tag}-diff`, 2500);

  // Notifications.
  vscode.window.showInformationMessage('Build succeeded: 1 project, 0 warnings.', 'Open Output');
  vscode.window.showWarningMessage('Sample.csproj targets a preview SDK.', 'Details');
  vscode.window.showErrorMessage('Unable to reach the NuGet feed.', 'Retry');
  await shot(`${tag}-notifications`, 1500);
  await cmd('notifications.clearAll');

  // Testing.
  await cmd('workbench.view.testing.focus');
  await shot(`${tag}-testing`, 2000);

  // Debugger: stop on the debugger statement in debug.js.
  await cmd('workbench.action.closeAllEditors');
  await openAt('debug.js', 5, 0);
  await vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], 'shots');
  await sleep(6000);
  await cmd('workbench.view.debug');
  await shot(`${tag}-debug`, 2000);
  await vscode.debug.stopDebugging();
  await sleep(1500);
}

async function inspect() {
  await cmd('workbench.action.closePanel');
  const probes = [['obsolete', 'Probe.cs', 3, 16], ['probe', 'Probe.cs', 5, 16], ['class-decl', 'Sample.cs', 11, 25], ['iface-field', 'Sample.cs', 15, 24], ['typeparam', 'Sample.cs', 11, 34], ['enum-use', 'Sample.cs', 24, 12], ['method-decl', 'Sample.cs', 27, 30], ['local', 'Sample.cs', 29, 22]];
  for (const [name, file, line, col] of probes) {
    await openAt(file, line, col);
    await cmd('editor.action.inspectTMScopes');
    await shot(`inspect-${name}`, 2500);
    await cmd('workbench.action.closeActiveEditor');
  }
  await cmd('workbench.action.terminal.focus');
  const term = vscode.window.activeTerminal ?? vscode.window.createTerminal('pwsh');
  term.show();
  term.sendText('cls; & ./colors.ps1');
  await shot('inspect-terminal', 4000);
}

exports.activate = async () => {
  if (!dir) return;
  try {
    if (process.env.FILI_SHOTS_ONLY === 'docs') {
      await sleep(Number(process.env.FILI_SHOTS_WARMUP ?? 90000));
      const root = vscode.workspace.workspaceFolders[0].uri;
      const file = vscode.Uri.joinPath(root, 'src', 'Fili.Samples.Orders', 'Services', 'OrderService.cs');
      await cmd('workbench.action.closePanel');
      await vscode.window.showTextDocument(file, { preview: false });
      // A fresh profile switching to a Fili theme gets the one-time layout offer.
      await vscode.workspace.getConfiguration().update('workbench.colorTheme', 'Fili.VSCode2026 Dark', vscode.ConfigurationTarget.Global);
      await shot('docs-offer', 3000);
      await cmd('notifications.clearAll');
      await cmd('workbench.view.explorer');
      await cmd('workbench.explorer.fileView.toggleVisibility');
      await cmd('solutionExplorer.focus');
      await vscode.window.showTextDocument(file, { preview: false });
      await cmd('workbench.explorer.fileView.removeView');
      await cmd('outline.removeView');
      await cmd('timeline.removeView');
      await cmd('solutionExplorer.focus');
      await sleep(1500);
      await cmd('list.focusFirst');
      for (let i = 0; i < 22; i++) { await cmd('list.expand'); await sleep(350); await cmd('list.focusDown'); await sleep(150); }
      await cmd('list.focusFirst');
      await shot('docs-devkit', 3000);
      await cmd('workbench.explorer.fileView.toggleVisibility');
      fs.writeFileSync(path.join(dir, 'finished'), '');
      return;
    }
    if (process.env.FILI_SHOTS_ONLY === 'final') {
      await sleep(Number(process.env.FILI_SHOTS_WARMUP ?? 60000));
      await cmd('fili-vscode2026.applyLayout');
      await sleep(3000);
      await cmd('notifications.clearAll');
      const root = vscode.workspace.workspaceFolders[0].uri;
      const file = vscode.Uri.joinPath(root, 'src', 'Fili.Samples.Orders', 'Services', 'OrderService.cs');
      for (const theme of ['Fili.VSCode2026 Dark', 'Fili.VSCode2026 Light']) {
        const tag = theme.endsWith('Dark') ? 'dark' : 'light';
        await vscode.workspace.getConfiguration().update('workbench.colorTheme', theme, vscode.ConfigurationTarget.Global);
        await cmd('workbench.action.closePanel');
        await vscode.window.showTextDocument(file, { preview: false });
        await cmd('workbench.view.explorer');
        await sleep(1500);
        await cmd('notifications.clearAll');
        await cmd('workbench.explorer.fileView.toggleVisibility');
        await cmd('solutionExplorer.focus');
        await sleep(2500);
        await cmd('notifications.clearAll');
        await shot(`final-${tag}`, 2500);
        await cmd('workbench.explorer.fileView.toggleVisibility');
      }
      fs.writeFileSync(path.join(dir, 'finished'), '');
      return;
    }
    if (process.env.FILI_SHOTS_ONLY === 'gallery') {
      await sleep(Number(process.env.FILI_SHOTS_WARMUP ?? 45000));
      const themes = vscode.extensions.all.flatMap((e) => e.packageJSON?.contributes?.themes ?? [])
        .map((t) => t.label).filter((l) => l?.startsWith('Fili.VSCode2026'));
      await cmd('workbench.action.closePanel');
      await cmd('workbench.view.explorer');
      const ed = await openAt('Sample.cs', 27, 30);
      ed.selection = new vscode.Selection(new vscode.Position(35, 12), new vscode.Position(35, 51));
      for (const theme of themes) {
        await vscode.workspace.getConfiguration().update('workbench.colorTheme', theme, vscode.ConfigurationTarget.Global);
        await cmd('revealInExplorer', ed.document.uri);
        await vscode.window.showTextDocument(ed.document, { preview: false });
        const slug = theme.replace('Fili.VSCode2026 ', '').toLowerCase().replace(/[()]/g, '').trim().replace(/\s+/g, '-');
        await shot(`gallery-${slug}`, 2200);
      }
      fs.writeFileSync(path.join(dir, 'finished'), '');
      return;
    }
    if (process.env.FILI_SHOTS_ONLY === 'tree') {
      await sleep(Number(process.env.FILI_SHOTS_WARMUP ?? 20000));
      const root = vscode.workspace.workspaceFolders[0].uri;
      const at = (rel) => vscode.Uri.joinPath(root, ...rel.split('/'));
      for (const theme of ['Fili.VSCode2026 Dark', 'Fili.VSCode2026 Light']) {
        const tag = theme.includes('Dark') ? 'dark' : 'light';
        await vscode.workspace.getConfiguration().update('workbench.colorTheme', theme, vscode.ConfigurationTarget.Global);
        await cmd('workbench.action.closePanel');
        await cmd('workbench.view.explorer');
        for (const f of ['src/Fili.Samples.App/Program.cs', 'src/Fili.Samples.Orders/Models/Status.cs', 'src/Fili.Samples.Orders/Services/Storage/MemoryStore.cs']) {
          await cmd('revealInExplorer', at(f));
          await sleep(400);
        }
        await vscode.window.showTextDocument(at('src/Fili.Samples.Orders/Services/OrderService.cs'), { preview: false });
        await cmd('revealInExplorer', at('src/Fili.Samples.Orders/Services/OrderService.cs'));
        await cmd('workbench.files.action.focusFilesExplorer');
        await shot(`tree-${tag}-focused`, 2000);
        await cmd('workbench.action.focusActiveEditorGroup');
        await shot(`tree-${tag}-unfocused`, 1500);
      }
      fs.writeFileSync(path.join(dir, 'finished'), '');
      return;
    }
    if (process.env.FILI_SHOTS_ONLY === 'hover') {
      await sleep(Number(process.env.FILI_SHOTS_WARMUP ?? 45000));
      for (const theme of ['Fili.VSCode2026 Dark', 'Fili.VSCode2026 Light']) {
        const tag = theme.includes('Dark') ? 'dark' : 'light';
        await vscode.workspace.getConfiguration().update('workbench.colorTheme', theme, vscode.ConfigurationTarget.Global);
        await cmd('workbench.action.closePanel');
        await openAt('Sample.cs', 31, 30); // IsMatch
        await cmd('workbench.action.focusActiveEditorGroup');
        await sleep(800);
        await cmd('editor.action.showHover');
        await shot(`${tag}-hover`, 3500);
        await cmd('editor.action.hideHover');
      }
      fs.writeFileSync(path.join(dir, 'finished'), '');
      return;
    }
    if (process.env.FILI_SHOTS_ONLY === 'inspect') {
      await sleep(Number(process.env.FILI_SHOTS_WARMUP ?? 45000));
      await inspect();
      fs.writeFileSync(path.join(dir, 'finished'), '');
      return;
    }
    fakeTests();
    await sleep(Number(process.env.FILI_SHOTS_WARMUP ?? 45000)); // let the C# server load the project
    for (const theme of ['Fili.VSCode2026 Dark', 'Fili.VSCode2026 Light']) await scenario(theme);
    fs.writeFileSync(path.join(dir, 'finished'), '');
  } catch (e) {
    log(`fatal ${e?.stack ?? e}`);
    fs.writeFileSync(path.join(dir, 'finished'), String(e));
  }
};
