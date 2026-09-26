"""Tự vẽ 4 giai đoạn lớn + túi hạt cho các cây mới, từ icon nông sản trong assets/Custom/proposals/.

Chạy (sau draw_proposals.py):  python3 tools/draw_crop_stages.py
Kết quả: assets/Custom/crops_season.png — mỗi hàng 6 ô 16×16: [túi hạt, mầm, lá non, ra hoa, chín, nông sản]
         assets/Custom/crops_season.json — thứ tự hàng (tên cây) để game tra frame.
Mỗi cây thuộc một kiểu dáng; muốn đổi dáng thì sửa bảng CROPS bên dưới.
"""
import json
import sys
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from draw_proposals import Pix, ellipse, line, rect, thick, rgb, OUT as ICONS  # noqa: E402
from draw_sprites import ASSETS  # noqa: E402

OUT = ASSETS / 'Custom'
L1, L2, L3, L4 = '#c0d470', '#a4c263', '#8db15d', '#67835c'  # xanh lá sáng → tối
SOIL = {(x, 13) for x in range(4, 12)} | {(x, 14) for x in range(5, 11)}

# tên cây → kiểu dáng
CROPS = {
    'radish': 'root', 'cabbage': 'head', 'potato': 'root', 'water_spinach': 'leafy',
    'watermelon': 'vine', 'corn': 'tall', 'chili': 'fruit_bush', 'cucumber': 'vine', 'rice': 'grain',
    'sweet_potato': 'root', 'eggplant': 'fruit_bush', 'grape': 'trellis', 'sunflower': 'flower_tall',
    'kohlrabi': 'head', 'garlic': 'root', 'scallion': 'leafy', 'chrysanthemum': 'flower',
    'apricot_blossom': 'flower', 'peach_blossom': 'flower',
    # mốc 17
    'che': 'leafy', 'ca_phe': 'fruit_bush', 'ho_tieu': 'trellis', 'mia': 'tall', 'nep_nuong': 'grain', 'mang_tay': 'leafy',
    'nam_rom': 'head', 'muop_dang': 'trellis', 'muop': 'trellis', 'dau_dua': 'trellis', 'dau_phong': 'root', 'khoai_mon': 'root',
    'sen': 'flower', 'ot_chuong': 'fruit_bush', 'bi_dao': 'vine', 'rau_den': 'leafy',
}


def base():
    p = Pix()
    p.px(SOIL, '#dcb98a')
    return p


def sprout():
    p = base()
    p.px(line(8, 12, 8, 10), L4)
    p.blob(ellipse(6.5, 9.5, 1.8, 1.1), L2)
    p.blob(ellipse(9.5, 9.5, 1.8, 1.1), L2)
    return p.im


def leaves(p, n, top, spread, color=L2):
    """Chùm lá hình giọt từ gốc (8,12) toả lên."""
    for i in range(n):
        t = i / max(n - 1, 1)
        x = 8 + (t - 0.5) * 2 * spread
        p.px(line(8, 12, round(x), top + 2), L4)
        p.blob(ellipse(x, top + 1.5, 1.3, 2.2), color)


def dominant(icon):
    """Màu chủ đạo của icon (bỏ viền trắng và màu lá)."""
    counts = {}
    for c in icon.getdata():
        if c[3] < 200 or (c[0] > 225 and c[1] > 225 and c[2] > 215):
            continue
        if c[1] > c[0] + 25 and c[1] > c[2]:  # xanh lá
            continue
        counts[c[:3]] = counts.get(c[:3], 0) + 1
    return max(counts, key=counts.get) if counts else (200, 120, 80)


ROOT_COLOR = {'radish': '#f1ece0', 'garlic': '#efe8da'}  # củ trắng: không tự dò màu được


def strip_outline(icon):
    """Bỏ viền trắng của icon nông sản để đặt lên cây trông tự nhiên."""
    out = icon.copy()
    for y in range(out.height):
        for x in range(out.width):
            if out.getpixel((x, y))[:3] == (0xf3, 0xf4, 0xe7):
                out.putpixel((x, y), (0, 0, 0, 0))
    return out


def mini(icon, size):
    icon = strip_outline(icon)
    box = icon.getbbox()
    return icon.crop(box).resize((size, size), Image.NEAREST)


def stages(name, kind, icon):
    col = ROOT_COLOR.get(name) or '#%02x%02x%02x' % dominant(icon)
    s1 = sprout()
    p2 = base(); p3 = base(); p4 = base()
    if kind == 'root':
        leaves(p2, 3, 8, 2)
        leaves(p3, 5, 5, 3)
        leaves(p4, 5, 3, 3.5, L3)
        p4.blob(ellipse(8, 12, 3, 1.8), col)
    elif kind in ('head', 'leafy'):
        leaves(p2, 3, 8, 2)
        leaves(p3, 5, 6, 3)
        if kind == 'head':
            p3.blob(ellipse(8, 10.5, 3, 2.2), L1)
            p4.im.alpha_composite(mini(icon, 12), (2, 2))
        else:
            leaves(p4, 7, 2, 4.5, L3)
    elif kind in ('fruit_bush', 'vine', 'trellis'):
        leaves(p2, 4, 7, 2.5)
        p3.blob(ellipse(8, 8, 5, 4), L2); p3.blob(ellipse(6, 7, 2.5, 2), L1)
        p3.px([(5, 9), (10, 6), (9, 10)], '#f3f2c0')  # hoa trắng
        p4.blob(ellipse(8, 7.5, 5.5, 4.5), L3); p4.blob(ellipse(6, 6.5, 2.5, 2), L2)
        if kind == 'trellis':
            for q in (p3, p4):
                q.px(line(2, 13, 2, 2) | line(13, 13, 13, 2) | line(2, 3, 13, 3), '#b68962')
        f = mini(icon, 7 if kind != 'vine' else 9)
        spots = [(2, 6), (8, 7)] if kind == 'fruit_bush' else [(4, 5)] if kind == 'vine' else [(3, 4), (8, 5)]
        for (x, y) in spots:
            p4.im.alpha_composite(f, (x, y))
    elif kind in ('tall', 'grain'):
        for q, h in ((p2, 8), (p3, 4), (p4, 2)):
            for x in ((6, 10) if kind == 'tall' else (5, 8, 11)):
                q.px(line(x, 12, x, h), L3)
                q.blob(ellipse(x + 1.5, h + 3, 1.2, 1.8), L2)
        top = mini(icon, 6)
        for x in ((5, 9) if kind == 'tall' else (3, 6, 9)):
            p4.im.alpha_composite(top, (x, 1))
    elif kind in ('flower', 'flower_tall'):
        leaves(p2, 3, 8, 2)
        leaves(p3, 4, 5, 2.5)
        p3.blob(ellipse(8, 5, 1.6, 1.6), '#%02x%02x%02x' % tuple(min(255, c + 40) for c in dominant(icon)))
        p4.im.alpha_composite(mini(icon, 13), (1, 0))
    bag = seed_bag_from(icon)
    return [bag, s1, p2.im, p3.im, p4.im, icon]


def seed_bag_from(icon):
    plants = Image.open(ASSETS / 'Objects/Basic_Plants.png').convert('RGBA')
    wheat_bag = plants.crop((0, 0, 16, 16))
    beet_bag = plants.crop((0, 16, 16, 32))
    bag = wheat_bag.copy()
    same = [wheat_bag.getpixel((x, y)) for y in range(16) for x in range(16) if wheat_bag.getpixel((x, y)) == beet_bag.getpixel((x, y))]
    paper = max(set(p for p in same if p[3] == 255), key=same.count)
    for y in range(16):
        for x in range(16):
            if wheat_bag.getpixel((x, y)) != beet_bag.getpixel((x, y)):
                bag.putpixel((x, y), paper)
    bag.alpha_composite(mini(icon, 7), (5, 6))
    return bag


def main():
    names = list(CROPS)
    sheet = Image.new('RGBA', (96, 16 * len(names)), (0, 0, 0, 0))
    for r, name in enumerate(names):
        icon = Image.open(ICONS / f'{name}.png').convert('RGBA')
        for i, fr in enumerate(stages(name, CROPS[name], icon)):
            sheet.alpha_composite(fr, (i * 16, r * 16))
    sheet.save(OUT / 'crops_season.png')
    (OUT / 'crops_season.json').write_text(json.dumps(names, ensure_ascii=False, indent=1))
    print(f'{len(names)} cây → {OUT / "crops_season.png"}')


if __name__ == '__main__':
    main()
