"""Hình mốc 18: đồ rừng, đồ lặn biển, cá rạn san hô, kiếm gỗ, quái trong hang (dơi, slime, người đá), lỗ xuống tầng.

Chạy:  python3 tools/draw_m18.py && python3 tools/pack_icons.py
Icon 16×16 → assets/Custom/proposals/ ; quái 16×16 × 2 khung → assets/Custom/monsters.png (3 hàng)
"""
from PIL import Image
from draw_proposals import Pix, ellipse, rect, line, thick, round_fruit, long_veg, cluster, OUT, ROOT, rgb, mix
from draw_m8 import fish


def forest():
    p = Pix()  # nấm rừng: mũ đỏ chấm trắng
    p.blob(ellipse(8, 7, 5.5, 3.5), '#c8402a')
    p.blob(rect(6, 9, 9, 14), '#f0e8d8')
    p.px([(6, 6), (9, 5), (11, 7)], '#f6f6f2')
    p.outline().save('nam_rung')
    long_veg('mang', '#c8b070', top='#8ab04a', width=2, stripes=[(6, 10), (8, 8)])
    p = Pix()  # mật ong rừng: tổ treo
    p.blob(ellipse(8, 9, 5, 6), '#c8902a')
    for y in (6, 9, 12):
        p.px(line(3, y, 12, y), '#8a5a1a')
    p.px(line(8, 1, 8, 3), '#6e4a2a')
    p.outline().save('mat_ong_rung')
    p = Pix()  # gỗ quý: khúc gỗ đỏ sẫm
    p.blob(rect(2, 5, 13, 11), '#8a3a2a')
    p.blob(ellipse(3, 8, 2, 3), '#c8784a')
    p.px([(3, 8)], '#8a3a2a')
    p.outline().save('go_quy')


def sea():
    p = Pix()  # rác: chai nhựa
    p.blob(rect(5, 5, 10, 14), '#a8d0d8')
    p.blob(rect(6, 2, 9, 4), '#3f7fbf')
    p.px(line(5, 9, 10, 9), '#e8e8e8')
    p.outline('#8a9aa0').save('rac')
    p = Pix()  # vỏ sò
    p.blob({(x, y) for x in range(16) for y in range(16) if ((x - 7.5) / 6) ** 2 + ((y - 9) / 5) ** 2 <= 1 and y >= 4}, '#f2c8b0')
    for x in (4, 6, 8, 10, 12):
        p.px(line(8, 13, x, 5), '#d8a088')
    p.outline().save('vo_so')
    p = Pix()  # nhím biển
    p.blob(ellipse(8, 9, 4, 4), '#5a2a6a')
    for (x0, y0, x1, y1) in ((8, 4, 8, 1), (4, 6, 2, 4), (12, 6, 14, 4), (3, 10, 1, 11), (13, 10, 15, 11), (6, 13, 5, 15), (10, 13, 11, 15)):
        p.px(line(x0, y0, x1, y1), '#3a1a4a')
    p.outline().save('nhim_bien')
    p = Pix()  # ngọc trai
    p.blob(ellipse(8, 9, 6, 4.5), '#e8d0c0')
    p.blob(ellipse(8, 8, 2.6, 2.6), '#f6f6ff', light='#ffffff', dark='#c8c8e0')
    p.outline().save('ngoc_trai')
    p = Pix()  # san hô
    for (x0, y0, x1, y1) in ((8, 14, 8, 5), (8, 10, 4, 6), (8, 9, 12, 4), (4, 6, 3, 3), (12, 4, 13, 2)):
        p.px(thick(line(x0, y0, x1, y1), 1), '#f07a6a')
    p.outline().save('san_ho')
    fish('fish_mu', '#a86a3a', '#e8c090', 'big')
    fish('fish_hong', '#e04a4a', '#f8b0a0', 'normal')
    fish('fish_duoi', '#6a7a8a', '#c0d0e0', 'round')


def gear():
    p = Pix()  # kiếm gỗ
    p.px(thick(line(4, 12, 12, 4), 1), '#c8a060')
    p.px(line(3, 10, 6, 13), '#6e4a2a')
    p.px(line(2, 14, 4, 12), '#8a5a36')
    p.outline().save('sword')
    p = Pix()  # lỗ thang xuống
    p.blob(ellipse(8, 9, 6, 4.5), '#1a141e', light='#2a222e', dark='#0a060e')
    p.px(line(6, 6, 6, 12) | line(10, 6, 10, 12), '#8a5a36')
    for y in (7, 9, 11):
        p.px(line(6, y, 10, y), '#b8864a')
    p.save('ladder_down')


def monsters():
    sheet = Image.new('RGBA', (32, 48), (0, 0, 0, 0))
    for f in range(2):
        p = Pix()  # dơi
        wing = 3 if f == 0 else 6
        p.blob(ellipse(8, 8, 2.5, 2.5), '#5a3a6a')
        p.blob({(x, y) for x in range(1, 7) for y in range(wing, wing + 4) if y - wing <= (6 - x) * 0.7} | {(x, y) for x in range(10, 15) for y in range(wing, wing + 4) if y - wing <= (x - 9) * 0.7}, '#7a5a8a')
        p.px([(7, 7), (9, 7)], '#f0d040')
        sheet.alpha_composite(p.outline('#2a1a2e').im, (f * 16, 0))
        p = Pix()  # slime
        h = 5 if f == 0 else 4
        p.blob({(x, y) for x in range(16) for y in range(16) if ((x - 7.5) / (5 + (1 - f))) ** 2 + ((y - 11) / h) ** 2 <= 1 and y <= 14}, '#7ac04a', light='#b8e890', dark='#4a8a2a')
        p.px([(6, 10), (9, 10)], '#2a3a1a')
        sheet.alpha_composite(p.outline('#2a3a1a').im, (f * 16, 16))
        p = Pix()  # người đá
        p.blob(rect(4, 5 + f, 11, 13), '#8a8f96')
        p.blob(rect(2, 7 + f, 3, 11), '#7a7f86')
        p.blob(rect(12, 7 + f, 13, 11), '#7a7f86')
        p.blob(rect(5, 13, 6, 15) | rect(9, 13, 10, 15), '#6a6f76')
        p.px([(6, 8 + f), (9, 8 + f)], '#f06a3a')
        sheet.alpha_composite(p.outline('#3b3438').im, (f * 16, 32))
    sheet.save(ROOT / 'assets' / 'Custom' / 'monsters.png')


if __name__ == '__main__':
    forest()
    sea()
    gear()
    monsters()
    print('xong →', OUT)
