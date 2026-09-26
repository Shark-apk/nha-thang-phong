"""Hình cho bản thiết kế giai đoạn 2 (và dùng lại trong game ở mốc 11–18).

Chạy:  python3 tools/draw_phase2.py  → assets/Custom/phase2/
- cover.png        320×180  cảnh trang bìa (đồng lúa, núi, nhà, cây đa, trời hoàng hôn)
- avatars.png      8 nhân vật chibi 32×32 (thân + tóc + áo + nón) — ngoại hình tự ghép
- guests.png       24 chân dung khách mời 32×32 (12 dân gian + 12 tự thiết kế)
- farms.png        5 ảnh thu nhỏ bản đồ nông trại 96×64
- world.png        bản đồ thế giới 320×200
Tất cả tự vẽ, không dùng hình gốc Sprout Lands.
"""
import math
import random
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'Custom' / 'phase2'
OUT.mkdir(parents=True, exist_ok=True)
OUTLINE = (59, 42, 46, 255)


def rgb(h, a=255):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def mix(c, k):
    r, g, b, a = c
    if k > 0:
        return (int(r + (255 - r) * k), int(g + (255 - g) * k), int(b + (255 - b) * k), a)
    return (int(r * (1 + k)), int(g * (1 + k)), int(b * (1 + k)), a)


class Canvas:
    def __init__(self, w, h, bg=None):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), bg or (0, 0, 0, 0))
        self.px = self.im.load()

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = c

    def shape(self, pts, base, shade=True):
        base = rgb(base) if isinstance(base, str) else base
        light, dark = mix(base, 0.3), mix(base, -0.25)
        for (x, y) in pts:
            c = base
            if shade and ((x + 1, y + 1) not in pts or (x, y + 1) not in pts):
                c = dark
            elif shade and ((x - 1, y - 1) not in pts or (x, y - 1) not in pts):
                c = light
            self.put(x, y, c)

    def outline(self, color=OUTLINE):
        src = self.im.copy()
        sp = src.load()
        for y in range(self.h):
            for x in range(self.w):
                if sp[x, y][3]:
                    continue
                if any(0 <= x + dx < self.w and 0 <= y + dy < self.h and sp[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    self.px[x, y] = color
        return self


def ell(cx, cy, rx, ry, W=64, H=64):
    return {(x, y) for x in range(W) for y in range(H) if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1}


def box(x0, y0, x1, y1):
    return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}


def seg(x0, y0, x1, y1):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    return {(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)) for i in range(n + 1)}


# ---------------------------------------------------------------- nhân vật chibi 32×32

def avatar(skin, hair, shirt, pants, hair_style='short', hat=None, extra=None):
    c = Canvas(32, 32)
    c.shape(box(12, 27, 14, 30) | box(17, 27, 19, 30), pants)            # chân
    c.shape(box(10, 19, 21, 27), shirt)                                   # áo
    c.shape(box(8, 20, 9, 25) | box(22, 20, 23, 25), skin)               # tay
    c.shape(ell(16, 13, 7.5, 7, 32, 32), skin)                            # đầu
    if hair_style == 'short':
        c.shape({p for p in ell(16, 10, 8, 5.5, 32, 32) if p[1] <= 10}, hair)
    elif hair_style == 'long':
        c.shape({p for p in ell(16, 10, 8, 5.5, 32, 32) if p[1] <= 10} | box(8, 9, 9, 21) | box(22, 9, 23, 21), hair)
    elif hair_style == 'bun':
        c.shape({p for p in ell(16, 10, 8, 5.5, 32, 32) if p[1] <= 9} | ell(16, 4, 3, 2.6, 32, 32), hair)
    elif hair_style == 'spiky':
        c.shape({p for p in ell(16, 10, 8, 5.5, 32, 32) if p[1] <= 10} | seg(10, 6, 12, 2) | seg(15, 5, 16, 1) | seg(20, 6, 22, 2), hair)
    for ex in (13, 19):                                                   # mắt
        c.put(ex, 14, OUTLINE)
        c.put(ex, 15, OUTLINE)
    c.put(11, 17, rgb('#f0a0a0'))
    c.put(21, 17, rgb('#f0a0a0'))
    c.put(15, 18, rgb('#b86a6a'))
    c.put(16, 18, rgb('#b86a6a'))
    if hat == 'non_la':
        c.shape({(x, y) for x in range(32) for y in range(0, 9) if abs(x - 15.5) <= (y + 1) * 1.6}, '#e2c26a')
    elif hat == 'straw':
        c.shape(ell(16, 8, 11, 2.2, 32, 32) | ell(16, 6, 6, 3, 32, 32), '#e8c878')
        c.shape(box(10, 7, 21, 7), '#c7474f', shade=False)
    elif hat == 'beanie':
        c.shape({p for p in ell(16, 9, 8, 6, 32, 32) if p[1] <= 9} | ell(16, 2.5, 2, 2, 32, 32), '#5a8eaa')
    elif hat == 'band':
        c.shape(box(9, 9, 23, 10), '#c7474f', shade=False)
    if extra == 'scarf':
        c.shape(box(10, 19, 21, 20) | box(18, 21, 20, 24), '#f0c040')
    elif extra == 'apron':
        c.shape(box(12, 21, 19, 27), '#f3f4e7')
    elif extra == 'overalls':
        c.shape(box(12, 22, 19, 27) | box(12, 19, 13, 21) | box(18, 19, 19, 21), '#3f6fa8')
    elif extra == 'rod':
        c.shape(seg(24, 30, 30, 4), '#8a5a36', shade=False)
        c.shape(seg(30, 4, 30, 14), '#e8e8e8', shade=False)
    return c.outline()


AVATARS = [
    ('#f3cfae', '#3b2a2e', '#78a158', '#6e5a3a', 'short', 'straw', 'overalls'),   # nông dân
    ('#f6dcc0', '#3b2a2e', '#c7474f', '#3b2a2e', 'long', None, 'apron'),          # đầu bếp
    ('#e8b890', '#6e4a2a', '#5a8eaa', '#3b4a5a', 'short', 'non_la', 'rod'),       # ngư dân
    ('#f3cfae', '#f0c040', '#f3f4e7', '#6e7a86', 'spiky', 'beanie', 'scarf'),     # mùa đông
    ('#d9a07a', '#3b2a2e', '#8a5ab0', '#3b2a2e', 'bun', None, None),
    ('#f6dcc0', '#c0563b', '#f0c040', '#5a8eaa', 'long', 'band', None),
    ('#cf946c', '#e0dcd6', '#b8864a', '#6e5a3a', 'short', None, 'apron'),
    ('#f3cfae', '#5a3a6e', '#3f7fbf', '#3b2a2e', 'spiky', None, 'scarf'),
]


# ---------------------------------------------------------------- khách mời 32×32

def guest(skin, hair, shirt, style, extra=()):
    c = Canvas(32, 32)
    c.shape(box(6, 24, 25, 31), shirt)
    c.shape(ell(16, 15, 8, 8.5, 32, 32), skin)
    top = {p for p in ell(16, 11, 9, 6, 32, 32) if p[1] <= 11}
    if style == 'short':
        c.shape(top, hair)
    elif style == 'long':
        c.shape(top | box(6, 10, 8, 26) | box(24, 10, 26, 26), hair)
    elif style == 'bun':
        c.shape(top | ell(16, 3.5, 3.5, 3, 32, 32), hair)
    elif style == 'bald':
        c.shape({p for p in top if p[0] < 10 or p[0] > 22}, hair)
    elif style == 'topknot':
        c.shape(top | box(15, 1, 17, 4), hair)
    if 'robot' in extra:                                   # mèo máy tự thiết kế: đầu vuông bo cam, ăng-ten, mắt đèn
        c.shape(box(6, 6, 26, 24) - {(6, 6), (26, 6), (6, 24), (26, 24)}, '#f0a040')
        c.shape(box(9, 11, 23, 21), '#fdf0d8')
        c.shape({(x, y) for x in range(6, 12) for y in range(0, 7) if y >= abs(x - 9) * 2} | {(x, y) for x in range(20, 26) for y in range(0, 7) if y >= abs(x - 23) * 2}, '#f0a040')
        c.shape(seg(16, 0, 16, 5), '#6e6a6a', shade=False)
        c.shape(ell(16, 0.5, 1.5, 1.5, 32, 32), '#7ad0f0', shade=False)
        c.shape(box(11, 14, 13, 16) | box(19, 14, 21, 16), '#3fb8e0', shade=False)
        c.shape(seg(14, 19, 18, 19), '#3b2a2e', shade=False)
        c.shape(box(10, 26, 22, 29), '#9aa4ac')
    if 'monkey' in extra:                                  # Tôn Ngộ Không: vòng kim cô, mặt khỉ
        c.shape(ell(16, 17, 6, 5, 32, 32), '#f0d0a8')
        c.shape(box(7, 9, 25, 10), '#f0c040')
    if 'helmet' in extra:                                  # mũ sắt Thánh Gióng
        c.shape({p for p in ell(16, 11, 9.5, 7, 32, 32) if p[1] <= 11} | box(15, 1, 17, 4), '#8a98a6')
    if 'crown' in extra:
        c.shape(box(10, 3, 22, 6) | {(10, 1), (10, 2), (16, 0), (16, 1), (16, 2), (22, 1), (22, 2)}, '#f0c040')
    if 'moon' in extra:
        c.shape({p for p in ell(26, 5, 4, 4, 32, 32) if not p in ell(28, 4, 3.5, 3.5, 32, 32)}, '#f8e878')
    if 'khan_dong' in extra:                               # khăn đóng áo dài
        c.shape(box(8, 5, 24, 9), '#2a4a7a')
    if 'mic' in extra:
        c.shape(seg(24, 30, 26, 22), '#3b2a2e', shade=False)
        c.shape(ell(26.5, 21, 2, 2, 32, 32), '#9aa4ac')
    if 'ball' in extra:
        c.shape(ell(26, 27, 4, 4, 32, 32), '#f6f6f2')
        c.shape({(25, 26), (26, 27), (27, 26), (26, 28)}, '#3b2a2e', shade=False)
    if 'chef' in extra:
        c.shape(box(9, 3, 23, 8) | ell(12, 3, 3.5, 3, 32, 32) | ell(20, 3, 3.5, 3, 32, 32) | ell(16, 2, 3.5, 3, 32, 32), '#f6f6f2')
    if 'bear' in extra:
        c.shape(ell(9, 6, 3, 3, 32, 32) | ell(23, 6, 3, 3, 32, 32), '#8a5a36')
        c.shape(box(4, 13, 6, 18) | box(26, 13, 28, 18), '#3b2a2e')   # tai nghe
    if 'tophat' in extra:
        c.shape(box(10, 0, 22, 7) | box(7, 7, 25, 8), '#2c2230')
        c.shape(box(10, 5, 22, 5), '#c7474f', shade=False)
    if 'duck' in extra:                                    # rapper vịt: mũ lưỡi trai ngược + dây chuyền
        c.shape(ell(16, 18, 4, 2, 32, 32), '#f0a030')
        c.shape(box(8, 6, 24, 9), '#d8382e')
        c.shape(seg(11, 26, 16, 29) | seg(16, 29, 21, 26), '#f0c040', shade=False)
    if 'cat' in extra:
        c.shape({(x, y) for x in range(7, 12) for y in range(2, 9) if y >= 2 + abs(x - 9) * 1.4} | {(x, y) for x in range(20, 25) for y in range(2, 9) if y >= 2 + abs(x - 22) * 1.4}, '#e8e0d0')
    if 'goggles' in extra:
        c.shape(ell(12.5, 11, 3, 2.5, 32, 32) | ell(19.5, 11, 3, 2.5, 32, 32), '#7ab8e0')
        c.shape(box(7, 10, 25, 10), '#6e4a2a', shade=False)
    if 'sash' in extra:
        c.shape(seg(7, 24, 25, 31) | seg(8, 24, 25, 30), '#f3f4e7', shade=False)
    if 'dragon' in extra:
        c.shape(box(7, 9, 25, 10), '#c7474f')
    if 'beard' in extra:
        c.shape(ell(16, 21, 5, 3, 32, 32), hair)
    if 'robot' not in extra:
        for ex in (13, 19):
            c.put(ex, 16, OUTLINE)
            c.put(ex, 17, OUTLINE)
        c.put(15, 20, rgb('#b86a6a'))
        c.put(16, 20, rgb('#b86a6a'))
        c.put(10, 19, rgb('#f0a0a0'))
        c.put(22, 19, rgb('#f0a0a0'))
    else:
        c.put(13, 12, OUTLINE)
        c.put(19, 12, OUTLINE)
    return c.outline()


GUESTS = [
    # 12 nhân vật dân gian
    ('thanh_giong', '#e8b890', '#3b2a2e', '#8a98a6', 'short', ('helmet',)),
    ('tam', '#f6dcc0', '#3b2a2e', '#f0c040', 'long', ('crown',)),
    ('chu_cuoi', '#d9a07a', '#3b2a2e', '#78a158', 'short', ()),
    ('chi_hang', '#f8e8e0', '#2c2230', '#f3f4e7', 'long', ('moon',)),
    ('thach_sanh', '#d9a07a', '#3b2a2e', '#b8864a', 'topknot', ()),
    ('trang_quynh', '#e8b890', '#2c2230', '#2a4a7a', 'short', ('khan_dong', 'beard')),
    ('thang_bom', '#f3cfae', '#3b2a2e', '#c8a060', 'bald', ()),
    ('son_tinh', '#d9a07a', '#3b2a2e', '#5a8a4a', 'topknot', ('crown',)),
    ('thuy_tinh', '#b8d0d8', '#2a5a7a', '#3f7fbf', 'long', ('crown',)),
    ('tao_quan', '#e8b890', '#3b2a2e', '#d8382e', 'short', ('khan_dong', 'beard')),
    ('ong_dia', '#f0c8a0', '#2c2230', '#f0a030', 'bald', ()),
    ('ngo_khong', '#c8905a', '#8a5a36', '#e07a30', 'short', ('monkey',)),
    # 12 nhân vật tự thiết kế (gợi nhớ, không phải người/nhân vật thật)
    ('meo_may', '#f6f6f2', '#3f8fd8', '#3f8fd8', 'none', ('robot',)),
    ('sieu_sao_son_ca', '#f6dcc0', '#c0563b', '#d8385a', 'long', ('mic',)),
    ('thanh_sut', '#d9a07a', '#3b2a2e', '#d8382e', 'short', ('ball',)),
    ('chef_tung', '#f3cfae', '#3b2a2e', '#f6f6f2', 'short', ('chef',)),
    ('streamer_gau', '#b8864a', '#8a5a36', '#5a3a6e', 'short', ('bear',)),
    ('ao_thuat_gia', '#f3cfae', '#2c2230', '#2c2230', 'short', ('tophat',)),
    ('nu_hiep_ao_dai', '#f6dcc0', '#2c2230', '#c7474f', 'long', ('dragon',)),
    ('rapper_vit', '#f6f2e0', '#f6f2e0', '#2c2230', 'none', ('duck',)),
    ('bac_si_meo', '#e8e0d0', '#e8e0d0', '#f6f6f2', 'none', ('cat',)),
    ('phi_cong_co', '#f6f6f2', '#f6f6f2', '#5a8eaa', 'none', ('goggles',)),
    ('hoa_hau_sen', '#f8e0d8', '#2c2230', '#f2a6b8', 'long', ('crown', 'sash')),
    ('thay_vo_rong', '#d9a07a', '#3b2a2e', '#f0c040', 'bald', ('dragon', 'beard')),
]


# ---------------------------------------------------------------- cảnh trang bìa 320×180

def cover():
    rnd = random.Random(3)
    W, H = 320, 180
    c = Canvas(W, H)
    for y in range(H):                                     # trời hoàng hôn
        t = y / 110
        top, bot = rgb('#f6b27a'), rgb('#fbe3b0')
        col = tuple(int(top[i] + (bot[i] - top[i]) * min(1, t)) for i in range(3)) + (255,)
        for x in range(W):
            c.put(x, y, col)
    c.shape(ell(240, 52, 16, 16, W, H), '#fff2c0', shade=False)       # mặt trời
    for (cx, cy, rx) in ((60, 40, 22), (110, 30, 16), (190, 44, 20)):
        c.shape(ell(cx, cy, rx, 5, W, H) | ell(cx + 8, cy - 4, rx * 0.6, 5, W, H), '#fff6e8', shade=False)
    far = {(x, y) for x in range(W) for y in range(H) if y > 92 - 22 * math.sin(x / 34) - 10 * math.sin(x / 13 + 1)}
    c.shape(far, '#b8a0c0', shade=False)
    near = {(x, y) for x in range(W) for y in range(H) if y > 108 - 14 * math.sin(x / 45 + 2) - 6 * math.sin(x / 17)}
    c.shape(near, '#8aa878', shade=False)
    for y in range(118, H):                                # đồng lúa vàng, luống
        for x in range(W):
            base = rgb('#e8c050') if (y // 5) % 2 == 0 else rgb('#d8a840')
            if rnd.random() < 0.08:
                base = mix(base, 0.25)
            c.put(x, y, base)
    for x in range(0, W, 3):                               # bông lúa
        h = 3 + rnd.randrange(3)
        for y in range(118 - h, 119):
            c.put(x, y, rgb('#d8a840'))
    c.shape(box(40, 92, 88, 118), '#b8864a')               # nhà
    c.shape({(x, y) for x in range(34, 95) for y in range(70, 93) if y >= 70 + abs(x - 64) * 0.72}, '#c0563b')
    c.shape(box(58, 104, 68, 118), '#6e4a2a')
    c.shape(box(46, 98, 54, 106) | box(74, 98, 82, 106), '#f8e0a0', shade=False)
    c.shape(box(252, 96, 258, 122), '#6e4a2a')             # cây đa
    c.shape(ell(255, 84, 30, 18, W, H) | ell(236, 94, 14, 10, W, H) | ell(276, 92, 16, 11, W, H), '#5a8a4a')
    for (x, y) in ((150, 150), (175, 140), (205, 156)):    # bù nhìn, vịt
        pass
    c.shape(box(160, 128, 161, 150), '#8a5a36', shade=False)
    c.shape(box(154, 134, 167, 135), '#8a5a36', shade=False)
    c.shape({(x, y) for x in range(152, 170) for y in range(118, 127) if y >= 118 + abs(x - 160.5) * 0.7}, '#e2c26a')
    c.shape(box(157, 136, 164, 144), '#c7474f')
    for i in range(5):                                     # đàn cò bay
        x, y = 130 + i * 14, 40 + (i % 2) * 6
        c.shape(seg(x - 3, y - 2, x, y) | seg(x, y, x + 3, y - 2), '#f6f6f2', shade=False)
    return c


# ---------------------------------------------------------------- trang bìa nhiều lớp theo mùa (mốc 11)

COVER_SEASONS = {
    # trời trên, trời dưới, núi xa, đồi gần, ruộng 1, ruộng 2, tán cây, mặt trời/trăng
    'spring': ('#f8c8d4', '#dcecf2', '#b8a8c8', '#9cc86a', '#8cc050', '#7ab040', '#f2a6b8', '#fff6e0'),
    'summer': ('#6cb8f0', '#d8f0ff', '#88a8c8', '#6aa848', '#6ab040', '#5a9a38', '#4a8a3a', '#fff8c0'),
    'fall': ('#f6b27a', '#fbe3b0', '#b8a0c0', '#8aa878', '#e8c050', '#d8a840', '#d88a3a', '#fff2c0'),
    'winter': ('#a8b8cc', '#e8eef4', '#a8b0c0', '#c8d4d8', '#e6eaec', '#d4dadc', '#e8eef4', '#f4f4f0'),
}


def cover_layers(season):
    """5 lớp 320×180: sky (nền kín), far, near, field, props — ghép lệch nhau khi rê chuột."""
    sky_top, sky_bot, far_c, near_c, f1, f2, canopy, sun = COVER_SEASONS[season]
    rnd = random.Random(7)
    W, H = 320, 180
    sky = Canvas(W, H)
    for y in range(H):
        t = min(1, y / 110)
        a, b = rgb(sky_top), rgb(sky_bot)
        col = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)
        for x in range(W):
            sky.put(x, y, col)
    sky.shape(ell(240, 50, 15, 15, W, H), sun, shade=False)
    for (cx, cy, rx) in ((60, 38, 22), (112, 28, 16), (192, 44, 20), (290, 24, 14)):
        sky.shape(ell(cx, cy, rx, 5, W, H) | ell(cx + 8, cy - 4, rx * 0.6, 5, W, H), '#fff8f0', shade=False)
    if season in ('spring', 'fall'):
        for i in range(5):
            x, y = 128 + i * 14, 58 + (i % 2) * 6
            sky.shape(seg(x - 3, y - 2, x, y) | seg(x, y, x + 3, y - 2), '#f6f6f2', shade=False)
    far = Canvas(W, H)
    pts = {(x, y) for x in range(W) for y in range(H) if y > 92 - 22 * math.sin(x / 34) - 10 * math.sin(x / 13 + 1)}
    far.shape(pts, far_c, shade=False)
    if season == 'winter':
        far.shape({(x, y) for (x, y) in pts if y < 92 - 22 * math.sin(x / 34) - 10 * math.sin(x / 13 + 1) + 7}, '#f6f8fa', shade=False)
    near = Canvas(W, H)
    near.shape({(x, y) for x in range(W) for y in range(H) if y > 108 - 14 * math.sin(x / 45 + 2) - 6 * math.sin(x / 17)}, near_c, shade=False)
    field = Canvas(W, H)
    for y in range(118, H):
        for x in range(W):
            base = rgb(f1) if (y // 5) % 2 == 0 else rgb(f2)
            if rnd.random() < 0.08:
                base = mix(base, 0.22)
            field.put(x, y, base)
    for x in range(0, W, 3):
        if season == 'winter':
            continue
        h = 3 + rnd.randrange(3) if season == 'fall' else 1 + rnd.randrange(3)
        for y in range(118 - h, 119):
            field.put(x, y, rgb(f2))
    props = Canvas(W, H)
    props.shape(box(40, 92, 88, 118), '#b8864a')
    props.shape({(x, y) for x in range(34, 95) for y in range(70, 93) if y >= 70 + abs(x - 64) * 0.72}, '#c0563b' if season != 'winter' else '#e8eef4')
    props.shape(box(58, 104, 68, 118), '#6e4a2a')
    props.shape(box(46, 98, 54, 106) | box(74, 98, 82, 106), '#5b3b33', shade=False)   # cửa sổ (sáng lên ban đêm bằng lớp khác)
    props.shape(box(252, 96, 258, 122), '#6e4a2a')
    if season == 'winter':
        props.shape(seg(255, 96, 240, 78) | seg(255, 98, 272, 80) | seg(255, 94, 256, 70) | seg(246, 86, 238, 88) | seg(266, 88, 276, 86), '#6e4a2a', shade=False)
        props.shape({(x, 77) for x in range(238, 244)} | {(x, 79) for x in range(270, 276)}, '#f6f8fa', shade=False)
    else:
        props.shape(ell(255, 84, 30, 18, W, H) | ell(236, 94, 14, 10, W, H) | ell(276, 92, 16, 11, W, H), canopy)
        if season == 'spring':
            for _ in range(40):
                x, y = rnd.randrange(228, 290), rnd.randrange(68, 104)
                if (x, y) in ell(255, 84, 30, 18, W, H):
                    props.put(x, y, rgb('#fbe0e8'))
    props.shape(box(160, 128, 161, 150), '#8a5a36', shade=False)
    props.shape(box(154, 134, 167, 135), '#8a5a36', shade=False)
    props.shape({(x, y) for x in range(152, 170) for y in range(118, 127) if y >= 118 + abs(x - 160.5) * 0.7}, '#e2c26a')
    props.shape(box(157, 136, 164, 144), '#c7474f')
    return {'sky': sky, 'far': far, 'near': near, 'field': field, 'props': props}


# ---------------------------------------------------------------- bản đồ nông trại thu nhỏ 96×64

def farm_thumb(kind):
    rnd = random.Random(len(kind))
    W, H = 96, 64
    c = Canvas(W, H)
    pal = {
        'plain': ('#9cc86a', '#6aa8c8', '#8a6a4a'),
        'coast': ('#e8d8a0', '#4aa0d0', '#b89a6a'),
        'tea': ('#78a858', '#8ab8d0', '#5a8a4a'),
        'highland': ('#b86a4a', '#6aa8c8', '#6e3a2a'),
        'delta': ('#8ac070', '#5aa0b8', '#7a5a3a'),
    }[kind]
    grass, water, soil = pal
    for y in range(H):
        for x in range(W):
            c.put(x, y, mix(rgb(grass), 0.08) if rnd.random() < 0.15 else rgb(grass))
    if kind == 'plain':
        c.shape(ell(76, 46, 12, 8, W, H), water, shade=False)
        c.shape(box(30, 20, 60, 44), soil)
        for y in range(22, 44, 4):
            for x in range(32, 59, 3):
                c.put(x, y, rgb('#78a158'))
    elif kind == 'coast':
        for y in range(H):
            for x in range(W):
                if x > 62 + 6 * math.sin(y / 7):
                    c.put(x, y, rgb(water))
        for (x, y) in ((20, 14), (40, 50), (52, 20)):
            c.shape(box(x, y, x + 1, y + 7), '#8a5a36', shade=False)
            c.shape(ell(x, y, 5, 2, W, H), '#5a9a3a', shade=False)
        c.shape(box(14, 28, 38, 40), soil)
    elif kind == 'tea':
        for i, y in enumerate(range(6, 60, 9)):
            for x in range(4, 92):
                if (x + i * 5) % 6 < 5:
                    c.put(x, y, rgb('#4a7a3a'))
                    c.put(x, y + 1, rgb('#4a7a3a'))
            for x in range(W):
                c.put(x, y + 4, mix(rgb(grass), -0.2))
    elif kind == 'highland':
        for y in range(H):
            for x in range(W):
                if rnd.random() < 0.5:
                    c.put(x, y, mix(rgb(grass), -0.08))
        for y in range(10, 58, 8):
            for x in range(8, 90, 8):
                c.shape(ell(x, y, 3, 3, W, H), '#3a6a2a')
                c.put(x, y, rgb('#c83a2a'))
    elif kind == 'delta':
        for y in range(H):
            for x in range(W):
                if abs(y - 32 - 8 * math.sin(x / 12)) < 5 or abs(x - 30) < 3:
                    c.put(x, y, rgb(water))
        for (x, y) in ((12, 10), (60, 12), (74, 50), (14, 52)):
            c.shape(ell(x, y, 6, 5, W, H), '#4a8a3a')
            c.put(x - 2, y, rgb('#f0c040'))
            c.put(x + 2, y + 1, rgb('#d8382e'))
    c.shape(box(8, 6, 18, 14), '#c0563b')                  # nhà
    c.shape(box(9, 10, 17, 16), '#b8864a')
    return c


def world():
    rnd = random.Random(9)
    W, H = 320, 200
    c = Canvas(W, H)
    for y in range(H):
        for x in range(W):
            c.put(x, y, rgb('#5aa0c8') if rnd.random() > 0.03 else rgb('#7ab8d8'))
    land = {(x, y) for x in range(W) for y in range(H) if ((x - 150) / 140) ** 2 + ((y - 100) / 88) ** 2 + 0.12 * math.sin(x / 11) * math.cos(y / 9) < 1}
    c.shape(land, '#a4c870', shade=False)
    c.outline(rgb('#e8d8a0'))
    mount = {p for p in ell(240, 48, 60, 30, W, H) if p in land}
    c.shape(mount, '#8a9a78', shade=False)                                                     # núi đông bắc
    for (x, y0) in ((200, 30), (216, 22), (234, 26), (252, 18), (270, 28), (286, 36), (226, 44), (258, 46)):
        c.shape({(xx, yy) for xx in range(x - 9, x + 10) for yy in range(y0, y0 + 22) if yy >= y0 + abs(xx - x) * 2.2 and (xx, yy) in mount}, '#9aa4ac')
        c.shape({(xx, yy) for xx in range(x - 3, x + 4) for yy in range(y0, y0 + 6) if yy >= y0 + abs(xx - x) * 2.2 and (xx, yy) in mount}, '#f6f6f2', shade=False)
    c.shape({p for p in ell(60, 64, 50, 40, W, H) if p in land}, '#5a8a4a', shade=False)       # rừng tây bắc
    for i in range(40):
        x, y = rnd.randrange(20, 90), rnd.randrange(30, 98)
        if (x, y) in land:
            c.shape(ell(x, y, 3, 3, W, H), '#3a6a2a')
    river = {(x, y) for x in range(W) for y in range(H) if abs(y - (120 + 18 * math.sin(x / 30))) < 3 and (x, y) in land}
    c.shape(river, '#5aa0c8', shade=False)
    c.shape(ell(292, 170, 20, 12, W, H), '#e8d8a0', shade=False)                              # đảo
    c.shape(ell(292, 168, 12, 7, W, H), '#78a858', shade=False)
    for (x, y) in ((64, 22), (80, 14), (96, 20)):                                              # mây trên trời
        c.shape(ell(x, y, 10, 5, W, H), '#fff6f0', shade=False)
    return c


if __name__ == '__main__':
    cover().im.save(OUT / 'cover.png')
    (OUT / 'cover').mkdir(exist_ok=True)
    for season in COVER_SEASONS:
        for name, layer in cover_layers(season).items():
            layer.im.save(OUT / 'cover' / f'{season}_{name}.png')
    sheet = Image.new('RGBA', (32 * len(AVATARS), 32), (0, 0, 0, 0))
    for i, a in enumerate(AVATARS):
        sheet.alpha_composite(avatar(*a).im, (i * 32, 0))
    sheet.save(OUT / 'avatars.png')
    sheet = Image.new('RGBA', (32 * 12, 64), (0, 0, 0, 0))
    for i, (_id, *g) in enumerate(GUESTS):
        sheet.alpha_composite(guest(*g).im, ((i % 12) * 32, (i // 12) * 32))
    sheet.save(OUT / 'guests.png')
    sheet = Image.new('RGBA', (96 * 5, 64), (0, 0, 0, 0))
    for i, k in enumerate(('plain', 'coast', 'tea', 'highland', 'delta')):
        sheet.alpha_composite(farm_thumb(k).im, (i * 96, 0))
    sheet.save(OUT / 'farms.png')
    world().im.save(OUT / 'world.png')
    print('→', OUT)
