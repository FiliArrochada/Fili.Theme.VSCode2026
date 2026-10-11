# Backlog

Ideas and known gaps that are not scheduled. Each says why it is here and what it would take, so it
can be picked up without the conversation that produced it. Remove an item when it ships, or say
here why it was dropped.

## Theme accuracy

- **More languages.** Measured so far: C#, VB.NET, Razor, HTML, CSS, SCSS, Less, SQL, JSON,
  PowerShell, Markdown, diff, TypeScript, JavaScript, XML (and MSBuild files and XAML, which VS
  draws as XML), YAML, Dockerfile, C/C++, F# and Python. What is left is not worth a round: PHP and
  classic ASP (VS has no real support to copy); batch, INI, TOML, `.editorconfig` and `.gitignore`
  (VS leaves them plain or generic); Go, Rust and other languages VS colours only through TextMate
  scopes, which already match. If one is ever wanted, it is a sampling round with `tools/sampling`
  (add the file to `tools/samples/languages`, capture it with `vs-capture.ps1 -Scenario languages
  -FontSize 20`, map the scopes with `scopes.mjs`, add it to `tools/regression/inputs.json`,
  verify with `vscode-verify.ps1`).
- **C++, F# and Python tokens VS Code cannot tell apart** (verified against the tokens the
  C/C++ extension, Ionide and Pylance emit, 0.11.0):
  - F#: Ionide reports top-level `let` values and locals alike as `variable`; Visual Studio draws
    the first plain and the second in the variable colour. Both are variable-coloured.
  - C++: a member call the C/C++ extension cannot resolve (`lines_.push_back` inside a template)
    gets no semantic token, so the grammar's method colour shows where Visual Studio draws it
    plain. Without the C/C++ extension, macro uses such as `MAX_ORDERS`, globals and locals have
    no colour of their own at all.
  - Python: Pylance gives `list` in a type hint the same token as `int` and `str`
    (`class.typeHint.builtin`), which Visual Studio's grammar leaves plain; and a base class such
    as `Enum` in `class Status(Enum)` the same token as any other reference, where Visual Studio
    draws it teal. Visual Studio colours Python only through TextMate scopes (without its Python
    workload), so its `self` and builtins differ from Pylance's view in other small ways too.
  - F# under Extra Contrast: Visual Studio was seen to ignore the theme's `FSharp.Printf` override
    and keep F#'s default; `FSharp.MutableVar` is assumed to behave the same (its line was off
    screen in the 20 pt capture, and the default-size capture came back blank with the display
    asleep). Confirm with `vs-capture.ps1 -Editor dark-extra-contrast -Only fsharp` on the next
    screen round; if Visual Studio does draw `#F2C661`, restore the `synFsMutable` rule in
    `derive.mjs`.
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
