# Changelog

## 0.1.0

First release.

- **Fili.Vs2026 Dark** and **Fili.Vs2026 Light**, sourced from Visual Studio 2026 (18.x) theme
  tokens and checked against a running Visual Studio 2026 window.
- 987 of the 990 workbench colours VS Code 1.139 registers, covering the editor, title bar, side bars, tabs, panels,
  status bar, IntelliSense, hovers, Peek, the Command Palette, menus, inputs, buttons, the
  debugger, Source Control, the terminal, Git decorations, the diff and merge editors,
  notifications, breadcrumbs, search, testing, notebooks and chat.
- The thirteen other themes Visual Studio 2026 ships: Cool Slate, Juicy Plum, Moonlight Glow,
  Mystical Forest and Spicy Red on Dark; Bubblegum, Cool Breeze, Icy Mint, Mango Paradise, Silky
  Pink and Sunny Day on Light; and Dark and Light (Extra Contrast). Each is generated from that
  theme's own Visual Studio tokens and checked against a live Visual Studio window.
- **Fili.Vs2026 Icons**, a file icon theme with original outline icons matched to Visual Studio
  2026's Solution Explorer, plus the tree settings (12px indent, no indent guides) that match its
  layout.
- The Explorer's selected, unfocused and hover rows use the fills sampled from Solution Explorer.
- C# highlighting follows Visual Studio's Roslyn classifications through both TextMate scopes and
  semantic tokens.
- Both themes are generated from one shared semantic design and two palettes. The build rejects
  any divergence between them.
