"""Hình cho mốc 8: 20 loại cá, cần câu 3 cấp, món ăn, bếp, đèn lồng, cờ hội, bầu cua, nhà kính.

Chạy:  python3 tools/draw_m8.py && python3 tools/pack_icons.py
Icon 16×16 → assets/Custom/proposals/ (gom vào icons.png); nhà kính 64×48 → assets/Custom/greenhouse.png
"""
import math
from PIL import Image
from draw_proposals import Pix, ellipse, rect, line, thick, rgb, mix, OUT, ROOT

hexs = lambda c: '#%02x%02x%02x' % c[:3]

# ---------------------------------------------------------------- cá
FISH = [
    # id, thân, bụng/vây, dáng
    ('fish_tre', '#5a5048', '#8a7a6a', 'long_whisker'),
    ('fish_loc', '#4a5a4a', '#8aa088', 'long'),
    ('fish_chep', '#c8a050', '#e8d090', 'normal'),
    ('fish_tram', '#6a7a70', '#b8c4b0', 'normal'),
    ('fish_me', '#a8b4c0', '#e0e8ee', 'round'),
    ('fish_basa', '#8a96a4', '#e8eef2', 'long_whisker'),
    ('fish_linh', '#c0c8d0', '#f0f4f6', 'small'),
    ('luon', '#8a6a3a', '#c8a060', 'eel'),
    ('tom_cang', '#5a7aa0', '#e07a50', 'shrimp'),
    ('cua_dong', '#6a5a3a', '#a08a5a', 'crab'),
    ('fish_bong', '#9a8a70', '#d0c0a0', 'small'),
    ('fish_ro_phi', '#6a7a8a', '#a0b0c0', 'round'),
    ('fish_thu', '#4a6a9a', '#c8d8e8', 'normal'),
    ('fish_ngu', '#2a4a7a', '#b8c8d8', 'big'),
    ('muc', '#e8b8b0', '#f8e0d8', 'squid'),
    ('fish_nuc', '#5a8aa0', '#d0e0e8', 'small'),
    ('fish_keo', '#8a8060', '#c0b890', 'eel'),
    ('fish_bac_ma', '#9aaab8', '#eef2f6', 'normal'),
    ('fish_chep_vang', '#f0b030', '#fff0a0', 'big'),
]


def fish(name, body, belly, shape):
    p = Pix()
    if shape in ('normal', 'round', 'small', 'big', 'long', 'long_whisker'):
        rx, ry = {'normal': (5, 3), 'round': (4.5, 4), 'small': (4, 2.3), 'big': (6, 3.8), 'long': (6, 2.4), 'long_whisker': (6, 2.6)}[shape]
        cx = 7.5
        p.blob(ellipse(cx, 8, rx, ry), body)
        p.blob({(x, y) for (x, y) in ellipse(cx, 9.2, rx - 1, ry - 1.4)}, belly)
        tx = int(cx + rx)
        p.blob({(x, y) for x in range(tx - 1, tx + 3) for y in range(8 - (x - tx + 2), 9 + (x - tx + 2))}, body)
        p.px([(int(cx - rx + 2), 7)], '#2c2230')
        if shape == 'long_whisker':
            p.px([(int(cx - rx) - 1, 9), (int(cx - rx) - 2, 10), (int(cx - rx), 10)], '#3b2a2e')
        p.px(line(int(cx - 1), int(8 - ry), int(cx + 2), int(8 - ry)), hexs(mix(rgb(body), -0.3)))
    elif shape == 'eel':
        pts = {(x, round(8 + 2.2 * math.sin(x / 2.2))) for x in range(1, 15)}
        p.blob(thick(pts, 1), body)
        p.px([(2, round(8 + 2.2 * math.sin(1 / 2.2)))], '#2c2230')
    elif shape == 'shrimp':
        pts = {(round(8 + 4.5 * math.cos(a / 10)), round(8 + 4.5 * math.sin(a / 10))) for a in range(-20, 25)}
        p.blob(thick(pts, 1), belly)
        p.px(line(11, 4, 15, 1) | line(12, 5, 15, 3), body)
        p.px([(12, 7)], '#2c2230')
    elif shape == 'crab':
        p.blob(ellipse(8, 9, 5, 3.4), body)
        for sx in (-1, 1):
            p.blob(ellipse(8 + sx * 6, 5.5, 1.8, 1.6), belly)
            for i in range(3):
                p.px(line(8 + sx * 4, 10 + i, 8 + sx * 6, 12 + i), hexs(mix(rgb(body), -0.2)))
        p.px([(6, 7), (10, 7)], '#2c2230')
    elif shape == 'squid':
        p.blob(ellipse(8, 5.5, 3.4, 4.5), body)
        for x in (5, 7, 9, 11):
            p.px(line(x, 9, x + (1 if x > 8 else -1), 14), belly)
        p.px([(7, 7), (9, 7)], '#2c2230')
    p.outline().save(name)


# ---------------------------------------------------------------- món ăn trong tô / đĩa
DISHES = [
    ('dish_com', 'bowl', '#f6f4ec', ['#ffffff']),
    ('dish_trung', 'plate', '#f0c840', ['#fff8e0']),
    ('dish_canh_chua', 'bowl', '#e8a040', ['#e04040', '#7ab04a']),
    ('dish_ca_kho', 'pot', '#8a4a2a', ['#c07040']),
    ('dish_rau_xao', 'plate', '#5a9a3a', ['#8ac060', '#f0f0d0']),
    ('dish_banh_bi', 'plate', '#e08a30', ['#f0b060']),
    ('dish_che', 'cup', '#d88aa0', ['#f0d0a0', '#7ab04a']),
    ('dish_banh_chung', 'square', '#4a8a3a', ['#e8e0c0']),
    ('dish_banh_trung_thu', 'cake', '#c88a40', ['#e8b060']),
]


def dish(name, kind, food, bits):
    p = Pix()
    if kind == 'bowl':
        p.blob({(x, y) for (x, y) in ellipse(8, 8, 6, 5.5) if y >= 8}, '#e8e0d4')
        p.px(line(3, 13, 12, 13), '#5a8eaa')
        p.blob(ellipse(8, 8, 5.5, 2), food)
    elif kind == 'plate':
        p.blob(ellipse(8, 10, 7, 3.2), '#eeeae2')
        p.blob(ellipse(8, 9, 4.5, 2.2), food)
    elif kind == 'pot':
        p.blob(rect(3, 7, 12, 13), '#6e6a6a')
        p.blob(ellipse(7.5, 7, 4.6, 1.6), food)
        p.px([(2, 8), (13, 8)], '#3b2a2e')
    elif kind == 'cup':
        p.blob(rect(4, 5, 11, 14), '#f0f4f6', light='#ffffff', dark='#c8d0d6')
        p.blob(rect(5, 6, 10, 12), food)
    elif kind == 'square':
        p.blob(rect(3, 4, 12, 13), food)
        p.px(line(3, 8, 12, 8) | line(7, 4, 7, 13), '#e8d8a0')
    elif kind == 'cake':
        p.blob(ellipse(8, 9, 5.5, 5), food)
        p.blob(ellipse(8, 9, 3, 2.8), bits[0])
        p.px([(8, 9), (7, 8), (9, 10)], hexs(mix(rgb(food), -0.3)))
    for i, b in enumerate(bits):
        if kind in ('bowl', 'plate', 'cup'):
            for (x, y) in ((6 + i * 2, 8 - (kind == 'cup') * 0), (9 - i, 9)):
                p.px([(x, y)], b)
    p.outline().save(name)


def misc():
    for name, col in (('rod_2', '#5a8eaa'), ('rod_3', '#e0b030')):
        p = Pix()
        p.px(line(2, 14, 13, 2), col)
        p.px(line(3, 14, 14, 2), hexs(mix(rgb(col), -0.35)))
        p.px([(13, y) for y in range(3, 10)], '#e8e8e8')
        p.blob(ellipse(13, 11, 1.2, 1.2), '#c7474f')
        p.blob(ellipse(4, 12, 2, 2), '#3b2a2e')
        p.outline().save(name)
    p = Pix()  # bếp lò
    p.blob(rect(2, 5, 13, 14), '#8a5a3a')
    p.blob(rect(4, 9, 11, 13), '#3b2a2e')
    p.px([(6, 11), (8, 12), (10, 11), (7, 12), (9, 11)], '#f08a30')
    p.blob(ellipse(8, 5, 4, 1.5), '#6e6a6a')
    p.px(line(8, 1, 8, 3), '#c8c8c8')
    p.outline().save('stove')
    p = Pix()  # đèn lồng đỏ
    p.px(line(8, 0, 8, 2), '#3b2a2e')
    p.blob(ellipse(8, 8, 5, 5.5), '#d8382e')
    p.px(line(3, 8, 12, 8) | line(8, 3, 8, 13), '#f0c040')
    p.blob(rect(6, 13, 9, 14), '#f0c040')
    p.outline().save('lantern')
    p = Pix()  # đèn ông sao
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        r = 6.5 if i % 2 == 0 else 2.8
        pts.append((8 + r * math.cos(a), 8 + r * math.sin(a)))
    star = {(x, y) for x in range(16) for y in range(16) if _inside(x + 0.5, y + 0.5, pts)}
    p.blob(star, '#f0c030', light='#fff0a0')
    p.px([(8, 8), (7, 8), (8, 7)], '#e84030')
    p.outline().save('star_lantern')
    p = Pix()  # dây cờ hội
    p.px(line(0, 3, 15, 3), '#8a5a36')
    for i, c in enumerate(('#d8382e', '#f0c040', '#3f7fbf', '#7ab04a')):
        x = 1 + i * 4
        p.blob({(xx, yy) for xx in range(x, x + 3) for yy in range(4, 11) if abs(xx - (x + 1)) <= (10 - yy) / 2.4}, c)
    p.outline().save('bunting')
    for name, draw in (('bc_bau', 'gourd'), ('bc_cua', 'crab'), ('bc_tom', 'shrimp'), ('bc_ca', 'normal'), ('bc_ga', 'chick'), ('bc_nai', 'deer')):
        if draw in ('crab', 'shrimp', 'normal'):
            fish(name, {'crab': '#c84a30', 'shrimp': '#e07a50', 'normal': '#3f7fbf'}[draw], {'crab': '#e8805a', 'shrimp': '#f0a070', 'normal': '#a8d0f0'}[draw], draw)
            continue
        p = Pix()
        if draw == 'gourd':
            p.blob(ellipse(8, 11, 4.5, 4), '#8ab04a')
            p.blob(ellipse(8, 5.5, 2.8, 2.6), '#8ab04a')
            p.px(line(8, 1, 9, 3), '#67835c')
        elif draw == 'chick':
            p.blob(ellipse(8, 10, 5, 4.5), '#f0f0e8')
            p.blob(ellipse(10, 5, 2.8, 2.6), '#f0f0e8')
            p.blob(rect(10, 1, 11, 2), '#d8382e')
            p.px([(13, 5)], '#f0a030')
            p.px([(10, 5)], '#2c2230')
        elif draw == 'deer':
            p.blob(ellipse(8, 10, 5, 3.5), '#b8864a')
            p.blob(ellipse(11, 5.5, 2.4, 2.2), '#b8864a')
            p.px(line(10, 3, 9, 0) | line(12, 3, 13, 0), '#6e5a3a')
            p.px([(6, 9), (8, 11), (5, 11)], '#f0e0c0')
            p.px([(11, 5)], '#2c2230')
        p.outline().save(name)


def _inside(x, y, poly):
    c = False
    for i in range(len(poly)):
        (x1, y1), (x2, y2) = poly[i], poly[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def greenhouse():
    """Nhà kính 64×48: khung gỗ, mái kính xanh nhạt, cửa giữa."""
    q = Pix(64, 48)
    q.blob({(x, y) for x in range(2, 62) for y in range(4, 22) if y >= 22 - (30 - abs(x - 31.5)) * 0.62}, '#bfe3ec', light='#e6f6fa', dark='#8cc0cc')
    q.blob(rect(4, 20, 59, 46), '#cfeaf0', light='#eefafc', dark='#9ccad4')
    for x in range(4, 60, 8):
        q.px(line(x, 20, x, 46), '#8a6a3a')
    for y in (20, 33, 46):
        q.px(line(4, y, 59, y), '#8a6a3a')
    q.px(line(2, 21, 31, 3) | line(32, 3, 61, 21), '#6e4a2a')
    q.blob(rect(27, 32, 36, 46), '#8a5a36')
    q.px([(34, 39)], '#f0c040')
    for (x, y) in ((10, 26), (22, 38), (44, 26), (52, 40)):
        q.blob(ellipse(x, y, 2.4, 2), '#7ab04a')
    q.im.save(ROOT / 'assets' / 'Custom' / 'greenhouse.png')


if __name__ == '__main__':
    for f in FISH:
        fish(*f)
    for d in DISHES:
        dish(*d)
    misc()
    greenhouse()
    print('xong →', OUT)
