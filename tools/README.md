# Tools

How the theme's colours are measured from Visual Studio 2026, checked in VS Code, and how the
README's screenshots are taken. None of this ships in the extension (`.vscodeignore` excludes
`tools/`), and none of it is needed to build it. Everything but `regression/` runs on Windows with
PowerShell 7.

Every script works on a temporary copy of `samples/`, so Visual Studio and VS Code never write into
the repository. Visual Studio runs on an isolated settings hive and VS Code on its own profile, so
your own installations and settings are never touched. Both only paint while their window is
visible, so the scripts bring their window to the front: **do not use the machine while one runs,
and keep it unlocked** (a locked session paints nothing, and every capture comes out blank).

## `samples/`

| Folder | What it is for |
|---|---|
| `languages/` | `Fili.Langs.sln`: C#, VB.NET, Razor, SCSS, Less, SQL, JSON, HTML, PowerShell and Markdown, a pair of files to diff, and `terminal/`, a folder whose task prints the 16 ANSI colours |
| `editor/` | the screenshot scenes: C# with a selection, a deliberate compile error (`Broken.cs`, for the Problems panel), `debug.js` for the debugger, a diff pair and `colors.ps1` |
| `solution/` | `Fili.Samples.sln`, two projects for C# Dev Kit's solution view |

`Directory.Packages.props` keeps the samples' package versions central, as everywhere in the
workspace.

## `sampling/` — measuring and verifying colours

| Script | Does |
|---|---|
| `vs-capture.ps1 -Theme dark\|light -Scenario <name>` | starts the isolated Visual Studio (`devenv /rootsuffix FiliVs2026Ref`) on the language samples and captures a scenario: `editor` (references, brace match, disabled breakpoint, break, caller frame, Markdown, Find), `languages` (one capture per sample file), `snippet`, `terminal`, `diff`, `codelens` |
| `vscode-verify.ps1 [-Only json, diff]` | packages the working tree's theme, installs it with the C# extension into an isolated VS Code profile, and captures the same samples in Dark and Light |
| `vscode-capture.ps1` | one capture of that isolated VS Code; `vscode-verify.ps1` calls it |
| `sample-colors.ps1 -Image <png> -Boxes name:x0:x1:y,…` | reports the colour of the text in each box (the glyph core, not its anti-aliased edge) and the box's background |
| `scopes.mjs <root scope> <file> [filter]` | prints the TextMate scopes VS Code gives each token, so a rule targets the real scope |

Visual Studio is driven through its automation object (DTE), found by the process id the script
started — never by name, so no other Visual Studio is used. The `snippet` and `terminal` scenarios
send keystrokes only after checking that the isolated window is in front, and `codelens` moves the
pointer and puts it back. The isolated hive must exist before the first run: start
`devenv /rootsuffix FiliVs2026Ref` once and close it.

`scopes.mjs` needs VS Code's TextMate engine, which is not a dependency of this repository:

```text
npm install --prefix "%TEMP%\fili-textmate" vscode-textmate vscode-oniguruma
```

A typical round: capture Visual Studio with `vs-capture.ps1`, read the colours with
`sample-colors.ps1`, put them in `src/palettes/` with a `sampled <date>: …` note, rebuild, then run
`vscode-verify.ps1` and read the same boxes from its captures.

## `screenshots/` — the README images

`run.ps1` starts VS Code as an Extension Development Host with this repository and the driver
extension in `driver/`, which walks through each scene and hands every capture to `capture.ps1`.

```text
pwsh tools/screenshots/run.ps1                     # scenes + gallery, about 15 minutes
pwsh tools/screenshots/run.ps1 -Publish            # … and rebuild docs/*.png from them
pwsh tools/screenshots/run.ps1 -Pass docs          # the layout offer and C# Dev Kit's solution view
```

`-Publish` writes `docs/dark.png`, `light.png`, `dark-debug.png`, `light-problems.png` and the
sixteen-theme grid `themes.png` (`crop.ps1`, `grid.ps1`), and paints over the Debug Console text so
no machine path is published. Look at the images before committing them.

## `regression/` — the syntax-colour check CI runs

`check.mjs` tokenizes the sample files listed in `inputs.json` with VS Code's own TextMate engine and
grammars, applies every theme in `themes/` the way VS Code does, and compares the colour and font
style each token gets with `expected.json`. It needs only Node and the network: the engine and the
grammars, pinned in `inputs.json` to what VS Code 1.140.0 and the C# extension 2.160.4 ship, go into
a cache folder (`FILI_REGRESSION_CACHE`, default `<temp>/fili-regression`), never into the repository.

```text
npm run regression                 # compare; lists every token whose look changed, in which themes
npm run regression -- --update     # rewrite expected.json after an intended change
```

A failure is not necessarily a bug: a colour change is meant to change the snapshot. Read the list,
and if every line is intended, update and commit `expected.json` with the change — its diff is the
record of what readers will see differently. A token listed in a language the change never meant
to touch is the regression this exists to catch. It covers the TextMate layer only; C#'s semantic
colours come from the language server and still need `sampling/vscode-verify.ps1`.
