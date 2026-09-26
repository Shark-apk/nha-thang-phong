"""Sinh bản đồ chợ huyện dạng Tiled JSON → src/maps/town.json (mở được bằng Tiled để sửa tay).

Chạy:  python3 tools/make_town.py
Cùng cấu trúc với make_village.py: lớp ô water / ground / road / fence; lớp vật thể buildings / decor / points.
Nhà (type house): tiem_may, tiem_trang_tri, rap_hat, vua_thu_mua, nha_dan; xe bò (type cart); đài phun nước (type well).
"""
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'maps' / 'town.json'
W, H = 44, 30
AUTOTILE = [36, 25, 33, 22, 3, 14, 0, 11, 35, 24, 34, 23, 2, 13, 1, 12]
GRASS_VARIANTS = [55, 56, 57, 66, 67, 68]
rnd = random.Random(23)

TILESETS = [
    ('water', '../../assets/Tilesets/Water.png', 64, 16),
    ('grass', '../../assets/Tilesets/Grass.png', 176, 112),
    ('dirt', '../../assets/Tilesets/Tilled_Dirt_Wide.png', 176, 112),
    ('fences', '../../assets/Tilesets/Fences.png', 64, 64),
]
first, ts_json, gid = {}, [], 1
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
for y in (14, 15, 16):
    for x in range(0, 3):
        land[y][x] = True
road = grid(False)


def line(x0, y0, x1, y1, w=2):
    for y in range(min(y0, y1), max(y0, y1) + 1):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for d in range(w):
                yy, xx = (y + d, x) if x0 != x1 else (y, x + d)
                if 0 <= yy < H and 0 <= xx < W:
                    road[yy][xx] = True


line(0, 15, 40, 15)                 # phố chính
# quảng trường lát đất quanh đài phun nước
for y in range(10, 15):
    for x in range(17, 26):
        road[y][x] = True

BUILDINGS = [
    ('tiem_may', 4, 4, 7, 7, 0xd88aa0, 'Tiệm may'),
    ('tiem_trang_tri', 27, 4, 7, 30, 0x88b870, 'Tiệm trang trí'),
    ('rap_hat', 14, 1, 11, 19, 0xc0403a, 'Rạp hát'),
    ('vua_thu_mua', 5, 19, 9, 9, 0xb8904a, 'Vựa thu mua'),
    ('nha_dan', 20, 20, 5, 22, 0xa0a8b8, 'Nhà trọ'),
    ('nha_dan2', 30, 20, 5, 32, 0xc8a070, 'Tiệm tạp hóa'),
]
objs_b, oid = [], 1
for name, x, y, w, dx, tint, label in BUILDINGS:
    objs_b.append({'id': oid, 'name': name, 'type': 'house', 'x': x * 16, 'y': y * 16, 'width': w * 16, 'height': 5 * 16, 'rotation': 0, 'visible': True,
                   'properties': [{'name': 'door', 'type': 'int', 'value': dx}, {'name': 'roof', 'type': 'color', 'value': '#ff%06x' % tint},
                                  {'name': 'label', 'type': 'string', 'value': label}]})
    oid += 1
    line(dx, y + 5, dx, 15 if y < 15 else 16, 1)
objs_b.append({'id': oid, 'name': 'fountain', 'type': 'well', 'x': 20 * 16, 'y': 11 * 16, 'width': 32, 'height': 32, 'rotation': 0, 'visible': True, 'properties': []}); oid += 1
objs_b.append({'id': oid, 'name': 'cart', 'type': 'cart', 'x': 37 * 16, 'y': 12 * 16, 'width': 32, 'height': 32, 'rotation': 0, 'visible': True, 'properties': []}); oid += 1

reserved = grid(False)
def reserve(x0, y0, x1, y1):
    for y in range(max(0, y0), min(H, y1 + 1)):
        for x in range(max(0, x0), min(W, x1 + 1)):
            reserved[y][x] = True
for o in objs_b:
    reserve(o['x'] // 16 - 1, o['y'] // 16 - 1, (o['x'] + o['width']) // 16, (o['y'] + o['height']) // 16 + 1)
for y in range(H):
    for x in range(W):
        if road[y][x]:
            reserve(x - 1, y - 1, x + 1, y + 1)

decor = []
def free(x, y, w, h):
    return all(0 <= xx < W and 0 <= yy < H and land[yy][xx] and not reserved[yy][xx] for yy in range(y, y + h) for xx in range(x, x + w))
def place(kind, w, h, tries):
    for _ in range(tries):
        x, y = rnd.randrange(1, W - 2), rnd.randrange(1, H - 2)
        if free(x - 1, y - 1, w + 2, h + 2):
            decor.append((kind, x, y))
            reserve(x, y, x + w - 1, y + h - 1)
place('bigTree', 2, 2, 120)
place('smallTree', 1, 2, 40)
place('bush', 1, 1, 20)
for _ in range(50):
    x, y = rnd.randrange(1, W - 1), rnd.randrange(1, H - 1)
    if land[y][x] and not road[y][x] and not reserved[y][x]:
        decor.append(('flower', x, y))
        reserved[y][x] = True
objs_d = []
for kind, x, y in decor:
    objs_d.append({'id': oid, 'name': '', 'type': kind, 'x': x * 16, 'y': y * 16, 'width': 16, 'height': 16, 'point': True, 'rotation': 0, 'visible': True})
    oid += 1

POINTS = {
    'from_village': (1, 15), 'exit_west': (0, 15), 'cart': (36, 16), 'plaza': (22, 14),
    'keeper_may': (7, 10), 'keeper_deco': (30, 10), 'keeper_vua': (9, 25), 'keeper_rap': (19, 7),
    'walk_0': (12, 16), 'walk_1': (24, 13), 'walk_2': (34, 16), 'walk_3': (18, 12), 'walk_4': (28, 16), 'walk_5': (14, 15),
}
objs_p = []
for name, (x, y) in POINTS.items():
    if not land[y][x]:
        raise SystemExit(f'điểm {name} ở dưới nước')
    objs_p.append({'id': oid, 'name': name, 'type': 'point', 'x': x * 16 + 8, 'y': y * 16 + 8, 'width': 0, 'height': 0, 'point': True, 'rotation': 0, 'visible': True})
    oid += 1


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
            ground_l[i] = first['grass'] + (rnd.choice(GRASS_VARIANTS) if m == 15 and rnd.random() < 0.12 else AUTOTILE[m])
        if road[y][x] and land[y][x]:
            road_l[i] = first['dirt'] + AUTOTILE[mask(road, x, y)]

tile_layer = lambda lid, name, data: {'id': lid, 'name': name, 'type': 'tilelayer', 'x': 0, 'y': 0, 'width': W, 'height': H, 'opacity': 1, 'visible': True, 'data': data}
obj_layer = lambda lid, name, objs: {'id': lid, 'name': name, 'type': 'objectgroup', 'draworder': 'topdown', 'x': 0, 'y': 0, 'opacity': 1, 'visible': True, 'objects': objs}
tmj = {
    'type': 'map', 'version': '1.10', 'tiledversion': '1.10.2', 'orientation': 'orthogonal', 'renderorder': 'right-down',
    'width': W, 'height': H, 'tilewidth': 16, 'tileheight': 16, 'infinite': False, 'nextlayerid': 8, 'nextobjectid': oid, 'tilesets': ts_json,
    'layers': [tile_layer(1, 'water', water_l), tile_layer(2, 'ground', ground_l), tile_layer(3, 'road', road_l), tile_layer(4, 'fence', fence_l),
               obj_layer(5, 'buildings', objs_b), obj_layer(6, 'decor', objs_d), obj_layer(7, 'points', objs_p)],
}
OUT.write_text(json.dumps(tmj, ensure_ascii=False, separators=(',', ':')))
print('→', OUT, f'{len(decor)} vật trang trí, {len(POINTS)} điểm')
