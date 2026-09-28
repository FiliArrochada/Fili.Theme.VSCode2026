# CLAUDE.md

Guidance for Claude Code when working in this repository. The workspace-level `CLAUDE.md` one
directory up still applies — in particular **never commit anything**.

## What this is

A VS Code colour-theme extension reconstructing Visual Studio 2026's Fluent appearance: the two base
themes **Fili.VSCode2026 Dark** and **Fili.VSCode2026 Light**, the thirteen variants VS 2026 ships (eleven
tinted themes and two Extra Contrast editors), plus a file icon theme, **Fili.VSCode2026 Icons**,
for Solution Explorer's look. There is no runtime code; the deliverables are `themes/` and
`icons/`, and both are generated.

```bash
npm run build      # src/ -> themes/, with parity + registry validation and a contrast table
npm run check      # fail if themes/ is stale
npm run coverage   # also list VS Code colours no theme sets
npm run registry -- "<VS Code resources/app dir>"         # refresh scripts/vscode-color-ids.json
node scripts/vs-tokens.mjs "<VS install dir>" "<regex>"   # read Visual Studio's own theme tokens
```

The scripts need only Node (no `npm install`, no dependencies). If `node` is not on PATH, Visual
Studio ships one under its install at `MSBuild/Microsoft/VisualStudio/NodeJs/node.exe`.

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
snapshot is `scripts/vscode-color-ids.json` (VS Code 1.139.1 at creation); refresh it rather than
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

`npm run publish` checks the build and runs `vsce publish`; `npm run package` builds the `.vsix`
alone. Publishing needs the `FiliArrochada` publisher on the Visual Studio Marketplace and a login
(`npx @vscode/vsce login FiliArrochada` with an Azure DevOps personal access token scoped to
*Marketplace › Manage*). The human runs both; never publish from a session. Bump `version` and add
a CHANGELOG entry first — the Marketplace refuses a version it already has.

## Verifying a change

`npm run build` proves structure and contrast, not appearance. To see it, press F5 (Extension
Development Host) with a C# project open and the C# extension installed — semantic colours only
appear once its Roslyn server has loaded the project. For screenshots, open a folder that is not a
git repository or turn off `git.decorations.enabled`: in a repo with nothing committed, VS Code
tints every file name with the Git "added" colour, which looks like a green tree and is not the
theme. The reference captures used for the first
release were taken from VS 2026 18.x started with `devenv /rootsuffix <name>` (an isolated
settings hive), so the user's own Visual Studio configuration is never touched.
