"""Sinh bản đồ làng dạng Tiled JSON → src/maps/village.json (mở được bằng Tiled để sửa tay).

Chạy:  python3 tools/make_village.py
Lớp ô: water, ground (cỏ tự nối viền), road (đường đất), fence.
Lớp vật thể: buildings (nhà: name, roof tint, door), decor (cây, bụi, hoa: type), points (điểm hẹn của dân làng, lối ra).
Sửa trong Tiled rồi lưu đè file này là game dùng luôn — đừng chạy lại script nếu đã sửa tay.
"""
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'maps' / 'village.json'
W, H = 50, 36
AUTOTILE = [36, 25, 33, 22, 3, 14, 0, 11, 35, 24, 34, 23, 2, 13, 1, 12]
FENCE = [12, 8, 13, 9, 0, 4, 1, 5, 15, 11, 14, 10, 3, 7, 2, 6]
GRASS_VARIANTS = [55, 56, 57, 66, 67, 68]
rnd = random.Random(11)

TILESETS = [
    # tên, ảnh (tương đối với file json), rộng, cao
    ('water', '../../assets/Tilesets/Water.png', 64, 16),
    ('grass', '../../assets/Tilesets/Grass.png', 176, 112),
    ('dirt', '../../assets/Tilesets/Tilled_Dirt_Wide.png', 176, 112),
    ('fences', '../../assets/Tilesets/Fences.png', 64, 64),
]
first = {}
gid = 1
ts_json = []
for name, img, w, h in TILESETS:
    first[name] = gid
    n = (w // 16) * (h // 16)
    ts_json.append({'firstgid': gid, 'name': name, 'image': img, 'imagewidth': w, 'imageheight': h, 'tilewidth': 16, 'tileheight': 16,
                    'columns': w // 16, 'tilecount': n, 'margin': 0, 'spacing': 0})
    gid += n

grid = lambda v: [[v] * W for _ in range(H)]
land = grid(False)
for y in range(H):
    for x in range(W):
        edge = min(x, y, W - 1 - x, H - 1 - y)
        land[y][x] = edge >= 2 or (edge == 1 and rnd.random() < 0.4)
# sông phía nam
for y in range(H):
    for x in range(W):
        if y >= 31 - (1 if 8 < x < 20 else 0):
            land[y][x] = False
# lối vào từ nông trại (phía tây)
for y in (16, 17, 18):
    for x in range(0, 3):
        land[y][x] = True
# lối lên chợ huyện (phía đông, mốc 14)
for y in (16, 17, 18):
    for x in range(W - 3, W):
        land[y][x] = True

road = grid(False)
fence = grid(False)


def line(x0, y0, x1, y1, w=2):
    for y in range(min(y0, y1), max(y0, y1) + 1):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for d in range(w):
                yy, xx = (y + d, x) if x0 != x1 else (y, x + d)
                if 0 <= yy < H and 0 <= xx < W:
                    road[yy][xx] = True


line(0, 17, W - 1, 17)         # đường cái đông–tây
line(24, 7, 24, 18)            # lên đình
line(24, 18, 24, 29)           # xuống bến sông

# Nhà: tên, x, y, rộng, (cửa x), màu mái, nhãn
BUILDINGS = [
    ('dinh', 20, 2, 9, 24, 0xd06a4a, 'Đình làng'),
    ('house_tu', 2, 8, 5, 4, 0xc08aa0, 'Nhà bà Tư'),
    ('smith', 30, 8, 5, 32, 0x9aa4ac, 'Lò rèn bác Năm'),
    ('house_lang', 41, 8, 5, 43, 0xa0b070, 'Nhà thầy Lang'),
    ('quan_lan', 12, 20, 7, 15, 0xe0a060, 'Quán chị Lan'),
    ('school', 33, 19, 7, 36, 0x88b0d0, 'Trường làng'),
    ('house_hai', 3, 23, 5, 5, 0xb8a070, 'Nhà anh Hai'),
    ('house_ti', 27, 24, 5, 29, 0xe8b0a0, 'Nhà bé Tí'),
    ('hut_bay', 40, 24, 5, 42, 0x7a9aaa, 'Chòi ông Bảy'),
]
objs_b = []
oid = 1
for name, x, y, w, dx, tint, label in BUILDINGS:
    objs_b.append({'id': oid, 'name': name, 'type': 'house', 'x': x * 16, 'y': y * 16, 'width': w * 16, 'height': 5 * 16, 'rotation': 0, 'visible': True,
                   'properties': [{'name': 'door', 'type': 'int', 'value': dx}, {'name': 'roof', 'type': 'color', 'value': '#ff%06x' % tint},
                                  {'name': 'label', 'type': 'string', 'value': label}]})
    oid += 1
    line(dx, y + 5, dx, 17 if y < 17 else 18, 1)   # lối từ cửa ra đường cái
# Sạp chợ của bà Tư (hình quầy hàng 3×3)
for i, x in enumerate((9, 13)):
    objs_b.append({'id': oid, 'name': f'stall{i}', 'type': 'stall', 'x': x * 16, 'y': 10 * 16, 'width': 48, 'height': 48, 'rotation': 0, 'visible': True, 'properties': []})
    oid += 1
line(10, 13, 10, 16, 1)
line(14, 13, 14, 16, 1)
# Bến sông: cầu tàu gỗ (vẽ bằng code) + giếng + bảng tin
objs_b.append({'id': oid, 'name': 'dock', 'type': 'dock', 'x': 24 * 16, 'y': 30 * 16, 'width': 32, 'height': 48, 'rotation': 0, 'visible': True, 'properties': []}); oid += 1
objs_b.append({'id': oid, 'name': 'well', 'type': 'well', 'x': 19 * 16, 'y': 13 * 16, 'width': 32, 'height': 32, 'rotation': 0, 'visible': True, 'properties': []}); oid += 1
objs_b.append({'id': oid, 'name': 'cart', 'type': 'cart', 'x': 7 * 16, 'y': 19 * 16, 'width': 32, 'height': 32, 'rotation': 0, 'visible': True, 'properties': []}); oid += 1
objs_b.append({'id': oid, 'name': 'board', 'type': 'board', 'x': 27 * 16, 'y': 6 * 16, 'width': 16, 'height': 16, 'rotation': 0, 'visible': True, 'properties': []}); oid += 1

# Vườn thuốc của thầy Lang: rào quanh, có cây thuốc
gx0, gy0, gx1, gy1 = 36, 2, 46, 6
for x in range(gx0, gx1 + 1):
    fence[gy0][x] = fence[gy1][x] = True
for y in range(gy0, gy1 + 1):
    fence[y][gx0] = fence[y][gx1] = True
fence[gy1][41] = fence[gy1][42] = False
line(41, 7, 41, 7, 2)

reserved = grid(False)
def reserve(x0, y0, x1, y1):
    for y in range(max(0, y0), min(H, y1 + 1)):
        for x in range(max(0, x0), min(W, x1 + 1)):
            reserved[y][x] = True
for o in objs_b:
    reserve(o['x'] // 16 - 1, o['y'] // 16 - 1, (o['x'] + o['width']) // 16, (o['y'] + o['height']) // 16 + 1)
reserve(gx0, gy0, gx1, gy1)
for y in range(H):
    for x in range(W):
        if road[y][x]:
            reserve(x - 1, y - 1, x + 1, y + 1)

decor = []
def free(x, y, w, h):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            if not (0 <= xx < W and 0 <= yy < H) or not land[yy][xx] or reserved[yy][xx]:
                return False
    return True
def place(kind, w, h, tries):
    for _ in range(tries):
        x, y = rnd.randrange(1, W - 2), rnd.randrange(1, H - 2)
        if not free(x - 1, y - 1, w + 2, h + 2):
            continue
        decor.append((kind, x, y))
        reserve(x, y, x + w - 1, y + h - 1)
# cây đa đầu làng (điểm hẹn)
decor.append(('banyan', 27, 13))
reserve(27, 13, 28, 14)
place('bigTree', 2, 2, 160)
place('smallTree', 1, 2, 50)
place('bush', 1, 1, 30)
place('berryBush', 1, 1, 12)
for _ in range(60):
    x, y = rnd.randrange(1, W - 1), rnd.randrange(1, H - 1)
    if land[y][x] and not road[y][x] and not reserved[y][x]:
        decor.append(('flower', x, y))
        reserved[y][x] = True
# cây thuốc trong vườn
for y in range(gy0 + 1, gy1):
    for x in range(gx0 + 1, gx1):
        if (x + y) % 2 == 0:
            decor.append(('herb', x, y))

objs_d = []
for kind, x, y in decor:
    objs_d.append({'id': oid, 'name': '', 'type': kind, 'x': x * 16, 'y': y * 16, 'width': 16, 'height': 16, 'point': True, 'rotation': 0, 'visible': True})
    oid += 1

# Điểm hẹn của dân làng (ô đứng được) và lối ra
POINTS = {
    'from_farm': (1, 17), 'exit_farm': (0, 17),
    'market': (11, 14), 'plaza': (22, 16), 'banyan': (27, 16), 'dinh': (24, 8), 'board': (27, 8),
    'smith': (32, 14), 'quan_lan': (15, 26), 'quan_in': (17, 26), 'school': (36, 25), 'schoolyard': (38, 26),
    'dock': (25, 29), 'river_w': (20, 29), 'garden': (41, 5), 'garden_gate': (41, 8), 'well': (20, 16),
    'home_tu': (4, 14), 'home_lang': (43, 14), 'home_hai': (5, 29), 'home_ti': (29, 29), 'home_bay': (42, 29),
    'home_nam': (32, 14), 'home_lan': (15, 26), 'home_mai': (36, 25), 'field': (8, 27),
    'cart': (6, 20), 'exit_east': (W - 1, 17), 'east_gate': (W - 3, 17),
}
# Chỗ đứng của 8 dân làng ngày hội (quanh sân đình / gốc đa)
for i, (x, y) in enumerate(((21, 17), (23, 18), (26, 17), (28, 18), (30, 17), (22, 11), (26, 11), (32, 18))):
    POINTS[f'fest_{i}'] = (x, y)
objs_p = []
for name, (x, y) in POINTS.items():
    objs_p.append({'id': oid, 'name': name, 'type': 'point', 'x': x * 16 + 8, 'y': y * 16 + 8, 'width': 0, 'height': 0, 'point': True, 'rotation': 0, 'visible': True})
    oid += 1
for name, (x, y) in POINTS.items():
    if not land[y][x]:
        raise SystemExit(f'điểm {name} ở dưới nước')


def mask(g, x, y):
    at = lambda xx, yy: 0 <= xx < W and 0 <= yy < H and g[yy][xx]
    return (1 if at(x, y - 1) else 0) | (2 if at(x + 1, y) else 0) | (4 if at(x, y + 1) else 0) | (8 if at(x - 1, y) else 0)


water_l = [first['water']] * (W * H)
ground_l, road_l, fence_l = [0] * (W * H), [0] * (W * H), [0] * (W * H)
for y in range(H):
    for x in range(W):
        i = y * W + x
        if land[y][x]:
            m = mask(land, x, y)
            idx = rnd.choice(GRASS_VARIANTS) if m == 15 and rnd.random() < 0.12 else AUTOTILE[m]
            ground_l[i] = first['grass'] + idx
        if road[y][x] and land[y][x]:
            road_l[i] = first['dirt'] + AUTOTILE[mask(road, x, y)]
        if fence[y][x]:
            fence_l[i] = first['fences'] + FENCE[mask(fence, x, y)]


def tile_layer(lid, name, data):
    return {'id': lid, 'name': name, 'type': 'tilelayer', 'x': 0, 'y': 0, 'width': W, 'height': H, 'opacity': 1, 'visible': True, 'data': data}


def obj_layer(lid, name, objs):
    return {'id': lid, 'name': name, 'type': 'objectgroup', 'draworder': 'topdown', 'x': 0, 'y': 0, 'opacity': 1, 'visible': True, 'objects': objs}


tmj = {
    'type': 'map', 'version': '1.10', 'tiledversion': '1.10.2', 'orientation': 'orthogonal', 'renderorder': 'right-down',
    'width': W, 'height': H, 'tilewidth': 16, 'tileheight': 16, 'infinite': False, 'nextlayerid': 8, 'nextobjectid': oid,
    'tilesets': ts_json,
    'layers': [tile_layer(1, 'water', water_l), tile_layer(2, 'ground', ground_l), tile_layer(3, 'road', road_l), tile_layer(4, 'fence', fence_l),
               obj_layer(5, 'buildings', objs_b), obj_layer(6, 'decor', objs_d), obj_layer(7, 'points', objs_p)],
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(tmj, ensure_ascii=False, separators=(',', ':')))
print('→', OUT, f'{len(decor)} vật trang trí, {len(POINTS)} điểm')
