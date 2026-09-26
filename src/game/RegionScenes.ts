import Phaser from 'phaser';
import { CROPS, ITEMS, NODES, REEF_TRASH, SKY_SEEDS, type ItemId } from '../data';
import { cropStage, isRipe, key, seeded, useOnTile, type FarmState } from './farm';
import type { Tile } from './player';
import { strike } from './resources';
import { dive, donateTrash, forageToday, pickForage, SKY_X, takenToday } from './regions';
import { AUTOTILE, neighborMask, TILE } from './world';
import { WorldScene } from './WorldScene';
import { settings } from '../ui/settings';

/** Cắt thêm frame cây nhiều ô từ Basic_Grass_Biom_things.png (một lần cho cả game). */
export function ensureBiomeFrames(scene: Phaser.Scene) {
  const tex = scene.textures.get('biome');
  if (tex.has('bigTree')) return;
  tex.add('bigTree', 0, 16, 0, 32, 32);
  tex.add('fruitTree', 0, 48, 0, 32, 32);
  tex.add('smallTree', 0, 0, 0, 16, 32);
  tex.add('sunflower', 0, 128, 32, 16, 32);
}

/**
 * Tạo tileset cỏ đổi màu (cát, mây): điểm ảnh xanh lá đổi theo độ sáng sang dải màu [tối, sáng],
 * viền bờ (nâu, xanh nước) giữ nguyên.
 */
export function recolorGrass(scene: Phaser.Scene, keyName: string, dark: number, light: number) {
  if (scene.textures.exists(keyName)) return keyName;
  const src = scene.textures.get('grass').getSourceImage() as HTMLImageElement;
  const tex = scene.textures.createCanvas(keyName, src.width, src.height)!;
  const ctx = tex.getContext();
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, src.width, src.height);
  const d = img.data;
  const c = (n: number, sh: number) => (n >> sh) & 255;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    if (!d[i + 3] || !(g > r && g > b)) continue;
    const t = Math.min(1, Math.max(0, (g - 90) / 140));
    for (const [k, sh] of [[0, 16], [1, 8], [2, 0]]) d[i + k] = Math.round(c(dark, sh) + (c(light, sh) - c(dark, sh)) * t);
  }
  ctx.putImageData(img, 0, 0);
  tex.refresh();
  // Cắt khung 16×16 như spritesheet gốc
  const cols = Math.floor(src.width / TILE);
  for (let i = 0; i < cols * Math.floor(src.height / TILE); i++) tex.add(i, 0, (i % cols) * TILE, Math.floor(i / cols) * TILE, TILE, TILE);
  return keyName;
}

/**
 * Vẽ luống đất + cây trồng của một khu (nhà kính, vườn mây). Đất/cây lưu chung bảng với nông trại,
 * tọa độ x trong bảng = `x0` + x trong cảnh.
 */
export function drawPlots(scene: Phaser.Scene, s: FarmState, soil: Phaser.Tilemaps.TilemapLayer, dirtFirst: number, crops: Map<string, Phaser.GameObjects.Image>, x0: number, W: number, H: number) {
  const inside = (k: string) => { const x = Number(k.split(',')[0]); return x >= x0 && x < x0 + 100; };
  const tilled: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const mine = Object.entries(s.tilled).filter(([k]) => inside(k));
  for (const [k] of mine) {
    const [x, y] = k.split(',').map(Number);
    if (x - x0 < W && y < H) tilled[y][x - x0] = true;
  }
  const mask = (x: number, y: number) => (tilled[y - 1]?.[x] ? 1 : 0) | (tilled[y]?.[x + 1] ? 2 : 0) | (tilled[y + 1]?.[x] ? 4 : 0) | (tilled[y]?.[x - 1] ? 8 : 0);
  soil.fill(-1);
  for (const [k, t] of mine) {
    const [x, y] = k.split(',').map(Number);
    const tile = soil.putTileAt(dirtFirst + AUTOTILE[mask(x - x0, y)], x - x0, y);
    tile.tint = t.watered ? 0x8a6a5a : 0xffffff;
  }
  for (const [k, img] of crops) if (!s.crops[k]) { img.destroy(); crops.delete(k); }
  for (const [k, c] of Object.entries(s.crops)) {
    if (!inside(k)) continue;
    const [x, y] = k.split(',').map(Number);
    const def = CROPS[c.id];
    const frame = def.frames[cropStage(c)];
    let img = crops.get(k);
    if (!img) {
      img = scene.add.image((x - x0) * TILE + TILE / 2, (y + 1) * TILE, def.sheet, frame).setOrigin(0.5, 1).setDepth((y + 1) * TILE - 1);
      crops.set(k, img);
    }
    img.setFrame(frame);
    if (def.tint) img.setTint(def.tint);
    if (isRipe(c) && !img.getData('bob')) img.setData('bob', scene.tweens.add({ targets: img, scaleY: 1.08, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
  }
}

/**
 * Phần chung của các vùng xa (rừng, biển, vườn mây): nền cỏ tự nối viền trên nước, bến xe bò,
 * đồ nhặt được mỗi ngày.
 */
abstract class RegionScene extends WorldScene {
  protected outdoor = true;
  protected cart = { x: 0, y: 0 };
  protected blocked: boolean[][] = [];
  /** Đồ nằm trên đất hôm nay (khóa ô → món + hình). */
  private pickups = new Map<string, { item: ItemId; img: Phaser.GameObjects.Image }>();

  /** Dựng nền: `land[y][x]` là đất, còn lại là nước (động). Trả về lưới chặn (nước bị chặn). */
  protected ground(land: boolean[][], tint: number, variants = true, withWater = true, grassKey = 'grass') {
    this.pickups = new Map();
    ensureBiomeFrames(this);
    const H = land.length, W = land[0].length;
    const map = this.make.tilemap({ width: W, height: H, tileWidth: TILE, tileHeight: TILE });
    const water = map.addTilesetImage('water', 'water', TILE, TILE, 0, 0, 1)!;
    const grass = map.addTilesetImage(grassKey, grassKey, TILE, TILE, 0, 0, 100)!;
    const waterLayer = map.createBlankLayer('water', water)!.setDepth(0);
    const grassLayer = map.createBlankLayer('grass', grass)!.setDepth(1);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!land[y][x]) { if (withWater) waterLayer.putTileAt(water.firstgid, x, y); continue; }
        const m = neighborMask(land, x, y, true);
        const v = variants && m === 15 && seeded(x * 31 + y * 17) < 0.1 ? [55, 56, 57, 66, 67, 68][Math.floor(seeded(x * 7 + y * 131) * 6)] : AUTOTILE[m];
        grassLayer.putTileAt(grass.firstgid + v, x, y).tint = tint;
      }
    let frame = 0;
    this.time.addEvent({ delay: 280, loop: true, callback: () => {
      frame = (frame + 1) % 4;
      waterLayer.forEachTile((t) => { if (t.index > 0) t.index = water.firstgid + frame; });
    } });
    this.blocked = land.map((row) => row.map((l) => !l));
    return this.blocked;
  }

  /** Xe bò 2×2 ô; đứng trước xe là điểm xuất hiện 'cart'. */
  protected placeCart(x: number, y: number) {
    this.cart = { x, y };
    this.add.image(x * TILE, y * TILE + 8, 'cart').setOrigin(0).setDepth((y + 2) * TILE);
    for (let yy = y; yy < y + 2; yy++) for (let xx = x; xx < x + 2; xx++) this.blocked[yy][xx] = true;
    return { x: (x + 1) * TILE, y: (y + 2.6) * TILE, dir: 'down' as const };
  }

  protected isCart = (t: Tile) => t.x >= this.cart.x && t.x < this.cart.x + 2 && t.y >= this.cart.y && t.y < this.cart.y + 2;

  protected tree(x: number, y: number, tint?: number) {
    const img = this.add.image(x * TILE, y * TILE, 'biome', 'bigTree').setOrigin(0).setDepth((y + 2) * TILE);
    if (tint) img.setTint(tint);
    this.blocked[y + 1][x] = this.blocked[y + 1][x + 1] = true;
    return img;
  }

  /** Rải đồ nhặt hôm nay lên các ô `spots` (bỏ ô đã nhặt). */
  protected scatter(spots: [number, number][], count: number, table?: [ItemId, number][], salt = 0) {
    const taken = takenToday(this.state);
    for (const f of forageToday(this.state.day + salt, spots, count, table)) {
      const k = key(f.x, f.y);
      if (taken.has(k)) continue;
      const [tex, fr] = ITEMS[f.item].icon;
      const img = this.add.image(f.x * TILE + 8, f.y * TILE + 9, tex, fr).setDepth((f.y + 1) * TILE - 3);
      this.tweens.add({ targets: img, y: img.y - 1.5, duration: 900 + (f.x % 3) * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.pickups.set(k, { item: f.item, img });
    }
  }

  /** Đồ người khác vừa nhặt (co-op): gỡ khỏi đất. */
  refresh() {
    const taken = takenToday(this.state);
    for (const [k, p] of this.pickups) if (taken.has(k)) { p.img.destroy(); this.pickups.delete(k); }
  }

  /** Nhặt đồ ở ô `t` nếu có. */
  protected tryPickup(t: Tile) {
    const k = key(t.x, t.y);
    const p = this.pickups.get(k);
    if (!p) return false;
    if (!pickForage(this.state, t.x, t.y, p.item)) { this.hud.toast('Túi đồ đầy'); return true; }
    this.pickups.delete(k);
    p.img.destroy();
    this.popItem(t, p.item);
    this.hud.toast(`Nhặt được ${ITEMS[p.item].name.toLowerCase()}`);
    this.renderHud();
    return true;
  }

  /** Ô trống (không chặn, không phải xe) để rải đồ. */
  protected freeSpots(pred: (x: number, y: number) => boolean = () => true) {
    const out: [number, number][] = [];
    this.blocked.forEach((row, y) => row.forEach((b, x) => { if (!b && pred(x, y) && Math.hypot(x - this.cart.x, y - this.cart.y) > 3) out.push([x, y]); }));
    return out;
  }
}

// ---------------------------------------------------------------- rừng

const FW = 40, FH = 28;
const POND = { x: 30, y: 8, rx: 4.2, ry: 3 };
const inPond = (x: number, y: number) => ((x + 0.5 - POND.x) / POND.rx) ** 2 + ((y + 0.5 - POND.y) / POND.ry) ** 2 <= 1;

/** Rừng: đồ hái mọc mỗi sáng, cây gỗ quý chặt được (hôm sau mọc lại), hồ câu cá sông. */
export class ForestScene extends RegionScene {
  readonly location = 'forest' as const;
  private trees = new Map<string, { img: Phaser.GameObjects.Image; dmg: number; at: string }>();

  constructor() {
    super('forest');
  }

  protected buildMap() {
    this.trees = new Map();
    this.cameras.main.setBackgroundColor('#2c4a2a');
    const land = Array.from({ length: FH }, (_, y) => Array.from({ length: FW }, (_, x) => !inPond(x, y)));
    const blocked = this.ground(land, 0xc8e0b0);
    const cart = this.placeCart(19, FH - 5);
    // Viền rừng rậm
    for (let x = 0; x < FW - 1; x += 2) { this.tree(x, -1, 0x7aa070); this.tree(x, FH - 2, 0x7aa070); }
    for (let y = 1; y < FH - 2; y += 2) { this.tree(0, y, 0x7aa070); this.tree(FW - 2, y, 0x7aa070); }
    for (let x = 0; x < FW; x++) { blocked[0][x] = blocked[FH - 1][x] = true; }
    for (let y = 0; y < FH; y++) { blocked[y][0] = blocked[y][FW - 1] = true; }
    // Cây gỗ quý: vị trí cố định, chặt xong mai mọc lại
    const taken = takenToday(this.state);
    const spots: [number, number][] = [];
    for (let i = 0; spots.length < 16 && i < 400; i++) {
      const x = 3 + Math.floor(seeded(i * 13 + 5) * (FW - 7)), y = 2 + Math.floor(seeded(i * 29 + 11) * (FH - 8));
      const clash = spots.some(([a, b]) => Math.abs(a - x) < 3 && Math.abs(b - y) < 3);
      const near = inPond(x, y) || inPond(x + 1, y + 1) || inPond(x - 1, y) || inPond(x + 2, y + 1) || Math.hypot(x - 19, y - (FH - 5)) < 5;
      if (!clash && !near) spots.push([x, y]);
    }
    for (const [x, y] of spots) {
      const at = `t:${key(x, y)}`;
      if (taken.has(at)) {
        this.add.image(x * TILE + 8, (y + 1) * TILE, 'biome', 22).setOrigin(0).setDepth((y + 2) * TILE);
        continue;
      }
      const img = this.tree(x, y, 0x5e8a50);
      const node = { img, dmg: 0, at };
      this.trees.set(key(x, y + 1), node);
      this.trees.set(key(x + 1, y + 1), node);
    }
    // Bụi, nấm trang trí
    for (let i = 0; i < 40; i++) {
      const x = 1 + Math.floor(seeded(i * 71 + 3) * (FW - 2)), y = 1 + Math.floor(seeded(i * 37 + 9) * (FH - 3));
      if (!blocked[y][x] && !inPond(x, y)) this.add.image(x * TILE, y * TILE, 'biome', [24, 25, 32, 33, 34][i % 5]).setOrigin(0).setDepth(2.5);
    }
    this.scatter(this.freeSpots(), 12);
    this.message ??= 'Rừng — nấm, măng, mật ong mọc mỗi sáng; cây sẫm màu cho gỗ quý (cầm rìu)';
    return { blocked, spawns: { cart, default: cart } };
  }

  refresh() {
    super.refresh();
    // Cây gỗ quý người khác vừa chặt
    const taken = takenToday(this.state);
    for (const [k, tree] of this.trees) {
      if (!taken.has(tree.at)) continue;
      this.trees.delete(k);
      const [x, y] = k.split(',').map(Number);
      this.ctrl?.setBlocked(x, y, false);
      if (tree.img.active) tree.img.destroy();
    }
  }

  protected interact(t: Tile) {
    if (this.isCart(t)) return this.openWorldMap();
    if (this.tryPickup(t)) return;
    if (inPond(t.x, t.y)) return this.fish('river');
    const tree = this.trees.get(key(t.x, t.y));
    if (!tree) return this.hud.toast('Cỏ rừng mềm, chẳng có gì');
    const r = strike(this.state, this.selected, 'forest_tree', tree.dmg);
    if (!r.ok) return this.hud.toast(r.reason);
    this.ctrl.playTool('axe', () => {
      if (!r.broke) {
        tree.dmg = NODES.forest_tree.hp - r.hp;
        this.tweens.add({ targets: tree.img, x: tree.img.x + 1.5, duration: 45, yoyo: true, repeat: 2 });
      } else {
        this.state.forage!.taken.push(tree.at);
        for (const [k, n] of this.trees) if (n === tree) { this.trees.delete(k); const [x, y] = k.split(',').map(Number); this.ctrl.setBlocked(x, y, false); }
        this.tweens.add({ targets: tree.img, alpha: 0, duration: 250, onComplete: () => tree.img.destroy() });
        r.drops.forEach(([item], i) => this.time.delayedCall(i * 120, () => this.popItem(t, item)));
        this.hud.toast(`Được ${r.drops.map(([it, n]) => `${n} ${ITEMS[it].name.toLowerCase()}`).join(', ')}`);
      }
      this.renderHud();
    });
  }
}

// ---------------------------------------------------------------- biển

const SW = 40, SH = 26, SHORE = 9;
const DOCK = { x: 18, y0: SHORE, y1: 16 };
const DIVE_SPOTS: [number, number][] = [[17, 14], [20, 14], [17, 16], [20, 16], [18, 17], [19, 17]];
const REEF = { x0: 26, y0: 14, x1: 37, y1: 23 };
const BEACH_LOOT: [ItemId, number][] = [['vo_so', 5], ['rac', 3], ['san_ho', 1]];

/** Biển & đảo: bãi cát nhặt vỏ sò, cầu tàu lặn biển, trạm cứu hộ góp rác hồi sinh rạn san hô. */
export class SeaScene extends RegionScene {
  readonly location = 'sea' as const;
  private station = { x: 6, y: 2 };

  constructor() {
    super('sea');
  }

  protected buildMap() {
    this.cameras.main.setBackgroundColor('#3a7aa8');
    const land = Array.from({ length: SH }, (_, y) => Array.from({ length: SW }, (_, x) => y < SHORE - (x > 30 ? 1 : 0) + (x < 6 ? 1 : 0)));
    const blocked = this.ground(land, 0xffffff, false, true, recolorGrass(this, 'sand', 0xc8a060, 0xf8e4b0));
    const cart = this.placeCart(30, 2);
    // Cầu tàu
    for (let y = DOCK.y0 - 1; y <= DOCK.y1; y++) for (let x = DOCK.x; x < DOCK.x + 2; x++) {
      this.add.rectangle(x * TILE, y * TILE, TILE, TILE, 0xc49a6c).setOrigin(0).setStrokeStyle(1, 0x8a5a36).setDepth(1.8);
      blocked[y][x] = false;
    }
    // Chỗ lặn: bong bóng nổi
    for (const [x, y] of DIVE_SPOTS) {
      const b = this.add.circle(x * TILE + 8, y * TILE + 10, 2, 0xffffff, 0.8).setDepth(1.9);
      this.tweens.add({ targets: b, y: b.y - 6, alpha: 0, duration: 1200, repeat: -1, delay: (x * 7 + y) % 5 * 200 });
      this.add.ellipse(x * TILE + 8, y * TILE + 9, 12, 5, 0xffffff, 0.25).setDepth(1.85);
    }
    // Trạm cứu hộ (sạp sơn xanh)
    const st = this.station;
    this.add.image(st.x * TILE, st.y * TILE, 'shop').setOrigin(0).setTint(0xa8d8f0).setDepth((st.y + 3) * TILE);
    this.add.text((st.x + 1.5) * TILE, st.y * TILE - 2, 'Trạm cứu hộ biển', { fontFamily: 'VT323', fontSize: '10px', color: '#fff', stroke: '#3b2a2e', strokeThickness: 2, resolution: 4 }).setOrigin(0.5, 1).setDepth(9000);
    for (let y = st.y + 1; y < st.y + 3; y++) for (let x = st.x; x < st.x + 3; x++) blocked[y][x] = true;
    // Rạn san hô: hồi sinh thì rực màu
    const alive = this.state.flags.includes('reef');
    for (let i = 0; i < 18; i++) {
      const x = REEF.x0 + Math.floor(seeded(i * 17 + 1) * (REEF.x1 - REEF.x0)), y = REEF.y0 + Math.floor(seeded(i * 23 + 7) * (REEF.y1 - REEF.y0));
      const [tex, fr] = ITEMS.san_ho.icon;
      this.add.image(x * TILE + 8, y * TILE + 8, tex, fr).setDepth(1.5).setAlpha(alive ? 0.95 : 0.45).setTint(alive ? [0xffffff, 0xffb0e0, 0xffe080][i % 3] : 0x8a8a8a);
    }
    // Cây dừa (cây to nhuộm) dọc bờ
    for (const x of [1, 12, 24, 36]) this.tree(x, 0, 0xd8e8a0);
    for (let x = 0; x < SW; x++) blocked[0][x] = true;
    this.scatter(this.freeSpots((x, y) => y >= 3 && y < SHORE - 1 && x > 1 && x < SW - 2 && !(x >= DOCK.x - 1 && x <= DOCK.x + 2)), 6, BEACH_LOOT, 9000);
    this.message ??= alive
      ? 'Biển — rạn san hô đã hồi sinh, cá mú, cá hồng, cá đuối về rồi!'
      : `Biển — lặn ở chỗ bong bóng (tốn sức), góp ${REEF_TRASH} rác cho trạm cứu hộ để hồi sinh rạn san hô`;
    return { blocked, spawns: { cart, default: cart } };
  }

  protected interact(t: Tile) {
    if (this.isCart(t)) return this.openWorldMap();
    const st = this.station;
    if (t.x >= st.x && t.x < st.x + 3 && t.y >= st.y && t.y < st.y + 3) return this.openStation();
    if (this.tryPickup(t)) return;
    if (DIVE_SPOTS.some(([x, y]) => x === t.x && y === t.y)) {
      const r = dive(this.state);
      if (!r.ok) return this.hud.toast(r.reason);
      if (!settings.reduceMotion) this.cameras.main.flash(250, 120, 200, 255);
      this.popItem(t, r.item);
      this.hud.toast(`Lặn xuống… mò được ${ITEMS[r.item].name.toLowerCase()}`);
      return this.renderHud();
    }
    if (this.blocked[t.y]?.[t.x] && t.y >= SHORE - 1) return this.fish('sea');
    this.hud.toast('Cát nóng quá!');
  }

  private openStation() {
    const s = this.state;
    const done = s.flags.includes('reef');
    const text = done ? 'Rạn san hô sống lại rồi. Cá rạn chỉ cắn câu ở biển này.' : `Rác đã góp: ${s.reefTrash}/${REEF_TRASH}. Lặn biển là mò được rác — mang về đây giúp tụi tôi nhé!`;
    this.hud.choose('Trạm cứu hộ biển', text, done ? [{ label: 'Tạm biệt', primary: true, fn: () => {} }] : [
      { label: 'Góp rác', primary: true, fn: () => {
        const r = donateTrash(s);
        if (!r.ok) return this.hud.toast(r.reason);
        this.renderHud();
        if (r.revived) { this.hud.toast('Rạn san hô hồi sinh! Cá mú, cá hồng, cá đuối đã về'); this.scene.restart({ state: s, hud: this.hud, spawn: 'cart' }); }
        else this.hud.toast(`Cảm ơn! Đã góp ${r.total}/${REEF_TRASH}`);
      } },
      { label: 'Để sau', fn: () => {} },
    ]);
  }
}

// ---------------------------------------------------------------- vườn trên mây

const KW = 28, KH = 18;
const ISLAND = { x: 14, y: 9, rx: 12.5, ry: 7.5 };
const BED = { x0: 7, y0: 6, x1: 18, y1: 11 };
const STALL = { x: 20, y: 2 };

/** Vườn trên mây: trồng quanh năm, sáng nào cũng có mưa mây tưới; Tiên Mây bán hạt giống trên mây. */
export class SkyScene extends RegionScene {
  readonly location = 'sky' as const;
  private soil!: Phaser.Tilemaps.TilemapLayer;
  private dirtFirst = 0;
  private crops = new Map<string, Phaser.GameObjects.Image>();

  constructor() {
    super('sky');
  }

  protected buildMap() {
    this.crops = new Map();
    this.cameras.main.setBackgroundColor('#9fd4ff');
    // Mây trôi phía dưới
    for (let i = 0; i < 7; i++) {
      const c = this.add.ellipse(seeded(i * 5) * KW * TILE, seeded(i * 9 + 1) * KH * TILE, 60 + i * 8, 18, 0xffffff, 0.55).setDepth(-1);
      this.tweens.add({ targets: c, x: c.x + 60, duration: 9000 + i * 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const land = Array.from({ length: KH }, (_, y) => Array.from({ length: KW }, (_, x) => ((x + 0.5 - ISLAND.x) / ISLAND.rx) ** 2 + ((y + 0.5 - ISLAND.y) / ISLAND.ry) ** 2 <= 1));
    // Không có nước — ô ngoài đảo là trời
    const blocked = this.ground(land, 0xffffff, false, false, recolorGrass(this, 'cloud', 0xb8c0e8, 0xffffff));
    const cart = this.placeCart(3, 8);
    this.add.rectangle(BED.x0 * TILE, BED.y0 * TILE, (BED.x1 - BED.x0 + 1) * TILE, (BED.y1 - BED.y0 + 1) * TILE, 0xb8a8e0, 0.45).setOrigin(0).setStrokeStyle(1, 0x9a88c8).setDepth(1.2);
    const map = this.make.tilemap({ width: KW, height: KH, tileWidth: TILE, tileHeight: TILE });
    const dirt = map.addTilesetImage('dirt', 'dirt', TILE, TILE, 0, 0, 1)!;
    this.dirtFirst = dirt.firstgid;
    this.soil = map.createBlankLayer('soil', dirt)!.setDepth(1.5);
    this.add.image(STALL.x * TILE, STALL.y * TILE, 'shop').setOrigin(0).setTint(0xe8dcff).setDepth((STALL.y + 3) * TILE);
    this.add.text((STALL.x + 1.5) * TILE, STALL.y * TILE - 2, 'Tiên Mây', { fontFamily: 'VT323', fontSize: '10px', color: '#fff', stroke: '#5a4a8a', strokeThickness: 2, resolution: 4 }).setOrigin(0.5, 1).setDepth(9000);
    for (let y = STALL.y + 1; y < STALL.y + 3; y++) for (let x = STALL.x; x < STALL.x + 3; x++) blocked[y][x] = true;
    this.message ??= 'Vườn trên mây — trồng gì cũng được quanh năm, sáng nào mưa mây cũng tưới. Tiên Mây bán hạt giống riêng';
    return { blocked, spawns: { cart, default: cart } };
  }

  private inBed = (t: Tile) => t.x >= BED.x0 && t.x <= BED.x1 && t.y >= BED.y0 && t.y <= BED.y1;

  protected interact(t: Tile) {
    if (this.isCart(t)) return this.openWorldMap();
    if (t.x >= STALL.x && t.x < STALL.x + 3 && t.y >= STALL.y && t.y < STALL.y + 3) return this.hud.openShop(this.state, 'festival', 'Tiên Mây · hạt giống trên mây', SKY_SEEDS);
    if (!this.inBed(t)) return this.hud.toast('Chỉ trồng trong luống đất mây');
    const held = this.state.inventory[this.selected]?.item;
    if (held && ITEMS[held].kind === 'sapling') return this.hud.toast('Cây ăn trái không bám được đất mây');
    const r = useOnTile(this.state, this.selected, SKY_X + t.x, t.y, { tillable: true, nearWater: false, anySeason: true, sky: true });
    if (!r.ok) return this.hud.toast(r.reason);
    const finish = () => {
      if (r.action === 'harvest') this.popItem(t, r.item!);
      this.refresh();
      this.renderHud();
    };
    if (r.action === 'till' || r.action === 'water') this.ctrl.playTool(r.action === 'till' ? 'hoe' : 'water', finish);
    else finish();
  }

  refresh() {
    drawPlots(this, this.state, this.soil, this.dirtFirst, this.crops, SKY_X, KW, KH);
  }
}
