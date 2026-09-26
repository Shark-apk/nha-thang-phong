"""Icon pixel art 16×16 cho bản đề xuất mở rộng game (cây, trái, vật nuôi, sản phẩm, máy, dụng cụ, dân làng).

Chạy:  python3 tools/draw_proposals.py  → assets/Custom/proposals/<tên>.png (16×16, riêng dân làng 24×24)
Dùng hình khối + tô bóng tự động (sáng trên-trái, tối dưới-phải) + viền trắng như nông sản của Sprout Lands.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'Custom' / 'proposals'
OUT.mkdir(parents=True, exist_ok=True)
PACK = ROOT / 'assets'


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def mix(c, k):
    """Sáng lên (k>0) hoặc tối đi (k<0)."""
    r, g, b, a = c
    if k > 0:
        return (int(r + (255 - r) * k), int(g + (255 - g) * k), int(b + (255 - b) * k), a)
    return (int(r * (1 + k)), int(g * (1 + k)), int(b * (1 + k)), a)


class Pix:
    def __init__(self, w=16, h=16):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))

    def blob(self, mask, base, light=None, dark=None):
        """Tô vùng `mask` (tập (x,y)) với bóng: sáng ở mép trên-trái, tối ở mép dưới-phải."""
        base = rgb(base) if isinstance(base, str) else base
        light = mix(base, 0.35) if light is None else rgb(light)
        dark = mix(base, -0.28) if dark is None else rgb(dark)
        for (x, y) in mask:
            if not (0 <= x < self.w and 0 <= y < self.h):
                continue
            c = base
            if (x + 1, y + 1) not in mask or (x, y + 1) not in mask:
                c = dark
            elif (x - 1, y - 1) not in mask or (x, y - 1) not in mask:
                c = light
            self.im.putpixel((x, y), c)

    def px(self, pts, color):
        c = rgb(color)
        for (x, y) in pts:
            if 0 <= x < self.w and 0 <= y < self.h:
                self.im.putpixel((x, y), c)

    def outline(self, color='#f3f4e7'):
        c = rgb(color)
        src = self.im.copy()
        for y in range(self.h):
            for x in range(self.w):
                if src.getpixel((x, y))[3]:
                    continue
                if any(0 <= x + dx < self.w and 0 <= y + dy < self.h and src.getpixel((x + dx, y + dy))[3]
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    self.im.putpixel((x, y), c)
        return self

    def save(self, name):
        self.im.save(OUT / f'{name}.png')


def ellipse(cx, cy, rx, ry):
    return {(x, y) for x in range(32) for y in range(32) if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1}


def rect(x0, y0, x1, y1):
    return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}


def line(x0, y0, x1, y1):
    pts = set()
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1):
        pts.add((round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)))
    return pts


def thick(pts, r=1):
    return {(x + dx, y + dy) for (x, y) in pts for dx in range(-r, r + 1) for dy in range(-r, r + 1) if dx * dx + dy * dy <= r * r}


LEAF, LEAF2, STEM = '#a4c263', '#78a158', '#67835c'

# ---------------------------------------------------------------- hình mẫu nông sản

def round_fruit(name, color, leaf=True, r=5.5, spot=None):
    p = Pix()
    p.blob(ellipse(8, 9, r, r - 0.3), color)
    if spot:
        p.px(spot[0], spot[1])
    if leaf:
        p.blob(ellipse(9.5, 3.5, 2.2, 1.2), LEAF)
        p.px([(8, 3), (8, 4)], STEM)
    p.outline().save(name)


def long_veg(name, color, top=LEAF, width=2, stripes=None):
    p = Pix()
    body = thick(line(4, 12, 10, 5), width)
    p.blob(body, color)
    if stripes:
        p.px(stripes, mix(rgb(color), -0.35)[:3] and '#%02x%02x%02x' % mix(rgb(color), -0.35)[:3])
    if top:
        p.blob(thick(line(10, 5, 13, 2), 1) | thick(line(11, 5, 14, 4), 0) | thick(line(10, 4, 11, 1), 0), top)
    p.outline().save(name)


def leafy(name, outer, inner):
    p = Pix()
    p.blob(ellipse(8, 9, 6, 5.2), outer)
    p.blob(ellipse(8, 9, 3.6, 3.2), inner)
    p.px([(8, 7), (8, 8), (7, 10), (9, 10)], '#%02x%02x%02x' % mix(rgb(inner), 0.4)[:3])
    p.outline().save(name)


def cluster(name, color, n=((6, 6), (10, 6), (8, 8), (5, 9), (11, 9), (8, 11), (6, 12), (10, 12), (8, 14))):
    p = Pix()
    for (x, y) in n:
        p.blob(ellipse(x, y, 1.9, 1.9), color)
    p.px(line(8, 1, 8, 4), STEM)
    p.blob(ellipse(10.5, 3, 2, 1.1), LEAF)
    p.outline().save(name)


def flower(name, petal, center, petals=8):
    import math
    p = Pix()
    p.px(line(8, 10, 8, 15), STEM)
    p.blob(ellipse(10.5, 13, 2, 1), LEAF)
    for i in range(petals):
        a = i * 2 * math.pi / petals
        p.blob(ellipse(8 + 3.3 * math.cos(a), 6 + 3.3 * math.sin(a), 2, 2), petal)
    p.blob(ellipse(8, 6, 2.2, 2.2), center)
    p.outline().save(name)


def draw_crops():
    # Xuân
    long_veg('radish', '#f1ece0', stripes=None)
    leafy('cabbage', '#9cc26a', '#c9de8e')
    round_fruit('potato', '#c9a06a', leaf=False, r=5, spot=([(6, 8), (10, 11), (9, 6)], '#9b7445'))
    p = Pix()  # rau muống: bó thân rỗng + lá dài
    for x in (5, 7, 9, 11):
        p.px(line(x, 15, x + 1, 6), '#8fb35a')
    for (x, y) in ((4, 5), (7, 3), (10, 4), (12, 6)):
        p.blob(ellipse(x, y, 2.4, 1.3), '#7fa650')
    p.blob(rect(5, 11, 12, 12), '#d6b37c')
    p.outline().save('water_spinach')
    # Hạ
    p = Pix()  # dưa hấu
    m = ellipse(8, 9, 6.5, 5.5)
    p.blob(m, '#5f9a4a')
    p.px([(x, y) for (x, y) in m if (x + y // 3) % 3 == 0], '#3f7440')
    p.outline().save('watermelon')
    p = Pix()  # bắp
    p.blob(ellipse(8, 8, 3, 6), '#eccb53')
    p.px([(x, y) for x in range(5, 12) for y in range(3, 14) if (x + y) % 2 == 0 and ((x + 0.5 - 8) / 3) ** 2 + ((y + 0.5 - 8) / 6) ** 2 <= 0.8], '#d4ad35')
    p.blob(thick(line(4, 15, 7, 7), 1), '#8db15d')
    p.blob(thick(line(12, 15, 9, 8), 1), '#a4c263')
    p.outline().save('corn')
    long_veg('chili', '#d9493f', top=STEM, width=1)
    long_veg('cucumber', '#6f9f4a', top=None, width=2)
    p = Pix()  # lúa
    for i, x in enumerate((5, 8, 11)):
        p.px(line(x, 15, x + 1, 4), '#b8a14a')
        for y in range(4, 11, 2):
            p.blob(ellipse(x + 1.8, y, 1.2, 0.9), '#eadb8c')
    p.outline().save('rice')
    # Thu
    long_veg('sweet_potato', '#9b5a78', top=None, width=2)
    long_veg('eggplant', '#6b4a8a', top=LEAF2, width=2)
    cluster('grape', '#8a5ab0')
    flower('sunflower', '#f0c040', '#8a5a2e', petals=10)
    # Đông
    round_fruit('kohlrabi', '#b7d98a', leaf=True, r=4.8)
    p = Pix()  # tỏi
    p.blob(ellipse(8, 10, 5, 4.5), '#efe8da')
    p.px(line(8, 6, 8, 14), '#d8cdb8')
    p.px(line(5, 8, 6, 13) | line(11, 8, 10, 13), '#d8cdb8')
    p.blob(thick(line(8, 6, 9, 1), 0), '#a4c263')
    p.outline().save('garlic')
    p = Pix()  # hành lá
    for x in (6, 8, 10):
        p.px(line(x, 14, x, 2 + (x % 3)), '#7fa650')
        p.px(line(x + 1, 14, x + 1, 4), '#a4c263')
    p.blob(rect(5, 12, 11, 14), '#f1ece0')
    p.outline().save('scallion')
    flower('chrysanthemum', '#f2c64a', '#d99a2e', petals=12)
    # Hoa Tết
    flower('apricot_blossom', '#f5d34a', '#d9832e', petals=5)
    flower('peach_blossom', '#f2a6b8', '#d9577a', petals=5)


def draw_fruits():
    p = Pix()  # xoài
    p.blob(ellipse(8, 9, 4.5, 6) - ellipse(3.5, 12, 2.5, 3), '#f0b84a', light='#f8d98a')
    p.px([(10, 5), (11, 6)], '#a4c263')
    p.px(line(8, 2, 9, 3), STEM)
    p.outline().save('mango')
    round_fruit('pomelo', '#c8d86a', r=6)
    p = Pix()  # vải
    p.blob(ellipse(8, 9, 4.8, 4.8), '#c7474f')
    p.px([(x, y) for (x, y) in ellipse(8, 9, 4.8, 4.8) if (x * 3 + y) % 4 == 0], '#e57a74')
    p.px(line(8, 2, 8, 4), STEM)
    p.outline().save('lychee')
    round_fruit('orange', '#ef9a3a', r=5.2)
    p = Pix()  # thanh long
    m = ellipse(8, 9, 4.6, 5.8)
    p.blob(m, '#e0558c')
    for (x, y) in ((4, 6), (12, 7), (5, 12), (11, 12), (8, 3)):
        p.blob(thick(line(x, y, x + (1 if x < 8 else -1), y - 2), 0), '#8db15d')
    p.outline().save('dragon_fruit')
    p = Pix()  # chuối
    for off in (0, 3, 6):
        p.blob(thick({(x, round(10 - 4 * ((x - 8) / 5) ** 2) + off // 2) for x in range(3 + off // 3, 14 - off // 3)}, 1), '#f2d25a')
    p.px(line(12, 3, 13, 6), '#8a6a3a')
    p.outline().save('banana')


# ---------------------------------------------------------------- vật nuôi (tự vẽ bằng lưới ASCII)

ANIMAL_PAL = {
    '.': None, 'k': '#4a3a3a', 'w': '#f6f2e6', 'W': '#d9d2c2', 'y': '#f0c040', 'o': '#e08a3a', 'p': '#f2b8b0', 'P': '#d9868a',
    'b': '#8a6a52', 'B': '#5e4a3e', 'g': '#9aa39a', 'G': '#6e766e', 'a': '#3f3f48', 'A': '#2c2c34', 'e': '#1c1c22', 'h': '#f3e3a6',
}


def ascii_sprite(name, rows):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row.ljust(16, '.')[:16]):
            c = ANIMAL_PAL[ch]
            if c:
                im.putpixel((x, y), rgb(c))
    im.save(OUT / f'{name}.png')


def draw_animals():
    ascii_sprite('duck', [
        '................', '................', '................', '.........www....', '........wwwww...',
        '........wwewwoo.', '........wwwwoo..', '..w.....wwww....', '..ww...wwwww....', '..wwwwwwwwwww...',
        '..WwwwwwwwwW....', '...WWwwwwWW.....', '....WWWWWW......', '.....o...o......', '....oo..oo......', '................'])
    ascii_sprite('sheep', [
        '................', '................', '.....wwww.......', '...wwwwwwww.....', '..wwwwwwwwwwkk..',
        '.wwwwwwwwwwkekk.', '.wwWwwwWwwwkkkk.', '.wwwwwwwwwwwkk..', '.wWwwwWwwwWww...', '..wwwwwwwwwww...',
        '...WWWWWWWWW....', '...k.k...k.k....', '...k.k...k.k....', '...A.A...A.A....', '................', '................'])
    ascii_sprite('pig', [
        '................', '................', '................', '...........pp...', '..pppppppppPpp..',
        '.pppppppppppppp.', 'ppppppppppppepP.', 'pppppppppppppPPP', 'ppppppppppppPkPk', 'Ppppppppppppp...',
        '.PPpppppppppP...', '..PPPPPPPPPP....', '..PP.PP..PP.PP..', '..PP.PP..PP.PP..', '................', '................'])
    ascii_sprite('goat', [
        '................', '..........G.G...', '...........GG...', '..........wwww..', '..........wewwk.',
        '...wwwwwwwwwwkk.', '..wwwwwwwwwwwk..', '.wwwwwwwwwwwW...', '.wwWwwwwwwwWW...', '..wwwwwwwwwW.h..',
        '..WwwwwwwwWW.h..', '...WWWWWWWW.....', '...w.w...w.w....', '...w.w...w.w....', '...G.G...G.G....', '................'])
    ascii_sprite('buffalo', [
        '................', '.........G....G.', '..........GaaG..', '.........aaaaaa.', '..aaaaaaaaeaaeaa',
        '.aaaaaaaaaaaaaa.', 'aaaaaaaaaaaagga.', 'aaaaaaaaaaaaggg.', 'aaaaaaaaaaaaa...', 'Aaaaaaaaaaaaa...',
        '.AAaaaaaaaaaA...', '..AAAAAAAAAA....', '..aa.aa..aa.aa..', '..aa.aa..aa.aa..', '..AA.AA..AA.AA..', '................'])
    ascii_sprite('rabbit', [
        '................', '..........w.w...', '..........w.w...', '..........wpwp..', '..........wwww..',
        '.........wwewwp.', '....wwwwwwwwwp..', '...wwwwwwwwww...', '..wwwwwwwwwww...', '.wwwwwwwwwwww...',
        '.wwwwwwwwwwW....', '.WWwwwwwwwWW....', '..WWWWWWWWW.....', '...pp....pp.....', '................', '................'])
    p = Pix()  # ong + tổ
    p.blob(rect(2, 6, 13, 14), '#d9a54a')
    for y in (8, 11):
        p.px(line(2, y, 13, y), '#a8742a')
    p.blob(rect(1, 4, 14, 6), '#b8864a')
    p.px([(7, 12), (8, 12)], '#3b2a2e')
    p.blob(ellipse(12, 3, 1.6, 1.3), '#f0c040')
    p.px([(12, 2), (11, 3)], '#3b2a2e')
    p.save('beehive')


def draw_products():
    p = Pix()
    p.blob(ellipse(8, 9, 4.2, 5.2), '#b9d7d6')
    p.outline().save('duck_egg')
    p = Pix()
    for (x, y) in ((6, 8), (10, 8), (8, 6), (5, 11), (11, 11), (8, 11), (8, 9)):
        p.blob(ellipse(x, y, 2.6, 2.4), '#f6f2e6', light='#ffffff', dark='#d9d2c2')
    p.outline('#c9b9a0').save('wool')
    p = Pix()  # hũ mật ong
    p.blob(rect(4, 5, 11, 14), '#e8a83a', light='#f5c867', dark='#b97822')
    p.blob(rect(3, 3, 12, 5), '#c98a52')
    p.px([(5, 7), (5, 8), (5, 9)], '#fbe3a6')
    p.outline().save('honey')
    p = Pix()  # nấm truffle
    p.blob(ellipse(8, 9, 5, 4.5), '#6e5040')
    p.px([(6, 7), (9, 8), (7, 11), (10, 10)], '#8e6e56')
    p.outline().save('truffle')
    p = Pix()  # sữa dê (chai)
    p.blob(rect(5, 6, 10, 14), '#f6f2e6', light='#ffffff', dark='#d9d2c2')
    p.blob(rect(6, 3, 9, 5), '#e8dcc6')
    p.blob(rect(5, 9, 10, 11), '#a4c263')
    p.outline('#c9b9a0').save('goat_milk')
    p = Pix()  # thịt? không — lông thỏ
    p.blob(ellipse(8, 9, 5.2, 4), '#f0e6dc', light='#ffffff', dark='#d4c6b8')
    p.px([(6, 8), (9, 7), (11, 10)], '#f2b8b0')
    p.outline('#c9b9a0').save('rabbit_fur')
    # Hàng chế biến
    p = Pix()  # mứt
    p.blob(rect(4, 6, 11, 14), '#c7474f', light='#e57a74', dark='#8e2f37')
    p.blob(rect(3, 4, 12, 6), '#f2d3a2')
    p.px([(3, 4), (12, 4), (7, 3), (8, 3)], '#d99a9a')
    p.outline().save('jam')
    p = Pix()  # dưa muối
    p.blob(rect(4, 5, 11, 14), '#cde0c8', light='#e8f2e2', dark='#9fb89a')
    for (x, y) in ((6, 8), (9, 9), (7, 12), (10, 12)):
        p.blob(ellipse(x, y, 1.4, 1.1), '#7fa650')
    p.blob(rect(4, 3, 11, 5), '#b8864a')
    p.outline().save('pickle')
    p = Pix()  # nước ép
    p.blob(rect(5, 5, 10, 14), '#f0b84a', light='#f8d98a', dark='#c28a2a')
    p.blob(rect(6, 2, 9, 4), '#8db15d')
    p.outline().save('juice')
    p = Pix()  # gạo (bao)
    p.blob(rect(3, 5, 12, 14), '#e8d8b0', light='#f6ecd2', dark='#c9b58a')
    p.px(line(3, 5, 12, 5), '#b8a06a')
    p.blob(ellipse(8, 10, 2.5, 2), '#f6f2e6')
    p.outline().save('rice_bag')
    p = Pix()  # cá
    p.blob(ellipse(7, 8, 5, 3), '#7bb0c8')
    p.blob({(12, 6), (13, 5), (12, 8), (13, 8), (12, 10), (13, 11), (12, 7), (12, 9), (13, 9), (13, 7), (14, 5), (14, 11)}, '#5a8eaa')
    p.px([(4, 7)], '#1c1c22')
    p.outline().save('fish')


def draw_machines():
    p = Pix()  # bù nhìn
    p.px(line(8, 5, 8, 15), '#8a6a3a')
    p.px(line(3, 8, 13, 8), '#8a6a3a')
    p.blob(ellipse(8, 5, 2.6, 2.4), '#f2d3a2')
    p.blob(ellipse(8, 2.8, 4.6, 1.3) | rect(6, 1, 10, 3), '#d9b44a')  # nón lá
    p.blob(rect(6, 8, 10, 12), '#c7474f')
    p.outline().save('scarecrow')
    p = Pix()  # vòi tưới
    p.blob(rect(6, 8, 9, 14), '#9da8b0')
    p.blob(ellipse(7.5, 7, 3, 1.6), '#c1c8cc')
    for (x, y) in ((3, 4), (12, 4), (7, 2), (2, 7), (13, 7)):
        p.px([(x, y)], '#7ab8e0')
    p.outline().save('sprinkler')
    for name, body, top in (('sprinkler_2', '#c98a58', '#e0a878'), ('sprinkler_3', '#d9b040', '#f0d070')):
        p = Pix()  # vòi tưới đồng / vàng: thân nhuộm màu, thêm tia nước
        p.blob(rect(6, 8, 9, 14), body)
        p.blob(ellipse(7.5, 7, 3, 1.6), top)
        for (x, y) in ((3, 4), (12, 4), (7, 2), (2, 7), (13, 7), (1, 2), (14, 2), (7, 0)):
            p.px([(x, y)], '#7ab8e0')
        p.outline().save(name)
    p = Pix()  # hũ muối (vại sành)
    p.blob(ellipse(8, 9.5, 5, 5), '#9a6a4a')
    p.blob(rect(5, 3, 10, 5), '#7a5238')
    p.px(line(4, 9, 11, 9), '#c49a6c')
    p.outline().save('preserves_jar')
    p = Pix()  # thùng ủ
    p.blob(ellipse(8, 8.5, 5, 6), '#b6804a')
    for y in (5, 12):
        p.px(line(3, y, 12, y), '#6e6a6a')
    p.px([(8, 8), (8, 9)], '#5e4a3e')
    p.outline().save('keg')
    p = Pix()  # nong nia phơi (lò sấy)
    p.blob(ellipse(8, 10, 7, 3.2), '#d6b37c')
    p.blob(ellipse(8, 9.6, 5.5, 2.2), '#e8cfa6')
    for (x, y) in ((5, 9), (8, 10), (10, 9), (7, 8), (11, 10)):
        p.px([(x, y)], '#c7474f')
    p.outline().save('dehydrator')
    p = Pix()  # cối xay
    p.blob(rect(4, 7, 11, 14), '#c9bca4')
    p.blob(ellipse(8, 7, 4, 1.6), '#e2d8c2')
    p.px(line(8, 1, 8, 6), '#8a6a3a')
    p.px(line(3, 3, 13, 3), '#8a6a3a')
    p.outline().save('mill')
    p = Pix()  # ao cá
    p.blob(ellipse(8, 9, 7, 5), '#8cbfc2', light='#cbe0de')
    p.blob(ellipse(6, 9, 2, 1), '#e08a3a')
    p.blob(ellipse(10.5, 10.5, 1.6, 0.8), '#f6f2e6')
    p.outline('#9da89a').save('fish_pond')


def tint_tool(src_frame, name, metal):
    """Nhuộm phần kim loại xám của dụng cụ gốc thành đồng / sắt / vàng."""
    sheet = Image.open(PACK / 'Objects/Basic_tools_and_meterials.png').convert('RGBA')
    x, y = (src_frame % 3) * 16, (src_frame // 3) * 16
    im = sheet.crop((x, y, x + 16, y + 16))
    mc = rgb(metal)
    for yy in range(16):
        for xx in range(16):
            r, g, b, a = im.getpixel((xx, yy))
            if a and abs(r - g) < 18 and abs(g - b) < 22 and 70 < r < 225 and not (r > 230):
                lum = (r + g + b) / 3 / 170
                im.putpixel((xx, yy), (min(255, int(mc[0] * lum)), min(255, int(mc[1] * lum)), min(255, int(mc[2] * lum)), a))
    im.save(OUT / f'{name}.png')


def draw_tools():
    for tier, color in (('copper', '#d08a52'), ('iron', '#b8c4d0'), ('gold', '#f0c850')):
        tint_tool(2, f'hoe_{tier}', color)
        tint_tool(0, f'can_{tier}', color)


# ---------------------------------------------------------------- dân làng 24×24

def portrait(name, skin, hair, shirt, style, extra=None):
    p = Pix(24, 24)
    p.blob(rect(5, 17, 18, 23), shirt)                       # áo
    p.blob(ellipse(12, 11, 6, 6.5), skin)                    # mặt
    if style in ('short', 'bun', 'long', 'bald_side'):
        top = ellipse(12, 7.5, 6.6, 4.2) - ellipse(12, 11, 5.4, 5)
        if style == 'bald_side':
            top = {(x, y) for (x, y) in top if x < 8 or x > 16}
        p.blob(top | (rect(5, 6, 6, 12) if style != 'bald_side' else set()) | (rect(17, 6, 18, 12) if style != 'bald_side' else set()), hair)
        if style == 'bun':
            p.blob(ellipse(12, 2.6, 2.6, 2.2), hair)
        if style == 'long':
            p.blob(rect(4, 8, 6, 19) | rect(17, 8, 19, 19), hair)
    if style == 'non_la':                                     # nón lá
        p.blob({(x, y) for x in range(24) for y in range(9) if abs(x - 11.5) <= (y + 1) * 1.45}, '#e2c26a', light='#f2dc92', dark='#b8963e')
    for ex, ey in ((9, 11), (15, 11)):
        p.px([(ex, ey)], '#2c2230')
    p.px([(11, 14), (12, 14), (13, 14)], '#b86a6a')
    p.px([(8, 13), (16, 13)], '#f0a8a0')                      # má hồng
    if extra == 'glasses':
        p.px(line(8, 11, 10, 11) | line(14, 11, 16, 11) | {(11, 11), (12, 11), (13, 11)}, '#3b2a2e')
    if extra == 'beard':
        p.blob(ellipse(12, 16, 4, 2.4), hair)
    if extra == 'headband':
        p.px(line(6, 6, 18, 6), '#c7474f')
    if extra == 'flower':
        p.blob(ellipse(17, 5, 1.6, 1.6), '#f2a6b8')
    p.outline('#3b2a2e').save(name)


def draw_npcs():
    portrait('npc_ba_tu', '#f1c9a6', '#d8d2cc', '#8a5ab0', 'bun')                 # bà Tư — quầy hạt giống
    portrait('npc_bac_nam', '#d9a07a', '#3b2a2e', '#6e7a86', 'bald_side', 'beard')  # bác Năm — thợ rèn
    portrait('npc_chi_lan', '#f3cfae', '#3b2a2e', '#c7474f', 'long', 'flower')    # chị Lan — quán ăn
    portrait('npc_ong_bay', '#cf946c', '#e0dcd6', '#5a8eaa', 'non_la', 'beard')   # ông Bảy — ngư dân
    portrait('npc_co_mai', '#f3d2b6', '#3b2a2e', '#f3f4e7', 'long', 'glasses')    # cô Mai — cô giáo
    portrait('npc_be_ti', '#f1c9a6', '#3b2a2e', '#f0c040', 'short', 'headband')   # bé Tí — con nít
    portrait('npc_anh_hai', '#d9a07a', '#3b2a2e', '#78a158', 'short')             # anh Hai — nông dân chăn trâu
    portrait('npc_thay_lang', '#e8b890', '#9a9690', '#b8864a', 'bun', 'beard')    # thầy lang — cây thuốc


def draw_resources():
    p = Pix()  # cuốc chim
    p.px(thick(line(4, 13, 11, 6), 0) | thick(line(5, 13, 12, 6), 0), '#8a5a36')
    p.blob(thick({(x, round(3 + ((x - 9) / 4.5) ** 2 * 3)) for x in range(4, 15)}, 0) | {(9, 4), (9, 5), (10, 5)}, '#9aa4ac')
    p.outline().save('pickaxe')
    for name, speck in (('ore_copper', '#d9884a'), ('ore_iron', '#c9d6e2'), ('ore_gold', '#f0c848')):
        p = Pix()
        p.blob(ellipse(8, 9, 5.5, 4.6), '#8a8f96')
        p.px([(6, 7), (9, 8), (7, 10), (10, 11), (5, 9), (11, 7)], speck)
        p.px([(6, 6), (10, 7)], '#%02x%02x%02x' % mix(rgb(speck), 0.4)[:3])
        p.outline().save(name)
    p = Pix()  # bột mì
    p.blob(rect(4, 5, 11, 14), '#f3ecd8', light='#ffffff', dark='#d8cdb2')
    p.px(line(4, 5, 11, 5), '#c9b58a')
    p.px([(7, 9), (8, 9), (7, 10), (8, 10)], '#e2c46a')
    p.outline('#c9b9a0').save('flour')
    # cửa hang 32×32
    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    q = Pix(32, 32)
    q.blob({(x, y) for x in range(32) for y in range(32) if ((x - 15.5) / 15.5) ** 2 + ((y - 31) / 26) ** 2 <= 1}, '#8a8f96')
    q.blob({(x, y) for x in range(32) for y in range(32) if ((x - 15.5) / 8) ** 2 + ((y - 31) / 16) ** 2 <= 1}, '#231c26', light='#231c26', dark='#15101a')
    for (x, y) in ((6, 16), (24, 14), (11, 9), (20, 8), (4, 24), (27, 23)):
        q.blob(ellipse(x, y, 2.5, 1.8), '#a8b0b6')
    q.im.save(ROOT / 'assets' / 'Custom' / 'cave.png')
    p = Pix()  # trái cây sấy (nong nhỏ)
    p.blob(ellipse(8, 10, 6.5, 3.4), '#b8864a')
    for (x, y) in ((5, 9), (8, 9), (11, 9), (6, 11), (10, 11)):
        p.blob(ellipse(x, y, 1.4, 1), '#d9763a')
    p.outline().save('dried')
    p = Pix()  # thuốc bổ (bình sành buộc dây)
    p.blob(ellipse(8, 10, 4.5, 4.5), '#7a5238')
    p.blob(rect(6, 3, 9, 6), '#9a6a4a')
    p.px(line(5, 7, 10, 7), '#c7474f')
    p.px([(7, 2), (8, 2)], '#d6b37c')
    p.blob(ellipse(6.5, 9, 1.2, 1.4), '#b88a64')
    p.outline().save('tonic')
    p = Pix()  # cần câu tre
    p.px(line(2, 14, 13, 2), '#b8963e')
    p.px(line(3, 14, 14, 2), '#8a6a3a')
    p.px([(13, 3), (13, 4), (13, 5), (13, 6), (13, 7), (13, 8), (13, 9)], '#e8e8e8')
    p.blob(ellipse(13, 11, 1.2, 1.2), '#c7474f')
    p.blob(ellipse(4, 12, 1.8, 1.8), '#6e6a6a')
    p.outline().save('rod')
    p = Pix()  # đá quý xanh
    p.blob({(x, y) for x in range(16) for y in range(16) if abs(x - 7.5) / 5.5 + abs(y - 8.5) / 6 <= 1}, '#3fb8c8', light='#a8f0f0', dark='#1a7a8a')
    p.px([(6, 5), (7, 5), (5, 6)], '#f0fcfc')
    p.outline().save('gem')
    for name, flag in (('mailbox', False), ('mailbox_full', True)):
        p = Pix()  # hòm thư gỗ trên cọc
        p.px(line(7, 9, 7, 15) | line(8, 9, 8, 15), '#8a5a36')
        p.blob(rect(3, 3, 12, 9), '#c7474f' if flag else '#b8864a')
        p.px(line(4, 6, 11, 6), '#5e4032')
        if flag:
            p.px(line(13, 1, 13, 6), '#6e6a6a')
            p.blob(rect(13, 1, 15, 3), '#f0c850')
        p.outline().save(name)
    draw_mine()


def draw_mine():
    """Tileset hang đá 16×16: 0–3 nền, 4 vách, 5 chân vách, 6 thang, 7 đá, 8–10 quặng đồng/sắt/vàng, 11 đá to."""
    import random
    rnd = random.Random(5)
    sheet = Image.new('RGBA', (16 * 12, 16), (0, 0, 0, 0))
    def put(i, im):
        sheet.alpha_composite(im, (i * 16, 0))
    for i in range(4):  # nền đất hang, lốm đốm
        im = Image.new('RGBA', (16, 16), rgb('#5a4a4e'))
        for _ in range(10 + i * 3):
            x, y = rnd.randrange(16), rnd.randrange(16)
            im.putpixel((x, y), rgb(rnd.choice(['#4c3e42', '#66565a', '#6e5e60'])))
        if i == 3:
            for (x, y) in ((4, 5), (5, 5), (10, 11), (11, 11), (11, 12)):
                im.putpixel((x, y), rgb('#7a6a6a'))
        put(i, im)
    im = Image.new('RGBA', (16, 16), rgb('#2e2430'))  # vách
    for _ in range(14):
        im.putpixel((rnd.randrange(16), rnd.randrange(16)), rgb('#3a2e3c'))
    put(4, im)
    im = Image.new('RGBA', (16, 16), rgb('#5a4a4e'))  # chân vách: mặt đá có gờ
    for y in range(10):
        for x in range(16):
            im.putpixel((x, y), rgb('#766a70' if y < 2 else '#62565c' if y < 8 else '#44383e'))
    for x in (3, 9, 13):
        for y in range(2, 8):
            im.putpixel((x, y), rgb('#55484e'))
    put(5, im)
    q = Pix()  # thang lên
    q.px(line(4, 0, 4, 15) | line(11, 0, 11, 15), '#8a5a36')
    for y in (2, 6, 10, 14):
        q.px(line(5, y, 10, y), '#b8864a')
    put(6, q.im)
    for i, speck in ((7, None), (8, '#d9884a'), (9, '#c9d6e2'), (10, '#f0c848')):
        q = Pix()
        q.blob(ellipse(8, 10, 6, 4.6), '#8a8f96')
        if speck:
            q.px([(5, 9), (8, 8), (10, 11), (6, 12), (11, 9)], speck)
            q.px([(6, 8), (9, 10)], '#%02x%02x%02x' % mix(rgb(speck), 0.45)[:3])
        q.outline('#3b2a2e')
        put(i, q.im)
    q = Pix()
    q.blob(ellipse(8, 9.5, 7.2, 6), '#7a7f86')
    q.blob(ellipse(6, 7, 2.4, 1.6), '#9aa0a6')
    q.outline('#3b2a2e')
    put(11, q.im)
    sheet.save(ROOT / 'assets' / 'Custom' / 'mine.png')


if __name__ == '__main__':
    draw_resources()
    draw_crops()
    draw_fruits()
    draw_animals()
    draw_products()
    draw_machines()
    draw_tools()
    draw_npcs()
    print(len(list(OUT.glob('*.png'))), 'icon →', OUT)
