"""8 dân làng từ nhân vật gốc Sprout Lands: đổi màu lông/áo + thêm phụ kiện (nón lá, búi tóc, khăn…).

Chạy:  python3 tools/draw_npcs.py  → assets/Custom/npcs.png (192×1536: 8 bảng 4×4 khung 48×48 xếp dọc, cùng thứ tự NPC_ORDER)
Giấy phép bộ hình cho phép chỉnh sửa để dùng trong game; không phát tán lại bộ gốc.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'Characters' / 'Basic Charakter Spritesheet.png'
OUT = ROOT / 'assets' / 'Custom' / 'npcs.png'

BODY = (243, 242, 192)
BODY2 = (243, 216, 197)
PANTS = (118, 109, 170)
OUTLINE = (92, 78, 146)


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c)


# id, màu lông, màu áo, phụ kiện
NPCS = [
    ('ba_tu', '#e6ddd6', '#8a5ab0', 'bun'),
    ('bac_nam', '#d9a07a', '#6e7a86', 'band_dark'),
    ('chi_lan', '#f6e0c8', '#c7474f', 'flower'),
    ('ong_bay', '#cf946c', '#5a8eaa', 'non_la'),
    ('co_mai', '#f7ecd8', '#5a8eaa', 'bow'),
    ('be_ti', '#f6d6a8', '#f0c040', 'headband'),
    ('anh_hai', '#d9a07a', '#78a158', 'non_la'),
    ('thay_lang', '#e8c8a0', '#b8864a', 'bun_grey'),
]


def recolor(frame, body, shirt):
    out = frame.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            c = (r, g, b)
            if c == BODY:
                px[x, y] = body + (a,)
            elif c == BODY2:
                px[x, y] = shade(body, 0.93) + (a,)
            elif c == PANTS:
                px[x, y] = shirt + (a,)
    return out


def accessory(frame, kind, row):
    """Vẽ phụ kiện lên đầu, căn theo khung bao của nhân vật trong khung hình này."""
    box = frame.getbbox()
    if not box:
        return frame
    x0, y0, x1, _ = box
    cx = (x0 + x1 - 1) / 2
    px = frame.load()
    put = lambda x, y, c: 0 <= x < frame.width and 0 <= y < frame.height and px.__setitem__((int(x), int(y)), c + (255,))
    back = row == 1   # quay lưng
    side = row >= 2
    if kind == 'non_la':
        hat, dark = rgb('#e2c26a'), rgb('#b8963e')
        for i in range(5):
            half = 1 + i * 1.7
            for x in range(int(cx - half), int(cx + half) + 1):
                put(x, y0 - 3 + i, dark if i == 4 else hat)
        put(cx, y0 - 4, dark)
    elif kind in ('bun', 'bun_grey'):
        c = rgb('#d8d2cc') if kind == 'bun' else rgb('#9a9690')
        bx = cx + (3 if side and row == 3 else -3 if side else 0)
        for dy in range(-2, 1):
            for dx in range(-2, 3):
                if abs(dx) + abs(dy) <= 2:
                    put(bx + dx, y0 - 1 + dy, c)
        put(bx - 2, y0 - 1, OUTLINE); put(bx + 2, y0 - 1, OUTLINE)
    elif kind in ('headband', 'band_dark'):
        c = rgb('#c7474f') if kind == 'headband' else rgb('#3b2a2e')
        for x in range(x0 + 1, x1 - 1):
            if px[x, y0 + 3][3]:
                put(x, y0 + 3, c)
    elif kind == 'flower' and not back:
        fx = cx + (4 if row != 2 else -4)
        for (dx, dy) in ((0, -1), (-1, 0), (1, 0), (0, 1)):
            put(fx + dx, y0 + 1 + dy, rgb('#f2a6b8'))
        put(fx, y0 + 1, rgb('#f0c850'))
    elif kind == 'bow' and not back:
        fx = cx + (4 if row != 2 else -4)
        for (dx, dy) in ((-2, 0), (-1, 0), (-2, -1), (-2, 1), (1, 0), (2, 0), (2, -1), (2, 1)):
            put(fx + dx, y0 + 1 + dy, rgb('#3f7fbf'))
        put(fx, y0 + 1, rgb('#2c5a8a'))
    return frame


def main():
    src = Image.open(SRC).convert('RGBA')
    sheet = Image.new('RGBA', (192, 192 * len(NPCS)), (0, 0, 0, 0))
    for n, (_id, body, shirt, acc) in enumerate(NPCS):
        for i in range(16):
            col, row = i % 4, i // 4
            fr = src.crop((col * 48, row * 48, col * 48 + 48, row * 48 + 48))
            fr = recolor(fr, rgb(body), rgb(shirt))
            fr = accessory(fr, acc, row)
            sheet.alpha_composite(fr, (col * 48, n * 192 + row * 48))
    sheet.save(OUT)
    print('→', OUT, sheet.size)


if __name__ == '__main__':
    main()
