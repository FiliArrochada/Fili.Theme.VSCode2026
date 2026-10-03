# CLAUDE.md

Guidance for Claude Code when working in this repository. The workspace-level `CLAUDE.md` one
directory up still applies — in particular **never commit anything**.

## What this is

A VS Code colour-theme extension reconstructing Visual Studio 2026's Fluent appearance: the two base
themes **Fili.VSCode2026 Dark** and **Fili.VSCode2026 Light**, the thirteen variants VS 2026 ships (eleven
tinted themes and two Extra Contrast editors), a file icon theme, **Fili.VSCode2026 Icons**, for
Solution Explorer's look, and a product icon theme, **Fili.VSCode2026 Fluent Icons**. The only
runtime code is `extension.js`, for the opt-in Visual Studio 2026 layout commands. `themes/`,
`icons/` and the product icon theme JSON are generated; the Fluent font beside it is vendored.

```bash
npm run build      # src/ -> themes/ + icons/ + product icon theme, with parity + registry validation and a contrast table
npm run check      # fail if any generated file is stale
npm test           # the layout commands, against a stand-in for the VS Code API
npm run coverage   # also list VS Code colours no theme sets
npm run registry -- "<VS Code resources/app dir>"         # refresh scripts/vscode-color-ids.json
npm run variants -- "<VS install dir>"                    # regenerate src/palettes/variants/
node scripts/vs-tokens.mjs "<VS install dir>" "<regex>"   # read Visual Studio's own theme tokens
```

The Node scripts need only Node (no `npm install`, no dependencies). If `node` is not on PATH,
Visual Studio ships one under its install at `MSBuild/Microsoft/VisualStudio/NodeJs/node.exe`.
Keep it that way: no Python, no npm dependencies.

## Things that will bite you

**Never edit `themes/` or `icons/` by hand.** They are regenerated from `src/` and a hand edit is
silently overwritten; the build also deletes generated icons no template produces any more. Change a colour in `src/palettes/{dark,light}.json`; change *where* a colour
is used in `src/workbench.json` or `src/syntax.json`.

**The shared maps hold roles, never colours.** `workbench.json` and `syntax.json` are shared by
both themes; a hex value there fails the build. Opacity is `"role/NN"` (NN percent). If one theme
needs something the other does not, that is a new role defined in *both* palettes — the build
rejects a role that exists in only one, and a role nothing uses.

**Variants are generated deltas — never edit `src/palettes/variants/`.** `npm run variants --
"<VS install>"` evaluates the rules in `src/palettes/derive.mjs` against each VS variant's tokens
and against its base's, and writes only the roles that differ; the build merges them onto
`dark.json`/`light.json`. It first evaluates every rule against VS's own Dark and Light and stops if
one fails to reproduce the base palette (±1 per channel), so fix a wrong variant in `derive.mjs`. A
role a variant must change needs a rule there; a base-palette value that no rule reproduces is a
hand deviation from VS and should be reverted rather than special-cased.

**Tinted themes and Extra Contrast are different mechanisms in VS 2026.** The tinted themes are
colour themes (`environment.visualExperience.colorTheme`) that override ten shell tokens — frame
(`EnvironmentBackground`), cards (`EnvironmentTab`), and the focused-window colour
(`EnvironmentBorder`, which is also Solution Explorer's selection pill; hence the `windowAccent` role,
separate from the button `accent` that the tints leave alone). Extra Contrast is an *editor
appearance* (`environment.visualExperience.editorAppearance`) that overrides only editor tokens and
can be paired with any colour theme; here each is shipped as its base shell plus that editor.

**Classification lookup order.** For a C# classification VS uses the first category that defines it:
`Text Editor Language Service Items`, then `Text Editor MEF Items`, then `Roslyn Text Editor MEF
Items`. This was established by sampling, not from documentation: Dark (Extra Contrast) overrides
`Keyword` and `String` only as language-service items, and VS shows those values although the MEF
items keep the base colours; it overrides `class name` only in the MEF category, which the base themes
leave to Roslyn's default. Extra Contrast also separates colours the base themes share — type
parameters from interfaces, doc-comment tag names from their delimiters — which is why those have
roles of their own.

**Icons are templates, rendered once per base palette.** `src/icons/*.svg` use `{{role}}` for every
colour (a raw hex fails the build) and `src/icon-theme.json` maps files to them. The icons are
original drawings in Solution Explorer's outline style — keep them that way; do not trace or copy
Visual Studio's image catalog. VS 2026 keeps the closed-folder glyph when a folder is expanded, so
there is deliberately no open-folder icon.

**`configurationDefaults` sets the Explorer's look on install.** `package.json` overrides the
defaults of `workbench.iconTheme`, `workbench.tree.indent`, `workbench.tree.renderIndentGuides`,
`explorer.compactFolders`, `workbench.activityBar.location` (`top`) and `workbench.activityBar.compact`
(which only applies once a user moves the activity bar back to the side). VS Code accepts a default override for any setting that is not
application- or machine-scoped (verified on 1.139 in a fresh profile); a user's own settings still
win and nothing is written to their settings file. The colour theme, `files.exclude` and the Git
decoration colours were left out on purpose — the first would force Dark on everyone who never
picked a theme, the others change behaviour for users of any theme — so they stay optional in the
README.

**Theme labels are what users' settings store.** A variant is labelled with its base first
("Fili.VSCode2026 Dark (Cool Slate)"); `variants.mjs` generates it. VS Code saves a chosen theme by
its `id`, or by its `label` when there is none, so relabelling a theme un-selects it for everyone
using it. The labels are frozen now that the extension has users: rename one only together with
an `id` that keeps the old label.

**Product icons use the whole Fluent font, unmodified.** `src/product-icons.json` maps codicon ids
to Fluent System Icons names; the build resolves each to the 16px Regular glyph (else 20, else 24)
through `src/vendor/fluent/FluentSystemIcons-Regular.json` and writes
`product-icons/fili-vscode2026-product-icon-theme.json`. The font is not subset — about 0.8 MB in the
package, in exchange for a Node-only toolchain — and must stay under `product-icons/`, because
`src/**` is not packaged. The `.woff2` and the `.json` map must come from the same upstream commit
(recorded in `THIRD-PARTY-NOTICES.md`, which must stay in the package): codepoints are not stable
across Fluent releases. The build deletes any other file in `product-icons/`. An unmapped codicon
keeps VS Code's icon, so the map can stay partial.

**`extension.js` is opt-in behaviour only.** The themes need no code; `extension.js` exists for the
Apply / Remove Visual Studio 2026 Layout commands and a one-time offer of Apply (only while a
Fili.VSCode2026 colour theme is active). Remove reverts a setting only while it still holds the
value Apply wrote. `npm test` covers that against a stand-in for the VS Code API; extend
`test/layout.test.cjs` when the layout changes.

**`package.json` lists every theme, and the build checks it.** Adding or removing a variant means
updating `contributes.themes`; the build fails and prints the exact list it expects.

**Every palette value carries its provenance.** Each role is `["#hex", "where it came from"]`:
a Visual Studio token (`Category.Token`), `sampled` from a live VS 2026 window, `composite` (a
translucent Fluent token flattened onto the surface under it), or `inferred`. Keep that honest
when changing a value — it is the only record of why a colour is what it is.

**`Shell` and `ShellInternal` are different Visual Studio categories.** The Fluent layer is in
`Shell` (`AccentFill*`, `SolidBackgroundFill*`, `TextFill*`, `SystemFill*`); the frame and status bar
are in `ShellInternal` (`EnvironmentBackground`, `EnvironmentTab`, `StatusBarBackgroundFill*`). The
older `Environment` category is still shipped but its Light values are the VS 2022 blue palette
that VS 2026 Light no longer draws — do not source Light colours from it.

**VS 2026's accent is purple, not blue.** `#9184EE` / `#5649B0`. Blue is for selection, links and
info. Swapping the accent means changing `accent`, `accentHover`, `accentText`, `accentMuted` and
`accentStrong` in both palettes.

**C# member colours are plain on purpose.** Visual Studio leaves fields, properties, events,
constants, enum members and namespaces uncoloured. In the C# extension `constant` is a subtype of
`variable` and `field` of `property`, so both need their own selector or they inherit the local /
property colour.

**The registry snapshot gates keys.** A key VS Code does not register fails the build. The
snapshot is `scripts/vscode-color-ids.json` (refreshed for VS Code 1.140.0); refresh it rather than
deleting a key that a newer VS Code added.

## Identity

The icon theme id `fili-vscode2026-icons` is what users put in `workbench.iconTheme`, so it is as
fixed as the extension id once released.

The extension id is **`FiliArrochada.fili-vscode2026`** (`publisher` + `name` in `package.json`). It is
permanent once published to a marketplace — do not rename either field after a release. Display
name and theme labels (`Fili.VSCode2026 Dark` / `Light`) are user-facing and can change, but a
changed theme label un-selects the theme for everyone using it.

The repository is `https://github.com/FiliArrochada/Fili.VSCode2026`, and `package.json` says so.
`vsce` uses that field to rewrite the README's relative image links to GitHub URLs, which is why
`docs/` is left out of the package (`.vscodeignore`): a Marketplace page loads the screenshots from
GitHub, so an image must be pushed before a release that shows it.

## Publishing

A release goes to three places: the Visual Studio Marketplace, Open VSX and a GitHub release.
The human releases; never publish, tag or push from a session.

1. Bump `version` in `package.json` and add a matching `## <version>` section to `CHANGELOG.md`.
   Both registries refuse a version they already have.
2. Commit and push, then push a `v<version>` tag.
3. `.github/workflows/release.yml` runs on the tag. It fails unless the tag equals `package.json`'s
   version, runs the tests, packages the `.vsix`, creates the GitHub release with the `.vsix`
   attached and that CHANGELOG section as its notes (`scripts/release-notes.mjs`, which fails on a
   missing section), and publishes to Open VSX with `--skip-duplicate`, so a version already
   uploaded by hand is not an error.
4. Upload the release's `.vsix` on the Visual Studio Marketplace management page. That step stays
   manual: Marketplace personal access tokens stop working after December 1 2026.

`npm run package` builds the `.vsix` alone; `npm run publish` (vsce, needs a Marketplace token) and
`npm run publish:ovsx` (ovsx, reads `OVSX_PAT`) publish from a local checkout.

**Open VSX authentication.** The extension lives in the `FiliArrochada` namespace. Until it is
verified, the `open-vsx` job publishes with an `OVSX_PAT` secret in the repository's `open-vsx`
environment. Once it is verified, register a trusted publisher on open-vsx.org (*Settings › Trusted
Publishers*): owner `FiliArrochada`, repository `Fili.VSCode2026`, workflow `release.yml`,
environment `open-vsx`. Then **delete the secret**: a token always takes precedence over trusted
publishing. The registration matches the workflow by file name, so renaming `release.yml` breaks
publishing until the registration is updated.

**CI.** `.github/workflows/ci.yml` runs `npm test` and `npm run package` (which runs the build's
`--check` and lets vsce validate the README) on every push to `master` and every pull request.

## Verifying a change

`npm run build` proves structure and contrast, not appearance. To see it, press F5 (Extension
Development Host) with a C# project open and the C# extension installed — semantic colours only
appear once its Roslyn server has loaded the project. For screenshots, open a folder that is not a
git repository or turn off `git.decorations.enabled`: in a repo with nothing committed, VS Code
tints every file name with the Git "added" colour, which looks like a green tree and is not the
theme.

Three things that make a test misleading rather than fail:

- **An Extension Development Host ignores the user's colour theme.** VS Code switches to the
  extension-under-development's own theme (the first of the right kind), so a test of
  `workbench.colorTheme` resolution — e.g. that a label still selects a theme — must install the
  `.vsix` into a scratch `--extensions-dir` and launch *without* `--extensionDevelopmentPath`.
- **C# Dev Kit fails from a long extensions path.** Its server sits about 190 characters below the
  extensions folder; past Windows' 260-character limit it cannot start (`spawn … ENOENT`) and its
  view never fills. Install it into a short `--extensions-dir` for tests.
- **C# Dev Kit's Solution Explorer is titled "C# Project Details"** (view id `solutionExplorer`, in
  the Explorer), not "Solution Explorer", in current versions.

The reference captures used for the first
release were taken from VS 2026 18.x started with `devenv /rootsuffix <name>` (an isolated
settings hive), so the user's own Visual Studio configuration is never touched.
