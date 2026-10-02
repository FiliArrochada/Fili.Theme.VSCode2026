"""Builds the Fili.VSCode2026 Fluent Icons product icon theme in product-icons/.

    python scripts/product-icons.py <dir with FluentSystemIcons-Regular.ttf and .json>

Download both files from https://github.com/microsoft/fluentui-system-icons/tree/main/fonts .
Needs fontTools and brotli (pip install fonttools brotli); a virtual environment is enough.

src/product-icons.json maps VS Code codicon ids to Fluent base names. For each, this picks the 16px
Regular design where Fluent has one, else 20px, else 24px; subsets the Fluent font to exactly those
glyphs (a few KB instead of 2.8 MB); and writes the font plus the product icon theme that points
each codicon at its glyph. Like the variant palettes, the output is committed, so the build and the
package need neither Python nor the Fluent download.
"""

import json
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SIZES = (16, 20, 24)


def main(fluent_dir: str) -> int:
    src = Path(fluent_dir)
    font_path = src / 'FluentSystemIcons-Regular.ttf'
    names = json.loads((src / 'FluentSystemIcons-Regular.json').read_text(encoding='utf-8'))
    mapping = json.loads((ROOT / 'src' / 'product-icons.json').read_text(encoding='utf-8'))
    mapping.pop('$comment', None)

    available = {}
    for name, cp in names.items():
        m = re.fullmatch(r'ic_fluent_(.+)_(\d+)_regular', name)
        if m:
            available.setdefault(m.group(1), {})[int(m.group(2))] = cp

    chosen, missing = {}, []
    for codicon, base in mapping.items():
        sizes = available.get(base)
        size = next((s for s in SIZES if sizes and s in sizes), None)
        if size is None:
            missing.append(f'{codicon} -> {base}')
            continue
        chosen[codicon] = (base, size, sizes[size])
    if missing:
        print('no 16/20/24px Regular glyph for:\n  ' + '\n  '.join(missing), file=sys.stderr)
        return 1

    out = ROOT / 'product-icons'
    out.mkdir(exist_ok=True)
    font_file = 'fili-vscode2026-fluent.woff2'

    font = TTFont(font_path)
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = []
    options.name_IDs = ['*']
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=sorted({cp for _, _, cp in chosen.values()}))
    subsetter.subset(font)
    subset.save_font(font, out / font_file, options)

    theme = {
        'fonts': [{'id': 'fluent', 'src': [{'path': f'./{font_file}', 'format': 'woff2'}], 'weight': 'normal', 'style': 'normal'}],
        'iconDefinitions': {
            codicon: {'fontCharacter': '\\' + format(cp, 'x'), 'fontId': 'fluent'}
            for codicon, (_, _, cp) in sorted(chosen.items())
        },
    }
    (out / 'fili-vscode2026-product-icon-theme.json').write_text(json.dumps(theme, indent=2) + '\n', encoding='utf-8')
    size = (out / font_file).stat().st_size
    print(f'{len(chosen)} icons -> product-icons/{font_file} ({size} bytes) and the theme JSON')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
