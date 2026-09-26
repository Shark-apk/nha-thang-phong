"""Gom icon 16×16 trong assets/Custom/proposals/ thành một spritesheet cho game.

Chạy (sau draw_proposals.py):  python3 tools/pack_icons.py
Kết quả: assets/Custom/icons.png (16 cột) + icons.json {tên: frame}; chân dung dân làng 24×24 → portraits.png + portraits.json
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'Custom' / 'proposals'
OUT = ROOT / 'assets' / 'Custom'


def pack(files, size, name, cols=16):
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * size, max(1, rows) * size), (0, 0, 0, 0))
    index = {}
    for i, f in enumerate(files):
        im = Image.open(f).convert('RGBA')
        sheet.alpha_composite(im, ((i % cols) * size, (i // cols) * size))
        index[f.stem] = i
    sheet.save(OUT / f'{name}.png')
    (OUT / f'{name}.json').write_text(json.dumps(index, indent=1))
    return index


if __name__ == '__main__':
    files = sorted(SRC.glob('*.png'))
    icons = [f for f in files if Image.open(f).size == (16, 16)]
    faces = [f for f in files if Image.open(f).size == (24, 24)]
    a = pack(icons, 16, 'icons')
    b = pack(faces, 24, 'portraits', cols=8)
    print(len(a), 'icon,', len(b), 'chân dung')
