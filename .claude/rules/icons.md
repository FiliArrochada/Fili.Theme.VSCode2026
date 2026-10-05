---
paths:
  - "src/icons/**"
  - "src/icon-theme.json"
  - "src/product-icons.json"
  - "src/vendor/**"
  - "product-icons/**"
  - "docs/THIRD-PARTY-NOTICES.md"
---

# File icons and product icons

**File icons are templates, rendered once per base palette.** `src/icons/*.svg` use `{{role}}` for
every colour (a raw hex fails the build) and `src/icon-theme.json` maps files to them. The icons are
original drawings in Solution Explorer's outline style — keep them that way; do not trace or copy
Visual Studio's image catalog. VS 2026 keeps the closed-folder glyph when a folder is expanded, so
there is deliberately no open-folder icon.

**Product icons use the whole Fluent font, unmodified.** `src/product-icons.json` maps codicon ids to
Fluent System Icons names; the build resolves each to the 16px Regular glyph (else 20, else 24)
through `src/vendor/fluent/FluentSystemIcons-Regular.json` and writes
`product-icons/fili-vscode2026-product-icon-theme.json`.

- The font is not subset — about 0.8 MB in the package, in exchange for a Node-only toolchain — and
  must stay under `product-icons/`, because `src/**` is not packaged.
- The `.woff2` and the `.json` map must come from the same upstream commit, recorded in
  `docs/THIRD-PARTY-NOTICES.md` (which must stay in the package; `.vscodeignore` re-includes it):
  codepoints are not stable across Fluent releases.
- The build deletes any other file in `product-icons/`.
- An unmapped codicon keeps VS Code's icon, so the map can stay partial.
