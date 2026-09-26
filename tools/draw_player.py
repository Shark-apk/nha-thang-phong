"""Lớp phụ kiện cho nhân vật người chơi (mốc 12): nón và đồ trên mặt, vẽ khớp từng khung của nhân vật gốc.

Chạy:  python3 tools/draw_player.py
→ assets/Custom/player/<id>_char.png (192×192, khớp Basic Charakter Spritesheet)
  và <id>_actions.png (96×576, khớp Basic Charakter Actions) — chỉ có phần phụ kiện, còn lại trong suốt.
Game ghép: nhân vật gốc (đổi màu lông/áo lúc chạy) + lớp nón + lớp mặt → một spritesheet.
Thêm pets.png: thú cưng 16×16 (chó, mèo, vịt, cua), mỗi con 4 khung (đứng 2, đi 2), nhìn sang phải.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / 'assets' / 'Characters'
OUT = ROOT / 'assets' / 'Custom' / 'player'
OUT.mkdir(parents=True, exist_ok=True)

BODY = {(243, 242, 192), (243, 216, 197)}
OUTLINE = (92, 78, 146)


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def head_box(frame):
    """Khung bao phần đầu: điểm cao nhất của màu thân + bề ngang của 6 hàng trên cùng."""
    px = frame.load()
    pts = [(x, y) for y in range(frame.height) for x in range(frame.width) if px[x, y][3] and px[x, y][:3] in BODY]
    if not pts:
        return None
    top = min(y for _, y in pts)
    row = [x for x, y in pts if y <= top + 6]
    return min(row), top, max(row)


def draw_hat(o, kind, x0, top, x1, d):
    """Vẽ nón `kind` lên ảnh `o` (đã cùng cỡ khung), căn theo đầu (x0..x1, top), hướng d (0 xuống, 1 lên, 2 trái, 3 phải)."""
    px = o.load()
    cx = (x0 + x1) / 2
    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < o.width and 0 <= y < o.height:
            px[x, y] = rgb(c) if isinstance(c, str) else c
    if kind == 'straw':          # mũ rơm vành rộng, dây đỏ
        for x in range(int(x0) - 3, int(x1) + 4):
            put(x, top - 1, '#c8a050')
            put(x, top, '#e8c878')
        for x in range(int(x0) + 1, int(x1)):
            for y in range(top - 5, top - 1):
                put(x, y, '#e8c878' if y > top - 5 else '#c8a050')
        for x in range(int(x0) + 1, int(x1)):
            put(x, top - 2, '#c7474f')
        for x in range(int(x0) - 3, int(x1) + 4):
            put(x, top + 1, OUTLINE)
    elif kind == 'non_la':       # nón lá chóp nhọn
        for i in range(7):
            half = 0.8 + i * 1.6
            for x in range(int(cx - half), int(cx + half) + 1):
                put(x, top - 6 + i, '#b8963e' if i == 6 else '#e2c26a')
        put(cx, top - 7, '#b8963e')
    elif kind == 'beanie':       # mũ len xanh có quả bông
        for x in range(int(x0), int(x1) + 1):
            for y in range(top - 4, top + 2):
                put(x, y, '#3f6f98' if y == top + 1 else '#5a8eaa')
        put(cx, top - 5, '#f3f4e7'); put(cx - 1, top - 5, '#f3f4e7'); put(cx, top - 6, '#f3f4e7')
    elif kind == 'cap':          # mũ lưỡi trai đỏ
        for x in range(int(x0), int(x1) + 1):
            for y in range(top - 3, top + 1):
                put(x, y, '#d8382e')
        if d == 0:
            for x in range(int(x0) + 1, int(x1)):
                put(x, top + 1, '#a82820')
        elif d in (2, 3):
            s = -1 if d == 2 else 1
            for i in range(4):
                put((x0 if d == 2 else x1) + s * (i + 1), top + 1, '#a82820')
    elif kind == 'chef':         # mũ đầu bếp trắng
        for x in range(int(x0) + 1, int(x1)):
            for y in range(top - 8, top + 1):
                put(x, y, '#f6f6f2' if y > top - 8 else '#dcdcd4')
        for x in range(int(x0) - 1, int(x1) + 2):
            for y in range(top - 10, top - 6):
                put(x, y, '#f6f6f2')
    elif kind == 'crown':        # vương miện vàng
        for x in range(int(x0) + 1, int(x1)):
            put(x, top, '#d8a820')
            put(x, top - 1, '#f0c040')
        for x in (x0 + 1, cx, x1 - 1):
            put(x, top - 2, '#f0c040'); put(x, top - 3, '#f0c040')
        put(cx, top - 1, '#d8382e')
    elif kind == 'band':         # băng đô đỏ
        for x in range(int(x0), int(x1) + 1):
            put(x, top + 2, '#c7474f')
            put(x, top + 3, '#c7474f')
        if d == 1:
            put(cx, top + 4, '#c7474f'); put(cx + 1, top + 5, '#c7474f')
    elif kind == 'flower':       # hoa cài tai
        if d != 1:
            fx = x1 - 1 if d != 2 else x0 + 1
            for (dx, dy) in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                put(fx + dx, top + 1 + dy, '#f2a6b8')
            put(fx, top + 1, '#f0c850')
    elif kind == 'bow':          # nơ xanh
        if d != 1:
            fx = x1 - 2 if d != 2 else x0 + 2
            for (dx, dy) in ((-2, 0), (-1, 0), (-2, -1), (-2, 1), (1, 0), (2, 0), (2, -1), (2, 1)):
                put(fx + dx, top + dy, '#3f7fbf')
            put(fx, top, '#2c5a8a')


def draw_face(o, kind, x0, top, x1, d, frame):
    """Đồ trên mặt, chỉ vẽ khi nhìn thấy mặt (xuống / trái / phải)."""
    px = o.load()
    fp = frame.load()
    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < o.width and 0 <= y < o.height:
            px[x, y] = rgb(c) if isinstance(c, str) else c
    if d == 1:
        return
    # mắt = điểm màu viền nằm trong vùng mặt, cao hơn giữa đầu
    eyes = [(x, y) for y in range(top + 4, top + 11) for x in range(int(x0) + 1, int(x1))
            if fp[x, y][3] and fp[x, y][:3] == OUTLINE and fp[x - 1, y][:3] in BODY and fp[x + 1, y][:3] in BODY]
    ey = min((y for _, y in eyes), default=top + 6)
    xs = sorted({x for x, y in eyes if y == ey}) or [int(x0 + 3), int(x1 - 3)]
    if kind in ('glasses', 'sunglasses'):
        col = '#3b2a2e' if kind == 'glasses' else '#2c2230'
        for ex in xs[:2] if d == 0 else xs[:1]:
            for (dx, dy) in ((-1, -1), (0, -1), (1, -1), (-1, 1), (0, 1), (1, 1), (-1, 0), (1, 0)):
                put(ex + dx, ey + dy, col)
            if kind == 'sunglasses':
                put(ex, ey, col)
        if d == 0 and len(xs) >= 2:
            for x in range(xs[0] + 2, xs[1] - 1):
                put(x, ey - 1, col)
    elif kind == 'mustache':
        mx = (xs[0] + xs[-1]) / 2 if d == 0 else (xs[0] + (2 if d == 3 else -2))
        for dx in (-2, -1, 0, 1, 2):
            put(mx + dx, ey + 3, '#3b2a2e')
        put(mx - 3, ey + 2, '#3b2a2e'); put(mx + 3, ey + 2, '#3b2a2e')
    elif kind == 'blush':
        for ex in xs[:2]:
            put(ex - (1 if ex == xs[0] else -1), ey + 2, '#f08a9a')
            put(ex, ey + 2, '#f08a9a')


HATS = ['straw', 'non_la', 'beanie', 'cap', 'chef', 'crown', 'band', 'flower', 'bow']
FACES = ['glasses', 'sunglasses', 'mustache', 'blush']


def overlay(src_file, cols, rows, fn):
    src = Image.open(PACK / src_file).convert('RGBA')
    out = Image.new('RGBA', src.size, (0, 0, 0, 0))
    for r in range(rows):
        for c in range(cols):
            fr = src.crop((c * 48, r * 48, c * 48 + 48, r * 48 + 48))
            hb = head_box(fr)
            if not hb:
                continue
            o = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
            fn(o, hb, r % 4, fr)
            out.alpha_composite(o, (c * 48, r * 48))
    return out


def pets():
    """4 thú cưng × 4 khung 16×16, nhìn sang phải."""
    sheet = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    specs = [('#c8905a', '#8a5a36', 'dog'), ('#e8e0d0', '#9a8a7a', 'cat'), ('#f6f2e0', '#f0a030', 'duck'), ('#d8503a', '#8a2a20', 'crab')]
    for row, (main, dark, kind) in enumerate(specs):
        for f in range(4):
            im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
            px = im.load()
            bob = 1 if f in (1, 3) else 0
            step = f >= 2
            def put(x, y, c):
                if 0 <= x < 16 and 0 <= y < 16:
                    px[x, y] = rgb(c)
            if kind in ('dog', 'cat'):
                for x in range(4, 12):
                    for y in range(8 + bob, 12 + bob):
                        put(x, y, main)
                for x in range(9, 14):
                    for y in range(4 + bob, 9 + bob):
                        put(x, y, main)
                if kind == 'dog':
                    put(9, 4 + bob, dark); put(9, 5 + bob, dark); put(13, 7 + bob, '#3b2a2e')
                    put(3, 8 + bob, main); put(2, 7 + bob, main)
                else:
                    put(9, 3 + bob, main); put(13, 3 + bob, main); put(1, 9 + bob, main); put(2, 8 + bob, main); put(3, 8 + bob, main)
                put(12, 6 + bob, '#3b2a2e')
                legs = (4, 6, 9, 11) if not step else (5, 7, 8, 10)
                for lx in legs:
                    put(lx, 12 + bob, dark); put(lx, 13, dark)
            elif kind == 'duck':
                for x in range(4, 11):
                    for y in range(8 + bob, 12 + bob):
                        put(x, y, main)
                for x in range(8, 12):
                    for y in range(4 + bob, 8 + bob):
                        put(x, y, main)
                put(12, 6 + bob, dark); put(13, 6 + bob, dark); put(10, 5 + bob, '#3b2a2e')
                put(6 if not step else 7, 12 + bob, dark); put(8 if not step else 7, 13, dark)
            else:  # cua
                for x in range(4, 12):
                    for y in range(8 + bob, 12 + bob):
                        put(x, y, main)
                for x in (2, 13):
                    put(x, 6 + bob, main); put(x, 7 + bob, main)
                put(3, 8 + bob, main); put(12, 8 + bob, main)
                put(6, 7 + bob, '#3b2a2e'); put(9, 7 + bob, '#3b2a2e')
                for i, lx in enumerate((4, 6, 9, 11)):
                    put(lx + (1 if step and i % 2 else 0), 12 + bob, dark)
            # viền
            src = im.copy()
            sp = src.load()
            for y in range(16):
                for x in range(16):
                    if sp[x, y][3]:
                        continue
                    if any(0 <= x + dx < 16 and 0 <= y + dy < 16 and sp[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                        px[x, y] = rgb('#3b2a2e')
            sheet.alpha_composite(im, (f * 16, row * 16))
    sheet.save(OUT / 'pets.png')


if __name__ == '__main__':
    for h in HATS:
        overlay('Basic Charakter Spritesheet.png', 4, 4, lambda o, hb, d, fr, h=h: draw_hat(o, h, hb[0], hb[1], hb[2], d)).save(OUT / f'hat_{h}_char.png')
        overlay('Basic Charakter Actions.png', 2, 12, lambda o, hb, d, fr, h=h: draw_hat(o, h, hb[0], hb[1], hb[2], d)).save(OUT / f'hat_{h}_actions.png')
    for f in FACES:
        overlay('Basic Charakter Spritesheet.png', 4, 4, lambda o, hb, d, fr, f=f: draw_face(o, f, hb[0], hb[1], hb[2], d, fr)).save(OUT / f'face_{f}_char.png')
        overlay('Basic Charakter Actions.png', 2, 12, lambda o, hb, d, fr, f=f: draw_face(o, f, hb[0], hb[1], hb[2], d, fr)).save(OUT / f'face_{f}_actions.png')
    pets()
    print('→', OUT)
