// Prints one version's section of CHANGELOG.md, without its heading, for a GitHub release.
//
//   node scripts/release-notes.mjs 0.4.1
//
// Fails when the CHANGELOG has no section for that version, so a release cannot go out without
// one.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
if (!version) {
  console.error('usage: node scripts/release-notes.mjs <version>');
  process.exit(2);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lines = readFileSync(join(root, 'CHANGELOG.md'), 'utf8').split(/\r?\n/);
const start = lines.findIndex((l) => l.trim() === `## ${version}`);
if (start < 0) {
  console.error(`CHANGELOG.md has no '## ${version}' section`);
  process.exit(1);
}
const rest = lines.slice(start + 1);
const end = rest.findIndex((l) => l.startsWith('## '));
const notes = (end < 0 ? rest : rest.slice(0, end)).join('\n').trim();
if (!notes) {
  console.error(`CHANGELOG.md's '## ${version}' section is empty`);
  process.exit(1);
}
console.log(notes);
