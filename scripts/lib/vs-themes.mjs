// Reads the themes a Visual Studio install ships: their registration (name, the theme each one falls
// back to) and their colour tokens.
//
// Themes are stored as .pkgdef registry scripts: one [$RootKey$\Themes\{theme}\Category] section per
// category with a "Data"=hex:... blob. The blob is: uint32 size, uint32 version, uint32 categoryCount,
// then per category a GUID and uint32 entryCount, then per entry a uint32-length name followed by a
// background and a foreground, each one type byte (0 = none) plus four bytes when present.
// Type 1 is a literal colour stored R, G, B, A; other types reference system or automatic colours.
// A variant theme ("FallbackId" in its registration) stores only what it overrides.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BUILT_IN = {
  '1ded0138-47ce-435e-84ef-9ec1f439b749': { name: 'Dark', fallback: null },
  'de3dbbcd-f642-433c-8353-8f1df4370aba': { name: 'Light', fallback: null },
  'a5c004b4-2d4b-494e-bf01-45fc492522c7': { name: 'High Contrast', fallback: null },
};

function* pkgdefs(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* pkgdefs(p);
    else if (name.endsWith('.pkgdef')) yield p;
  }
}

function colour(buf, o) {
  const type = buf[o];
  if (!type) return [null, o + 1];
  const [r, g, b, a] = buf.subarray(o + 1, o + 5);
  const hex = [r, g, b, a].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  return [type === 1 ? `#${hex}` : `type${type}:${hex}`, o + 5];
}

function parse(buf) {
  const entries = [];
  const categories = buf.readUInt32LE(8);
  let o = 12;
  for (let c = 0; c < categories; c++) {
    o += 16; // category GUID
    const count = buf.readUInt32LE(o); o += 4;
    for (let i = 0; i < count; i++) {
      const len = buf.readUInt32LE(o); o += 4;
      const name = buf.toString('latin1', o, o + len); o += len;
      let bg, fg;
      [bg, o] = colour(buf, o);
      [fg, o] = colour(buf, o);
      entries.push({ name, bg, fg });
    }
  }
  return entries;
}

/**
 * Loads every theme a VS install registers.
 * @param {string} install the edition folder (the one holding Common7/)
 * @returns {{ themes: Record<string, {name: string, fallback: string|null}>, byName: (n: string) => string|undefined,
 *             tokens: (guid: string) => Map<string, {bg: string|null, fg: string|null}> }}
 *          `tokens` returns a theme's effective tokens: its own values over everything it falls back to.
 */
export function loadVsThemes(install) {
  const themes = structuredClone(BUILT_IN);
  const own = {};
  const section = /^\[\$RootKey\$\\Themes\\\{([0-9a-f-]+)\}(?:\\([^\]]+))?\]\s*$/i;
  for (const file of pkgdefs(join(install, 'Common7', 'IDE'))) {
    const text = readFileSync(file, 'utf8');
    if (!text.includes('\\Themes\\{')) continue;
    const lines = text.split(/\r?\n/);
    let current = null;
    for (let i = 0; i < lines.length; i++) {
      const m = section.exec(lines[i]);
      if (m) { current = { guid: m[1].toLowerCase(), category: m[2] ?? null }; continue; }
      if (lines[i].startsWith('[')) { current = null; continue; }
      if (!current) continue;
      const line = lines[i];
      if (!current.category) {
        const t = (themes[current.guid] ??= { name: current.guid, fallback: null });
        const def = /^@="(.*)"$/.exec(line);
        if (def && t.name === current.guid) t.name = def[1];
        const fb = /^"FallbackId"="\{([0-9a-f-]+)\}"$/i.exec(line);
        if (fb) t.fallback = fb[1].toLowerCase();
        continue;
      }
      if (!line.startsWith('"Data"=hex:')) continue;
      let hex = line.slice(11);
      while (hex.endsWith('\\')) hex = hex.slice(0, -1) + lines[++i].trim();
      const map = (own[current.guid] ??= new Map());
      for (const e of parse(Buffer.from(hex.replace(/,/g, ''), 'hex'))) {
        map.set(`${current.category}.${e.name}`, { bg: e.bg, fg: e.fg });
      }
    }
  }
  const cache = new Map();
  const tokens = (guid) => {
    if (cache.has(guid)) return cache.get(guid);
    const t = themes[guid];
    const out = new Map(t?.fallback ? tokens(t.fallback) : []);
    for (const [k, v] of own[guid] ?? []) out.set(k, v);
    cache.set(guid, out);
    return out;
  };
  const byName = (n) => Object.keys(themes).find((g) => themes[g].name.toLowerCase() === n.toLowerCase());
  return { themes, byName, tokens, ownCount: (g) => own[g]?.size ?? 0 };
}
