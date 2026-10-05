---
paths:
  - "src/palettes/**"
  - "src/workbench.json"
  - "src/syntax.json"
  - "scripts/build.mjs"
  - "scripts/variants.mjs"
  - "scripts/vs-tokens.mjs"
  - "scripts/lib/**"
  - "docs/PARITY.md"
---

# Palettes, variants and where colours come from

## Roles and palettes

**The shared maps hold roles, never colours.** `src/workbench.json` and `src/syntax.json` are shared
by both themes; a hex value there fails the build. Opacity is `"role/NN"` (NN percent). If one theme
needs something the other does not, that is a new role defined in *both* palettes — the build
rejects a role that exists in only one, and a role nothing uses.

**Every palette value carries its provenance.** Each role is `["#hex", "where it came from"]`: a
Visual Studio token (`Category.Token`), `sampled` from a live VS 2026 window, `composite` (a
translucent Fluent token flattened onto the surface under it), or `inferred`. Keep that honest when
changing a value — it is the only record of why a colour is what it is. The build turns it into
`docs/PARITY.md`, and the note's wording picks the category there: a note starting `sampled`,
`composite` or `inferred` is that; one naming another role or an opacity (`at 60%`) is derived;
`VS default`, `Campbell` and image-catalog notes are VS built-ins; anything else counts as a VS
token, so do not write a guess in token form.

**Prefer what Visual Studio draws over what its token says.** VS draws some tokens translucent or
dotted (FindHighlight `#773800` shows as `#453B32`), and Light leaves many editor colours to built-in
defaults with no token at all. Where a capture shows a different colour, take the drawn value and
keep the token in the note (`sampled …: …, as drawn (token X #…)`). The exception is a role
`derive.mjs` derives from that token — Dark's diff colours — where changing the base breaks the
variants' self-check; keep the token there and say why in the note.

## Variants

**Variants are generated deltas — never edit `src/palettes/variants/`.** `npm run variants --
"<VS install>"` evaluates the rules in `src/palettes/derive.mjs` against each VS variant's tokens and
against its base's, and writes only the roles that differ; the build merges them onto
`dark.json`/`light.json`. It first evaluates every rule against VS's own Dark and Light and stops if
one fails to reproduce the base palette (±1 per channel), so fix a wrong variant in `derive.mjs`. A
role a variant must change needs a rule there; a base-palette value that no rule reproduces is a hand
deviation from VS and should be reverted rather than special-cased.

**A colour change also changes the regression snapshot.** After `npm run build`, run `npm run
regression`: it lists every sample token that now looks different, in which themes. If each is
intended, `npm run regression -- --update` and keep the new `tools/regression/expected.json` with
the change — CI fails without it. A token in a language the change was not about is a selector
winning where it should not.

**Re-run `npm run variants` after changing any base value.** A variant lists only the roles it
changes *relative to its base*, so a new base value can make a variant need an override it did not
need before: 0.7.0 moved Light's diff line to the drawn `#E6EBDA` without re-running it, and Light
(Extra Contrast) shipped that instead of its own `deltadiff` token until 0.7.1.

**Tinted themes and Extra Contrast are different mechanisms in VS 2026.** The tinted themes are
colour themes (`environment.visualExperience.colorTheme`) that override ten shell tokens — frame
(`EnvironmentBackground`), cards (`EnvironmentTab`), and the focused-window colour
(`EnvironmentBorder`, which is also Solution Explorer's selection pill; hence the `windowAccent`
role, separate from the button `accent` that the tints leave alone). Extra Contrast is an *editor
appearance* (`environment.visualExperience.editorAppearance`) that overrides only editor tokens and
can be paired with any colour theme; here each is shipped as its base shell plus that editor.

**Dark (High Contrast) is built differently.** VS 2026's High Contrast tokens name Windows system
colours (`type3`, the first byte a `GetSysColor` index), not colours. `variants.mjs` resolves them
through Windows' Aquatic contrast theme (`%WINDIR%\Resources\Ease of Access Themes\hcblack.theme`)
and evaluates the normal rules plus `derive.mjs`'s `highContrast` rules — those are not checked
against Dark or Light, since the tokens they read hold different colours there — and gives every
syntax role without a rule Plain Text's colour, because VS's High Contrast editor is monochrome.
Colours no token gives (find matches, matched brace, current line) are sampled and kept by hand in
`src/palettes/high-contrast.json`, which `variants.mjs` copies into the variant. The build marks it
`hc-black`, writes no `type`, drops the border keys the shared map sets to `transparent` and applies
`src/workbench-hc.json`, so VS Code's own high-contrast borders show. There is deliberately no Light
(High Contrast): Visual Studio keeps its Light theme under light contrast schemes (`docs/BACKLOG.md`).

## Visual Studio's categories

**`Shell` and `ShellInternal` are different categories.** The Fluent layer is in `Shell`
(`AccentFill*`, `SolidBackgroundFill*`, `TextFill*`, `SystemFill*`); the frame and status bar are in
`ShellInternal` (`EnvironmentBackground`, `EnvironmentTab`, `StatusBarBackgroundFill*`). The older
`Environment` category is still shipped but its Light values are the VS 2022 blue palette that VS 2026
Light no longer draws — do not source Light colours from it.

**Classification lookup order.** For a C# classification VS uses the first category that defines it:
`Text Editor Language Service Items`, then `Text Editor MEF Items`, then `Roslyn Text Editor MEF
Items`. This was established by sampling, not from documentation: Dark (Extra Contrast) overrides
`Keyword` and `String` only as language-service items, and VS shows those values although the MEF
items keep the base colours; it overrides `class name` only in the MEF category, which the base
themes leave to Roslyn's default. Extra Contrast also separates colours the base themes share — type
parameters from interfaces, doc-comment tag names from their delimiters — which is why those have
roles of their own.

**VS 2026's accent is purple, not blue.** `#9184EE` / `#5649B0`. Blue is for selection, links and
info. Swapping the accent means changing `accent`, `accentHover`, `accentText`, `accentMuted` and
`accentStrong` in both palettes.

## Selectors in `syntax.json`

**C# member colours are plain on purpose.** Visual Studio leaves fields, properties, events,
constants, enum members and namespaces uncoloured. In the C# extension `constant` is a subtype of
`variable` and `field` of `property`, so both need their own selector or they inherit the local /
property colour.

**A TextMate rule is ranked by how precisely it matches the token's own scope before its context.**
`source.sql string` loses to a generic `string.quoted`, so target the leaf
(`string.quoted.single.sql`). Read real scopes with VS Code's TextMate engine (`vscode-textmate` +
`vscode-oniguruma`, installed in a scratch folder, never in this repo) rather than guessing them.
