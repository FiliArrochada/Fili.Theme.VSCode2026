---
paths:
  - "tools/**"
---

# Measuring colours and retaking screenshots

`tools/` holds what measures Visual Studio, verifies the theme in VS Code and retakes the README
images; `tools/README.md` says how to run each. It is not packaged (`.vscodeignore`). The rule about
never touching the user's own Visual Studio, VS Code, keyboard or mouse is in `CLAUDE.md`; in
practice it means Visual Studio is driven through DTE found by the started process id, never by name.

- **Applications only paint while their window is visible.** Bring the window to the front before
  every capture. A covered window captures blank, and a **locked session captures blank** — check
  for `LogonUI` *in this session* (`SessionId` equal to the script's own): one in another session
  belongs to someone else and means nothing.
- **Validate the method on Dark first.** Most Dark colours have tokens: a capture that does not
  reproduce them (e.g. FindHighlight, HighlightedReference) is measuring the wrong thing — a blend
  with another highlight, a covered window, or the wrong pixels.
- **Sample away from the caret line.** Visual Studio draws its current-line highlight over every
  fill on the line holding the caret, so a fill sampled there is a blend. Dark's diff lines and
  Light's were both mis-measured this way until 0.9.0; take fills from a line the caret is not on.
- **Thin glyphs lie.** ClearType fringes shift the hue of thin strokes (`@`, `;`, a one-letter
  name); capture with `vs-capture.ps1 -FontSize 20` and take the most common colour of the stems
  rather than trusting a value read at the default size.
- **Some states have no automation route:** the Git merge editor (no DTE command) and link-hover
  colours (CodeLens does not change on hover). They stay inferred in `docs/PARITY.md`.

The reference captures for the first release were taken the same way, from VS 2026 18.x.
