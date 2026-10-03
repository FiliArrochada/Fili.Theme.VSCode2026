# Changelog

## 0.5.0

- **Fili.VSCode2026 Icons** grows from 11 icons to 25. New: Razor (`.razor`, `.cshtml`), XAML and
  AXAML, MSBuild files (`.props`, `.targets`, `Directory.Build.props` and friends), `.resx`
  resources, SQL, HTML, CSS (with SCSS and Less), JavaScript, TypeScript, plain text and logs,
  Docker (`Dockerfile`, compose files, `.dockerignore`) and Git files (`.gitignore`,
  `.gitattributes`, `.gitmodules`). The `Properties` and `wwwroot` folders get Solution Explorer's
  wrench and globe badges.

## 0.4.1

- Fili.VSCode2026 Pack, announced with 0.4.0, is withdrawn before publication: it was never made
  public. The README now recommends C#, C# Dev Kit and the Visual Studio Keymap directly.
- Fluent Icons now ship Microsoft's Fluent System Icons font whole, instead of a subset, so the
  extension builds with Node alone. The icons are unchanged; the package grows by about 0.8 MB.

## 0.4.0

- **Fili.VSCode2026 Fluent Icons**, a product icon theme and a new default: toolbar, activity bar,
  debugger and tree icons from Microsoft's Fluent System Icons (MIT), the family Visual Studio 2026
  is drawn with, in place of VS Code's codicons. 121 icons, in a 9 KB subset of the Fluent font.
- **Fili.VSCode2026: Apply Visual Studio 2026 Layout**, a command for the settings that change
  behaviour: side bar on the right, Cascadia Mono 13, no minimap, no Git-tinted file names, `bin`,
  `obj` and `.vs` hidden, and the solution first in the title. Offered once in a notification;
  **Remove Visual Studio 2026 Layout** undoes exactly what it set.
- Obsolete symbols are struck through, as in Visual Studio.
- Covers VS Code 1.140: its three new interface colours are themed, so every theme now sets 990 of
  the 993 colours VS Code registers.
- New companion extension, **Fili.VSCode2026 Pack**: this extension with C#, C# Dev Kit (and its
  Solution Explorer) and the Visual Studio Keymap.

## 0.3.1

- Each variant's name now says whether it is dark or light, so the theme picker reads
  "Fili.VSCode2026 Dark (Cool Slate)", "Fili.VSCode2026 Light (Bubblegum)" and so on.

## 0.3.0

- The activity bar moves to the top of the side bar by default, as a small row of icons: Visual
  Studio has no activity bar, and this gives the editor the room back. If you move it back to the
  side, it is compact there, with smaller icons and a narrower strip. Both are defaults only, and
  a location you have chosen yourself is kept.

## 0.2.0

- Installing the extension now gives the Explorer Solution Explorer's look without any setup:
  **Fili.VSCode2026 Icons** becomes the default file icon theme, with a 12px tree indent, no
  indent guides and no compacted folders. These are defaults only; settings you have made yourself
  still win, and uninstalling restores VS Code's defaults.

## 0.1.0

First release.

- **Fili.VSCode2026 Dark** and **Fili.VSCode2026 Light**, sourced from Visual Studio 2026 (18.x) theme
  tokens and checked against a running Visual Studio 2026 window.
- 987 of the 990 workbench colours VS Code 1.139 registers, covering the editor, title bar, side bars, tabs, panels,
  status bar, IntelliSense, hovers, Peek, the Command Palette, menus, inputs, buttons, the
  debugger, Source Control, the terminal, Git decorations, the diff and merge editors,
  notifications, breadcrumbs, search, testing, notebooks and chat.
- The thirteen other themes Visual Studio 2026 ships: Cool Slate, Juicy Plum, Moonlight Glow,
  Mystical Forest and Spicy Red on Dark; Bubblegum, Cool Breeze, Icy Mint, Mango Paradise, Silky
  Pink and Sunny Day on Light; and Dark and Light (Extra Contrast). Each is generated from that
  theme's own Visual Studio tokens and checked against a live Visual Studio window.
- **Fili.VSCode2026 Icons**, a file icon theme with original outline icons matched to Visual Studio
  2026's Solution Explorer, plus the tree settings (12px indent, no indent guides) that match its
  layout.
- The Explorer's selected, unfocused and hover rows use the fills sampled from Solution Explorer.
- C# highlighting follows Visual Studio's Roslyn classifications through both TextMate scopes and
  semantic tokens.
- Both themes are generated from one shared semantic design and two palettes. The build rejects
  any divergence between them.
