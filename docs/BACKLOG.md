# Backlog

Ideas and known gaps that are not scheduled. Each says why it is here and what it would take, so it
can be picked up without the conversation that produced it. Remove an item when it ships, or say
here why it was dropped.

## Theme accuracy

- **More languages.** Measured so far: C#, VB.NET, Razor, HTML, CSS, SCSS, Less, SQL, JSON,
  PowerShell, Markdown, diff, TypeScript, JavaScript, XML (and MSBuild files and XAML, which VS
  draws as XML), YAML and Dockerfile. What is left, ranked by whether Visual Studio colours the
  language with its own classifier (rather than generic TextMate colours the theme already
  matches) and by how much .NET work touches it:
  - *Worth a round for someone who writes them:* C++ (VS's richest classifier: macros, members,
    locals vs globals), F#, Python.
  - *Not worth a round:* PHP and classic ASP (VS has no real support to copy); batch, INI, TOML,
    `.editorconfig` and `.gitignore` (VS leaves them plain or generic); Go, Rust and other languages
    VS colours only through TextMate scopes, which already match.

  Each is a sampling round with `tools/sampling` (add the file to `tools/samples/languages`,
  capture it with `vs-capture.ps1 -Scenario languages -FontSize 20`, map the scopes with
  `scopes.mjs`, add it to `tools/regression/inputs.json`, verify with `vscode-verify.ps1`).
- **Avalonia's own AXAML colours.** With the Avalonia extension installed, Visual Studio colours
  `.axaml` with that extension's classifier rather than as XML: elements in the type colour,
  attributes keyword blue, values plain, `Binding` in the method colour. VS Code colours `.axaml`
  with its XML grammar, whose scopes cannot tell it from XML, so it gets Visual Studio's XML (and
  WPF XAML) colours. Only an AXAML grammar with scopes of its own would let the theme follow.
- **JS/TS tokens VS Code cannot tell apart.** TypeScript reports a getter's declaration as a
  `property`, which Visual Studio draws in the method colour. It reports `Math`, `console` and
  `window` all as `variable.defaultLibrary`, which Visual Studio draws plain, type-coloured and
  variable-coloured respectively. All of them stay variable-coloured. Revisit only if the
  TypeScript server adds a modifier that separates them.
- **The remaining inferred colours** (`docs/PARITY.md`) are at their floor: Visual Studio has no
  equivalent (`treeIndent`, `statusBarWarning`), VS Code cannot draw what VS draws
  (`debugCurrentGlyph`, `breakpointDisabled`), or there is no automation route to the state
  (`linkHover`, `accentHover`, `gitConflict`, `scopeHighlight`). Revisit only if one of those
  changes — e.g. a DTE command for the Git merge editor.
- **A light high-contrast theme.** Visual Studio has none: under a light contrast scheme
  (sampled with Windows' High Contrast White) it keeps its Light theme, so a faithful one cannot
  be derived. If users ask for one, the honest options are Light (Extra Contrast) as a VS Code
  `hc-light` theme with VS Code's borders, or nothing. Windows 11's Desert theme also could not be
  applied from a script (`SPI_SETHIGHCONTRAST` does not know its name), so it was never measured.

## Distribution

- **Automatic Visual Studio Marketplace publishing.** Uploading the `.vsix` by hand is the one
  manual step of a release. Marketplace personal access tokens stop working after 1 December 2026;
  the replacement is a Microsoft Entra ID managed identity trusted by this repository's
  `marketplace` environment (`azure/login` + `vsce publish --azure-credential`). It needs an Azure
  subscription and adding the identity to the publisher, and was judged not worth it for an
  occasional release.

## Housekeeping

- **Red runs from before trusted publishing.** The v0.4.1 and v0.5.0 release runs show a failed
  Open VSX job (no trusted publisher yet). *Re-run failed jobs* on each turns them green;
  `--skip-duplicate` skips the versions already published.
