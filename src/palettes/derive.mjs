// Shared by every variant theme: how a palette role follows from a Visual Studio theme's tokens.
// No colours live here. scripts/variants.mjs evaluates each rule twice, once against the variant's
// tokens and once against its base theme's, and overrides the role only where the two differ, so a
// variant inherits every base value that Visual Studio does not change.
//
// Each rule is { from, value(t) }. `from` names the source for the provenance note; `value` returns
// "#RRGGBB[AA]" or undefined (no opinion: keep the base value). The helper `t` provides:
//   t.bg(token) / t.fg(token)   a token's background / foreground literal colour, or undefined
//   t.first(...values)          the first defined value
//   t.over(color, base)         `color` (with its alpha) composited onto an opaque `base`
//   t.alpha(color, percent)     `color` at `percent` opacity
//   t.role(name)                another role's value in the same theme (derived, else the palette's)
//   t.type                      'dark' or 'light', the base the theme builds on
//
// The rules were established against live VS 2026 captures: every tinted theme was sampled and each
// surface matched to the token (and compositing) that reproduces it.

const S = (name) => `Shell.${name}`;
const I = (name) => `ShellInternal.${name}`;
const MEF = (name) => `Text Editor MEF Items.${name}`;
const LS = (name) => `Text Editor Language Service Items.${name}`;
const ROSLYN = (name) => `Roslyn Text Editor MEF Items.${name}`;

// --- shell: what the tinted themes change -------------------------------------------------------
const shell = {
  chrome: { from: I('EnvironmentBackground'), value: (t) => t.bg(I('EnvironmentBackground')) },
  card: { from: I('EnvironmentTab'), value: (t) => t.bg(I('EnvironmentTab')) },
  windowAccent: { from: I('EnvironmentBorder'), value: (t) => t.bg(I('EnvironmentBorder')) },
  tabWell: { from: `${I('EnvironmentLayeredBackground')} over chrome`, value: (t) => t.over(t.bg(I('EnvironmentLayeredBackground')), t.role('chrome')) },
  statusBar: { from: `${I('StatusBarBackgroundFillRest')} over chrome`, value: (t) => t.over(t.bg(I('StatusBarBackgroundFillRest')), t.role('chrome')) },
  statusBarHover: { from: `${I('StatusBarControlFillSecondary')} over statusBar`, value: (t) => t.over(t.bg(I('StatusBarControlFillSecondary')), t.role('statusBar')) },
  listSelection: { from: `${S('SubtleFillSecondary')} over card`, value: (t) => t.over(t.bg(S('SubtleFillSecondary')), t.role('card')) },
  listSelectionInactive: { from: `${S('SubtleFillSecondary')} over card`, value: (t) => t.over(t.bg(S('SubtleFillSecondary')), t.role('card')) },
  listHover: { from: `${S('SubtleFillTertiary')} over card`, value: (t) => t.over(t.bg(S('SubtleFillTertiary')), t.role('card')) },
  divider: { from: `${S('DividerStrokeDefault')} over card`, value: (t) => t.over(t.bg(S('DividerStrokeDefault')), t.role('card')) },
  fgSecondary: { from: `${S('TextFillSecondary')} over card`, value: (t) => t.over(t.bg(S('TextFillSecondary')), t.role('card')) },
  fgTertiary: { from: `${S('TextFillTertiary')} over card`, value: (t) => t.over(t.bg(S('TextFillTertiary')), t.role('card')) },
  fgDisabled: { from: `${S('TextFillDisabled')} over card`, value: (t) => t.over(t.bg(S('TextFillDisabled')), t.role('card')) },
  accentMuted: { from: `${S('AccentFillSenary')} over card`, value: (t) => t.over(t.bg(S('AccentFillSenary')), t.role('card')) },
  infoBg: { from: `${S('SystemFillAttention')} over card`, value: (t) => t.over(t.alpha(t.bg(S('SystemFillAttention')), t.type === 'dark' ? 15 : 10), t.role('card')) },
  accentHover: { from: `${S('AccentFillSecondary')} over card (Light)`, value: (t) => (t.type === 'light' ? t.over(t.bg(S('AccentFillSecondary')), t.role('card')) : undefined) },
  buttonSecondary: { from: `${S('ControlFillDefault')} over card (Light)`, value: (t) => (t.type === 'light' ? t.over(t.bg(S('ControlFillDefault')), t.role('card')) : undefined) },
};

// --- editor: what the Extra Contrast editor appearances change ----------------------------------
// VS reads a classification from the first of these categories that defines it: the language-service
// items, then the editor's MEF items, then the defaults Roslyn registers. (Observed, not documented:
// Dark (Extra Contrast) overrides Keyword and String only as language-service items, and VS shows
// those values although the MEF items keep the base colours.)
const cls = (...names) => ({
  from: names.map((n) => `${n} (language service, MEF, Roslyn)`).join(' / '),
  value: (t) => t.first(...names.flatMap((n) => [t.fg(LS(n)), t.fg(MEF(n)), t.fg(ROSLYN(n))])),
});
const editor = {
  synKeyword: cls('Keyword'),
  synControl: cls('keyword - control'),
  synString: cls('String'),
  synStringVerbatim: cls('string - verbatim', 'String'),
  synStringEscape: cls('string - escape character'),
  synNumber: cls('Number'),
  synComment: cls('Comment'),
  synDocText: cls('xml doc comment - text'),
  synDocTag: cls('xml doc comment - delimiter'),
  synDocName: cls('xml doc comment - name'),
  synDocAttribute: cls('xml doc comment - attribute name'),
  synPreprocessor: cls('Preprocessor Keyword'),
  synExcluded: cls('Excluded Code'),
  synType: cls('class name'),
  synStruct: cls('struct name'),
  synInterface: cls('interface name'),
  synTypeParameter: cls('type parameter name'),
  synMethod: cls('method name'),
  synVariable: cls('local name'),
  synMarkupAttribute: cls('XML Attribute'),
  synMarkupDelimiter: cls('XML Delimiter'),
  synCssProperty: cls('CSS Property Name'),
  synInvalid: cls('syntax error'),
  lineNumber: { from: MEF('Line Number'), value: (t) => t.fg(MEF('Line Number')) },
  ghostText: { from: MEF('hinted suggestion'), value: (t) => t.fg('Text Editor Text Marker Items.hinted suggestion') },
  inlayHintBg: { from: `${MEF('inlay hints')} / ${ROSLYN('inline hints')}`, value: (t) => t.first(t.bg(MEF('inlay hints')), t.bg(ROSLYN('inline hints'))) },
  inlayHintFg: { from: `${MEF('inlay hints')} / ${ROSLYN('inline hints')}`, value: (t) => t.first(t.fg(MEF('inlay hints')), t.fg(ROSLYN('inline hints'))) },
  diffAddLine: { from: MEF('deltadiff.add.line'), value: (t) => t.bg(MEF('deltadiff.add.line')) },
  diffRemoveLine: { from: MEF('deltadiff.remove.line'), value: (t) => t.bg(MEF('deltadiff.remove.line')) },
  // VS marks changed words with coloured text where the Extra Contrast line and word fills are equal;
  // VS Code can only fill, so a word fill equal to its line fill becomes the word's text colour at 30%.
  diffAddWord: { from: MEF('deltadiff.add.word'), value: (t) => wordFill(t, 'add') },
  diffRemoveWord: { from: MEF('deltadiff.remove.word'), value: (t) => wordFill(t, 'remove') },
};

function wordFill(t, kind) {
  const line = t.bg(MEF(`deltadiff.${kind}.line`));
  const word = t.bg(MEF(`deltadiff.${kind}.word`));
  const text = t.fg(MEF(`deltadiff.${kind}.word`));
  if (word && line && word.slice(0, 7) === line.slice(0, 7) && text) return t.over(t.alpha(text, 30), line);
  return word;
}

export default { ...shell, ...editor };
