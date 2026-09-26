"""Hình mốc 14: đồ trang trí đặt trên nông trại + xe bò ở bến.

Chạy:  python3 tools/draw_m14.py && python3 tools/pack_icons.py
Icon 16×16 → assets/Custom/proposals/deco_*.png ; xe bò 32×24 → assets/Custom/cart.png
"""
from PIL import Image
from draw_proposals import Pix, ellipse, rect, line, OUT, ROOT


def deco():
    p = Pix()  # đèn đứng
    p.px(line(7, 6, 7, 15) | line(8, 6, 8, 15), '#3b3438')
    p.blob(rect(5, 1, 10, 6), '#f0c850', light='#fff0a0')
    p.px(line(5, 0, 10, 0), '#3b3438')
    p.px(line(5, 15, 10, 15), '#3b3438')
    p.outline().save('deco_lamp')
    p = Pix()  # ghế đá
    p.blob(rect(2, 7, 13, 9), '#a8b0b6')
    p.blob(rect(3, 10, 4, 14) | rect(11, 10, 12, 14), '#8a9096')
    p.outline().save('deco_bench')
    p = Pix()  # chậu hoa
    p.blob({(x, y) for x in range(16) for y in range(9, 15) if abs(x - 7.5) <= 4.5 - (y - 9) * 0.3}, '#c0663b')
    for (x, y, c) in ((5, 5, '#f2a6b8'), (8, 4, '#f0c850'), (11, 6, '#f2a6b8'), (7, 7, '#e05a6a')):
        p.blob(ellipse(x, y, 1.8, 1.8), c)
    p.px(line(8, 6, 8, 9), '#67835c')
    p.outline().save('deco_pot')
    p = Pix()  # tượng đá (con nghê)
    p.blob(rect(4, 12, 11, 15), '#8a9096')
    p.blob(ellipse(8, 8, 3.8, 4), '#b8c0c6')
    p.blob(ellipse(8, 3.8, 2.6, 2.4), '#b8c0c6')
    p.px([(7, 3), (9, 3)], '#3b3438')
    p.outline().save('deco_statue')
    p = Pix()  # khóm tre
    for x, h in ((4, 1), (7, 0), (10, 2), (12, 4)):
        p.px(line(x, h, x, 15), '#78a158')
        for y in range(h + 2, 15, 4):
            p.px([(x, y)], '#4a7a3a')
        p.blob(ellipse(x + 1.5, h + 2, 2, 1), '#a4c263')
    p.outline().save('deco_bamboo')
    p = Pix()  # cối xay gió nhỏ
    p.blob(rect(6, 7, 9, 15), '#e8dcc0')
    p.px(line(2, 2, 13, 11) | line(13, 2, 2, 11), '#8a5a36')
    p.blob(ellipse(7.5, 6.5, 1.4, 1.4), '#c0563b')
    p.outline().save('deco_windmill')


def cart():
    """Xe bò 32×24: thùng gỗ, bánh xe, con bò kéo."""
    q = Pix(32, 24)
    q.blob(rect(2, 6, 17, 13), '#b8864a')
    q.px(line(2, 9, 17, 9), '#8a5a36')
    for cx in (6, 14):
        q.blob({(x, y) for x in range(32) for y in range(24) if (x - cx) ** 2 + (y - 16) ** 2 <= 16}, '#6e4a2a')
        q.px([(cx, 16)], '#c8a060')
    q.px(line(17, 11, 22, 11), '#8a5a36')
    q.blob(rect(21, 8, 28, 15), '#f3f4e7')
    q.blob(rect(26, 5, 30, 10), '#f3f4e7')
    q.px([(23, 10), (25, 13), (22, 13)], '#3b2a2e')
    q.px([(29, 7)], '#3b2a2e')
    q.px([(26, 4), (30, 4)], '#c8a060')
    q.px(line(22, 16, 22, 19) | line(27, 16, 27, 19), '#3b2a2e')
    q.outline('#3b2a2e')
    q.im.save(ROOT / 'assets' / 'Custom' / 'cart.png')


if __name__ == '__main__':
    deco()
    cart()
    print('xong →', OUT)
