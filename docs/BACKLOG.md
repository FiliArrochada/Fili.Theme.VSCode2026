# Backlog

Ideas and known gaps that are not scheduled. Each says why it is here and what it would take, so it
can be picked up without the conversation that produced it. Remove an item when it ships, or say
here why it was dropped.

## Theme accuracy

- **More languages.** Visual Studio has its own colours for languages the theme still colours
  generically: JavaScript and TypeScript (through the same classification system as C#, so likely
  the biggest difference), F#, YAML, and XML configuration files. Each is a sampling round with
  `tools/sampling` (add the file to `tools/samples/languages`, capture it with `vs-capture.ps1
  -Scenario languages`, map the scopes with `scopes.mjs`, verify with `vscode-verify.ps1`).
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
