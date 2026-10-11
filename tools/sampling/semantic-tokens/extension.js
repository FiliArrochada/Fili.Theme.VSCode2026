// Writes the semantic tokens a language server gives each editor open at startup, one per line as
// `line:column "text" type.modifier...`, to <FILI_SEMANTIC_TOKENS_OUT>/<file name>.txt (default:
// <temp>/fili-semantic-tokens). That is what a `type.modifier:language` selector in
// src/syntax.json has to match, so a rule can be written against what the server sends rather
// than a guess. vscode-verify.ps1 -Tokens loads this as a development extension.
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');

const outDir = process.env.FILI_SEMANTIC_TOKENS_OUT || path.join(os.tmpdir(), 'fili-semantic-tokens');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Language servers start late; ask every 2 s for up to 2 minutes until one answers.
async function dump(doc) {
  for (let i = 0; i < 60; i++) {
    try {
      const legend = await vscode.commands.executeCommand('vscode.provideDocumentSemanticTokensLegend', doc.uri);
      const tokens = await vscode.commands.executeCommand('vscode.provideDocumentSemanticTokens', doc.uri);
      if (legend && tokens && tokens.data && tokens.data.length) {
        // Each token is five numbers: line delta, start (relative on the same line), length, type, modifier bits.
        const d = tokens.data;
        const lines = [];
        let line = 0;
        let start = 0;
        for (let k = 0; k < d.length; k += 5) {
          line += d[k];
          start = d[k] === 0 ? start + d[k + 1] : d[k + 1];
          const modifiers = legend.tokenModifiers.filter((_, bit) => d[k + 4] & (1 << bit));
          const text = doc.lineAt(line).text.substr(start, d[k + 2]);
          lines.push(`${line + 1}:${start + 1} ${JSON.stringify(text)} ${[legend.tokenTypes[d[k + 3]], ...modifiers].join('.')}`);
        }
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, `${path.basename(doc.fileName)}.txt`), `${lines.join('\n')}\n`);
        return;
      }
    } catch (e) {
      fs.mkdirSync(outDir, { recursive: true });
      fs.appendFileSync(path.join(outDir, 'errors.txt'), `${doc.fileName}: ${e}\n`);
    }
    await sleep(2000);
  }
}

exports.activate = async () => {
  await sleep(5000);
  for (const editor of vscode.window.visibleTextEditors) dump(editor.document);
};

exports.deactivate = () => {};
