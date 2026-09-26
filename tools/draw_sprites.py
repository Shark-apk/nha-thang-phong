"""Vẽ thêm sprite theo phong cách Sprout Lands (giấy phép cho phép tự vẽ thêm cùng phong cách).

Chạy:  python3 tools/draw_sprites.py
Kết quả: assets/Custom/crops.png (4 hàng × 6 ô 16×16: túi hạt, 4 giai đoạn, nông sản),
         assets/Custom/shop.png (48×48), assets/Custom/well.png (32×32)
Túi hạt dựng lại từ túi hạt gốc (thay hình in trên túi).
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
OUT = ASSETS / 'Custom'
OUT.mkdir(exist_ok=True)

PAL = {
    '.': None,
    'S': '#dcb98a', 'T': '#e8cfa6',                      # ụ đất
    'g': '#c0d470', 'G': '#a4c263', 'h': '#8db15d', 'H': '#78a158', 'k': '#67835c',  # xanh lá
    'O': '#d98a4e', 'o': '#f0b474', 'q': '#b0643c',       # cà rốt
    'R': '#d46a62', 'r': '#f09a88', 'Q': '#a24d55',       # đỏ (cà chua, dâu)
    'P': '#e3994f', 'p': '#f2c683', 'j': '#b8703f',       # bí ngô
    'u': '#d2e077',                                       # quả xanh chưa chín
    'y': '#f3f2c0', 'e': '#eae178',                       # hoa trắng, nhụy vàng
    'W': '#f3f4e7',                                       # viền trắng của nông sản
}


def grid(rows, start=0):
    """Chuỗi ASCII → ảnh 16×16. `start` = dòng bắt đầu vẽ."""
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row.ljust(16, '.')[:16]):
            c = PAL[ch]
            if c:
                im.putpixel((x, start + y), Image.new('RGB', (1, 1), c).getpixel((0, 0)) + (255,))
    return im


SPROUT = grid([
    '......g..g......',
    '.....gGgGGg.....',
    '......GhhG......',
    '.......kk.......',
    '....SSSkkSSS....',
    '.....SSSSSS.....',
], 9)

CROPS = {
    'carrot': [
        SPROUT,
        grid([
            '.......g........',
            '.....g.G.g......',
            '.....GgGgG......',
            '......GhG.......',
            '....g.GhG.g.....',
            '....GGhhhGG.....',
            '.....HhkhH......',
            '.......k........',
            '....SSSOSSSS....',
            '.....SSSSSS.....',
        ], 5),
        grid([
            '......g..g......',
            '.....gG.gG......',
            '....g.GgG..g....',
            '....GgGhGgGG....',
            '.....GhhhhG.....',
            '...g.GhHhG.g....',
            '...GGhhHhhGG....',
            '....HhhHhhH.....',
            '.....HHkHH......',
            '......kkk.......',
            '......oOo.......',
            '....SSOOOSSS....',
            '.....SSSSSS.....',
        ], 2),
        grid([
            '.....g....g.....',
            '....gG.g.gG.....',
            '...g.GgGgG..g...',
            '...GgGhGhGgGG...',
            '....GhhhhhhG....',
            '..g.GhHhHhG.g...',
            '..GGhhHhHhhGG...',
            '...HhhHkHhhH....',
            '....HHkkkHH.....',
            '......kkk.......',
            '.....ooOOo......',
            '.....oOOOO......',
            '.....OOOOq......',
            '...SSSOOqqSSS...',
            '....SSSSSSSS....',
        ], 0),
        grid([
            '..........W.W...',
            '.........WgWgW..',
            '........WGgGgW..',
            '........WGhGW...',
            '.......WWOhW....',
            '......WoOOW.....',
            '.....WoOOqW.....',
            '....WoOOqW......',
            '....WOOqW.......',
            '...WoOqW........',
            '...WOqW.........',
            '..WOqW..........',
            '..WqW...........',
            '...W............',
        ], 1),
    ],
    'tomato': [
        SPROUT,
        grid([
            '......g.g.......',
            '.....gGgGg......',
            '....gGhGhGg.....',
            '.....GhhhG......',
            '...g.HhkhH.g....',
            '...GGHhkhHGG....',
            '.....HHkHH......',
            '....SSSkSSSS....',
            '.....SSSSSS.....',
        ], 6),
        grid([
            '......gg........',
            '.....gGGg.......',
            '....gGhhGg......',
            '...gGhGGhGg.....',
            '...GhuuGGhG.....',
            '..gGhuuhGhGg....',
            '..GhhGGhuuhG....',
            '...HhhGhuuH.....',
            '...gHhhkHhHg....',
            '..GGhHkkkHGG....',
            '....HHkkkHH.....',
            '...SSSSkSSSS....',
            '....SSSSSSSS....',
        ], 2),
        grid([
            '......gg........',
            '.....gGGg.......',
            '....gGhhGg......',
            '...gGrRGhGg.....',
            '...GRRRQGhG.....',
            '..gGQRQhGrRg....',
            '..GhhGGhRRRQ....',
            '...HhhGhQRQ.....',
            '..rRHhhkHhHg....',
            '..RRQHkkkHGG....',
            '..QQHHkkkHH.....',
            '...SSSSkSSSS....',
            '....SSSSSSSS....',
        ], 2),
        grid([
            '.......WW.......',
            '......WkkW......',
            '....WWgGGgWW....',
            '...WRRGkkGRRW...',
            '..WRrrRRRRRRQW..',
            '..WRrRRRRRRRQW..',
            '..WRRRRRRRRRQW..',
            '..WRRRRRRRRQQW..',
            '..WQRRRRRRQQQW..',
            '...WQQRRRQQQW...',
            '....WWQQQQWW....',
            '......WWWW......',
        ], 2),
    ],
    'pumpkin': [
        SPROUT,
        grid([
            '....gG....Gg....',
            '...gGhG..GhGg...',
            '...GhhG..GhhG...',
            '....HhGkkGhH....',
            '......kkkk......',
            '......kk........',
            '....SSSSSSSS....',
            '.....SSSSSS.....',
        ], 7),
        grid([
            '...gG......Gg...',
            '..gGhG....GhGg..',
            '..GhhG.kk.GhhG..',
            '...HhG.k..GhH...',
            '.....kk.........',
            '.....uuuu.......',
            '....uGuuGu......',
            '....uGuuGu......',
            '.....uuuu.......',
            '...SSSSSSSSSS...',
            '....SSSSSSSS....',
        ], 4),
        grid([
            '..gG........Gg..',
            '.gGhG......GhGg.',
            '.GhhG..kk..GhhG.',
            '..HhG..k...GhH..',
            '......kk........',
            '....pPPPPPPp....',
            '...pPPjPPjPPp...',
            '..pPPPjPPjPPPp..',
            '..PPPPjPPjPPPP..',
            '..PPPPjPPjPPPP..',
            '..jPPPjPPjPPPj..',
            '..SjjPPPPPPjjS..',
            '...SSjjjjjjSS...',
        ], 2),
        grid([
            '.......WW.......',
            '......WkkW......',
            '....WWWkWWWW....',
            '...WpPPjPPjPW...',
            '..WpPPPjPPjPPW..',
            '..WPPPPjPPjPPW..',
            '..WPPPPjPPjPPW..',
            '..WPPPPjPPjPPW..',
            '..WjPPPjPPjPjW..',
            '...WjjPPPPjjW...',
            '....WWjjjjWW....',
            '......WWWW......',
        ], 2),
    ],
    'strawberry': [
        SPROUT,
        grid([
            '.....g..g.......',
            '....gGggGg......',
            '...gGhGGhGg.....',
            '....GhhkhG......',
            '.....HkkH.......',
            '....SSSkSSSS....',
            '.....SSSSSS.....',
        ], 8),
        grid([
            '......yyy.......',
            '...yyy.ye.......',
            '...yey.yyy......',
            '...yyyggGg......',
            '...gGhGGhGgyyy..',
            '..gGhhGhhhGyey..',
            '...HhhkhhHgyyy..',
            '...SSSSkSSSS....',
            '....SSSSSSSS....',
        ], 6),
        grid([
            '....g..gg.......',
            '...gGggGGg......',
            '..gGhGRRhGg.....',
            '..GhhRyRRhG.RR..',
            '.RRGhRRyRGhRyRR.',
            '.RyRHQRRQHhRRyR.',
            '.QRRQSSkQSSQRRQ.',
            '..QQ.SSSSSS.QQ..',
        ], 7),
        grid([
            '......WWWW......',
            '.....WgGGgW.....',
            '....WGkGGkGW....',
            '...WRRGkkGRRW...',
            '...WRyRRRRyRW...',
            '...WRRRyRRRRW...',
            '....WRyRRRyW....',
            '....WRRRyRRW....',
            '.....WRRRRW.....',
            '......WQQW......',
            '.......WW.......',
        ], 2),
    ],
}

# Hình in nhỏ trên túi hạt (6×6)
BAG_ICON = {
    'carrot': ['...g.g', '...gg.', '..oO..', '.oO...', '.Oq...', 'q.....'],
    'tomato': ['..kk..', '.RkkR.', 'RrRRRQ', 'RRRRRQ', '.RRRQ.', '..QQ..'],
    'pumpkin': ['..k...', '.pPjP.', 'pPjPjP', 'PPjPjP', 'jPjPjj', '.jjjj.'],
    'strawberry': ['.gGg..', 'RRkRR.', 'RyRRy.', '.RRyR.', '.RyR..', '..Q...'],
}


def seed_bag(name):
    plants = Image.open(ASSETS / 'Objects/Basic_Plants.png').convert('RGBA')
    wheat_bag = plants.crop((0, 0, 16, 16))
    beet_bag = plants.crop((0, 16, 16, 32))
    bag = wheat_bag.copy()
    # Pixel khác nhau giữa 2 túi gốc = hình in → tô lại bằng màu giấy của túi
    same = [wheat_bag.getpixel((x, y)) for y in range(16) for x in range(16) if wheat_bag.getpixel((x, y)) == beet_bag.getpixel((x, y))]
    paper = max(set(p for p in same if p[3] == 255), key=same.count)
    for y in range(16):
        for x in range(16):
            if wheat_bag.getpixel((x, y)) != beet_bag.getpixel((x, y)):
                bag.putpixel((x, y), paper)
    icon = grid(BAG_ICON[name])
    bag.alpha_composite(icon.crop((0, 0, 6, 6)), (5, 6))
    return bag


def build_crops():
    sheet = Image.new('RGBA', (96, 16 * len(CROPS)), (0, 0, 0, 0))
    for row, (name, frames) in enumerate(CROPS.items()):
        sheet.alpha_composite(seed_bag(name), (0, row * 16))
        for i, f in enumerate(frames):
            sheet.alpha_composite(f, ((i + 1) * 16, row * 16))
    sheet.save(OUT / 'crops.png')
    return sheet


def hexc(c):
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def build_shop():
    """Quầy hàng 48×48: mái bạt sọc đỏ–kem, quầy gỗ, túi hạt bày trên quầy."""
    im = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    dark, wood, woodL, woodD = hexc('#795e53'), hexc('#b68962'), hexc('#dcb98a'), hexc('#957a4b')
    red, redD, cream = hexc('#d46a62'), hexc('#a24d55'), hexc('#f3f4e7')
    # cột
    for x in (5, 40):
        d.rectangle((x, 14, x + 3, 44), fill=wood, outline=dark)
        d.line((x + 1, 15, x + 1, 43), fill=woodL)
    # mái bạt
    d.rectangle((1, 4, 46, 15), fill=cream, outline=dark)
    for i, x in enumerate(range(2, 46, 6)):
        d.rectangle((x, 5, x + 2, 14), fill=red)
    # mép bạt lượn sóng
    for i, x in enumerate(range(1, 46, 6)):
        d.pieslice((x, 11, x + 6, 19), 0, 180, fill=red if i % 2 == 0 else cream, outline=dark)
    d.line((1, 4, 46, 4), fill=redD)
    d.rectangle((3, 0, 44, 4), fill=woodD, outline=dark)
    # quầy
    d.rectangle((2, 30, 45, 45), fill=wood, outline=dark)
    d.rectangle((2, 30, 45, 33), fill=woodL, outline=dark)
    for x in range(8, 44, 8):
        d.line((x, 34, x, 44), fill=woodD)
    # túi hạt trên quầy
    crops = Image.open(OUT / 'crops.png')
    plants = Image.open(ASSETS / 'Objects/Basic_Plants.png').convert('RGBA')
    bags = [plants.crop((0, 0, 16, 16)), crops.crop((0, 0, 16, 16)), crops.crop((0, 32, 16, 48))]
    for i, b in enumerate(bags):
        im.alpha_composite(b.resize((12, 12), Image.NEAREST), (6 + i * 13, 19))
    # bảng hiệu nhỏ
    d.rectangle((17, 38, 30, 44), fill=woodL, outline=dark)
    d.line((20, 41, 27, 41), fill=dark)
    im.save(OUT / 'shop.png')
    return im


def build_well():
    """Giếng 32×32: thành đá tròn, nước, mái gỗ nhỏ, xô."""
    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    dark, stone, stoneL, stoneD = hexc('#566560'), hexc('#9da89a'), hexc('#c1c8b9'), hexc('#6b7470')
    water, waterL = hexc('#8cbfc2'), hexc('#cbe0de')
    wood, woodD, roof, roofD = hexc('#b68962'), hexc('#795e53'), hexc('#aa7959'), hexc('#90625d')
    # thành giếng
    d.ellipse((3, 16, 28, 31), fill=stone, outline=dark)
    d.ellipse((6, 17, 25, 25), fill=water, outline=stoneD)
    d.line((10, 20, 14, 20), fill=waterL)
    for x, y in ((5, 26), (11, 28), (18, 28), (24, 26)):
        d.rectangle((x, y, x + 3, y + 1), fill=stoneL)
    # cột + mái
    for x in (5, 25):
        d.rectangle((x, 6, x + 1, 22), fill=wood, outline=woodD)
    d.polygon([(2, 8), (16, 0), (29, 8)], fill=roof, outline=roofD)
    d.line((5, 7, 16, 1), fill=hexc('#dcb98a'))
    d.line((6, 12, 25, 12), fill=woodD)
    # dây + xô
    d.line((15, 12, 15, 16), fill=woodD)
    d.rectangle((13, 16, 18, 20), fill=wood, outline=woodD)
    im.save(OUT / 'well.png')
    return im


def build_barn():
    """Chuồng bò 80×64: gỗ đỏ viền trắng, mái xám, cửa đôi chữ X."""
    im = Image.new('RGBA', (80, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    dark, red, redD, white = hexc('#5e3a3a'), hexc('#b8554a'), hexc('#8e3d36'), hexc('#f3f4e7')
    roof, roofD = hexc('#8a8f96'), hexc('#646a72')
    d.polygon([(2, 26), (40, 4), (78, 26)], fill=roof, outline=dark)
    for y in range(10, 26, 4):
        d.line((40 - (y - 4) * 38 // 22, y, 40 + (y - 4) * 38 // 22, y), fill=roofD)
    d.rectangle((6, 24, 73, 62), fill=red, outline=dark)
    for x in range(12, 72, 8):
        d.line((x, 26, x, 61), fill=redD)
    d.rectangle((28, 36, 51, 62), fill=redD, outline=white, width=2)
    d.line((28, 36, 51, 62), fill=white, width=2)
    d.line((51, 36, 28, 62), fill=white, width=2)
    d.line((39, 36, 39, 62), fill=white)
    d.rectangle((34, 14, 45, 22), fill=white, outline=dark)
    d.rectangle((36, 16, 43, 20), fill=hexc('#3b2a2e'))
    im.save(OUT / 'barn.png')


def build_shed():
    """Chuồng trâu 64×48: nhà tranh vách đất."""
    im = Image.new('RGBA', (64, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    dark, straw, strawD, strawL = hexc('#6b4f36'), hexc('#d9b45a'), hexc('#b08a3a'), hexc('#f0d58a')
    mud, mudD, wood = hexc('#b98a5e'), hexc('#8e6644'), hexc('#795e53')
    d.rectangle((6, 20, 57, 46), fill=mud, outline=dark)
    for x, y in ((12, 28), (40, 32), (22, 38), (50, 24)):
        d.rectangle((x, y, x + 4, y + 1), fill=mudD)
    d.rectangle((24, 28, 39, 46), fill=hexc('#3b2a2e'), outline=wood)
    for x in (6, 57):
        d.line((x, 20, x, 46), fill=wood, width=2)
    d.polygon([(0, 24), (32, 2), (63, 24), (56, 26), (8, 26)], fill=straw, outline=dark)
    for i in range(0, 64, 3):
        d.line((i, 25, 32, 4), fill=strawD if i % 2 else strawL)
    d.line((0, 24, 63, 24), fill=strawD, width=2)
    im.save(OUT / 'shed.png')


def build_trough():
    """Máng ăn 48×16: frame 0 trống, frame 1 có cỏ khô (sheet 96×16)."""
    im = Image.new('RGBA', (96, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    dark, wood, woodL = hexc('#5e4032'), hexc('#a8744a'), hexc('#c99466')
    hay, hayD = hexc('#e2c46a'), hexc('#b89a44')
    for i in range(2):
        ox = i * 48
        d.rectangle((ox + 1, 5, ox + 46, 14), fill=wood, outline=dark)
        d.line((ox + 2, 6, ox + 45, 6), fill=woodL)
        d.rectangle((ox + 4, 8, ox + 43, 11), fill=hexc('#6e4a36'))
        if i:
            for x in range(ox + 4, ox + 44, 3):
                d.line((x, 10, x + 2, 3), fill=hay if (x // 3) % 2 else hayD)
    im.save(OUT / 'trough.png')


if __name__ == '__main__':
    build_crops()
    build_shop()
    build_well()
    build_barn()
    build_shed()
    build_trough()
    print('Đã vẽ:', ', '.join(p.name for p in OUT.iterdir()))
