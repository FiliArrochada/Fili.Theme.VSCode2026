# CLAUDE.md

Guidance for Claude Code when working in this repository. The workspace-level `CLAUDE.md` one
directory up still applies — in particular **never commit anything**.

## What this is

A VS Code colour-theme extension reconstructing Visual Studio 2026's Fluent appearance: the two base
themes **Fili.VSCode2026 Dark** and **Fili.VSCode2026 Light**, the fourteen variants VS 2026 ships
(eleven tinted themes, two Extra Contrast editors and High Contrast), a file icon theme,
**Fili.VSCode2026 Icons**, for Solution Explorer's look, and a product icon theme,
**Fili.VSCode2026 Fluent Icons**. The only
runtime code is `extension.js`, for the opt-in Visual Studio 2026 layout commands. `themes/`,
`icons/` and the product icon theme JSON are generated; the Fluent font beside it is vendored.

```bash
npm run build      # src/ -> themes/ + icons/ + product icon theme, with parity + registry validation and a contrast table
npm run check      # fail if any generated file is stale
npm test           # the layout commands, against a stand-in for the VS Code API
npm run regression # sample files' syntax colours in every theme vs a snapshot (-- --update to accept)
npm run coverage   # also list VS Code colours no theme sets
npm run registry -- "<VS Code resources/app dir>"         # refresh scripts/vscode-color-ids.json
npm run variants -- "<VS install dir>"                    # regenerate src/palettes/variants/
node scripts/vs-tokens.mjs "<VS install dir>" "<regex>"   # read Visual Studio's own theme tokens
```

The Node scripts need only Node — no `npm install`, no dependencies. If `node` is not on PATH, Visual
Studio ships one under its install at `MSBuild/Microsoft/VisualStudio/NodeJs/node.exe`. Keep it that
way: no Python, no npm dependencies. The one exception is `npm run regression`, which installs
VS Code's TextMate engine into a cache folder outside the repository (`tools/README.md`).

## Things that will bite you

**Never edit `themes/`, `icons/` or `src/palettes/variants/` by hand.** They are regenerated and a
hand edit is silently overwritten (the build also deletes generated icons no template produces any
more). Change a colour in `src/palettes/{dark,light}.json`, *where* a colour is used in
`src/workbench.json` or `src/syntax.json`, and a variant through the rules in `src/palettes/derive.mjs`.

**`package.json` lists every theme, and the build checks it.** Adding or removing a variant means
updating `contributes.themes`; the build fails and prints the exact list it expects.

**The registry snapshot gates keys.** A key VS Code does not register fails the build. The snapshot
is `scripts/vscode-color-ids.json` (refreshed for VS Code 1.140.0); refresh it rather than deleting a
key that a newer VS Code added.

**`extension.js` is opt-in behaviour only.** The themes need no code; it exists for the Apply / Remove
Visual Studio 2026 Layout commands and a one-time offer of Apply (only while a Fili.VSCode2026 colour
theme is active). Remove reverts a setting only while it still holds the value Apply wrote. `npm test`
covers that; extend `test/layout.test.cjs` when the layout changes.

## Identity — what is frozen

- **The extension id is `FiliArrochada.fili-vscode2026`** (`publisher` + `name` in `package.json`),
  permanent once published to a marketplace: do not rename either field after a release.
- **The icon theme id `fili-vscode2026-icons`** is what users put in `workbench.iconTheme`, so it is
  as fixed as the extension id.
- **Theme labels are what users' settings store, and they are frozen.** VS Code saves a chosen theme
  by its `id`, or by its `label` when there is none, so relabelling a theme un-selects it for
  everyone using it. Rename one only together with an `id` that keeps the old label. A variant is
  labelled with its base first ("Fili.VSCode2026 Dark (Cool Slate)"); `scripts/variants.mjs`
  generates it.
- **The project is Fili.Theme.VSCode2026; the product is Fili.VSCode2026.** Only the folder and the
  repository were renamed after release. The extension id, display name, theme and icon-theme labels,
  command category and every generated file name keep `Fili.VSCode2026` / `fili-vscode2026`, because
  each is permanent or stored in users' settings. Do not "finish" the rename in them.
- The repository is `https://github.com/FiliArrochada/Fili.Theme.VSCode2026` (the old URL redirects).

## Publishing

**The human releases; never publish, tag or push from a session.** Steps are in `publishing.md`.
Marketplace personal access tokens stop working after **1 December 2026**, which is why the
Marketplace upload is manual (and `npm run publish`, which uses one, will stop working then).

## Verifying a change

`npm run build` proves structure and contrast, not appearance. To see it, press F5 (Extension
Development Host) with a C# project open and the C# extension installed — semantic colours appear
only once its Roslyn server has loaded the project. For screenshots, open a folder that is not a git
repository or turn off `git.decorations.enabled`: with nothing committed, VS Code tints every file
name with the Git "added" colour, which looks like a green tree and is not the theme.

Things that make a test misleading rather than fail:

- **An Extension Development Host ignores the user's colour theme** (it uses the extension's own
  first theme): to test `workbench.colorTheme` resolution, install the `.vsix` into a scratch
  `--extensions-dir` and launch *without* `--extensionDevelopmentPath`.
- **C# Dev Kit cannot start from a long extensions path** — its server sits ~190 characters deep, so
  past Windows' 260 limit it fails (`spawn … ENOENT`) and its view never fills. Use a short
  `--extensions-dir`.
- **Uninstalling C# Dev Kit also removes the C# extension**; launch with `--disable-extension
  ms-dotnettools.csdevkit` instead (it opens an announcement over the editor on first start).
  Without the C# extension, `.razor` falls back to the built-in grammar: no component colours.
- **Dev Kit's Solution Explorer is titled "C# Project Details"** (view id `solutionExplorer`, in the
  Explorer) in current versions.

**Never touch the user's own Visual Studio or VS Code, keyboard or mouse.** Visual Studio runs only
on the isolated hive `devenv /rootsuffix FiliVs2026Ref`, VS Code on its own profile, and scripts
close or capture only processes they started. Send keystrokes only after confirming the target
window is the foreground window (refuse otherwise), restore the pointer after a hover, and ask
before a round that needs either.

## Where the rest lives

Path-scoped rules in `.claude/rules/` load when you touch matching files:

| File | Covers |
|---|---|
| `palette.md` | roles and palettes, variants and `derive.mjs`, drawn vs token values, provenance notes, VS categories and lookup order, the accent, C# and TextMate selectors |
| `icons.md` | file icon templates and the Fluent product icon font |
| `publishing.md` | the release steps, Open VSX trusted publishing, CI, README images, `configurationDefaults` |
| `measuring.md` | using and changing `tools/`: window visibility, locked sessions, sampling traps |

Elsewhere: `tools/README.md` (how to run each tool), `docs/PARITY.md` (generated provenance of every
colour), `docs/BACKLOG.md` (unscheduled work), `docs/CHANGELOG.md`.
