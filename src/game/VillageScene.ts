import Phaser from 'phaser';
import { CROPS, ITEMS, NPC, NPCS, type NpcDef, type Season } from '../data';
import { key, refillCan, seasonOf } from './farm';
import type { Dir, Tile } from './player';
import { festivalNow, festivalTalk, festivalToday, heldRod } from './activities';
import ICONS from '../../assets/Custom/icons.json';
import { finishEvent, GIFT_REACTION, giveGift, npcState, shopHours, shopOpen, SHOPS, stopAt, talk } from './villagers';
import { TILE } from './world';
import { WorldScene } from './WorldScene';
import { session } from './session';
import { regionOpen } from './town';
import { acceptGuest, currentQuest, deliverGuest, guestAround, guestState, hasCard, questText, showTime, watchShow, weekGuests } from './guests';
import { touchProfile } from './session';
import { buildSheet } from '../ui/avatar';
import { countItem } from './farm';
import type { Guest } from '../data';
import { sfx } from '../audio/sound';

const NPC_SPEED = 42;

interface TiledObject { name: string; type: string; x: number; y: number; width: number; height: number; properties?: { name: string; value: unknown }[] }
interface Building { name: string; type: string; x: number; y: number; w: number; h: number; door?: { x: number; y: number }; label?: string }
interface Walker {
  def: NpcDef;
  sprite: Phaser.GameObjects.Sprite;
  path: Tile[];
  target: string;
  hidden: boolean;
  dir: Dir;
}

const prop = (o: TiledObject, n: string) => o.properties?.find((p) => p.name === n)?.value;

/**
 * Làng (src/maps/village.json): 8 dân làng đi lại theo lịch, tiệm mở khi chủ tiệm có mặt.
 * Cũng dựng chợ huyện (src/maps/town.json, mốc 14): tiệm may, trang trí, vựa thu mua, rạp hát, người đi dạo.
 */
export class VillageScene extends WorldScene {
  readonly location: 'village' | 'town';
  protected outdoor = true;
  private walkable: boolean[][] = [];
  private points: Record<string, Tile> = {};
  private buildings: Building[] = [];
  private walkers: Walker[] = [];
  private tinted: (Phaser.GameObjects.Image | Phaser.Tilemaps.TilemapLayer)[] = [];
  private paradeStep = 0;
  private lantern?: Phaser.GameObjects.Image;

  private folk: { sprite: Phaser.GameObjects.Sprite; path: Tile[]; wait: number; key: string }[] = [];
  private guests: { g: Guest; sprite: Phaser.GameObjects.Sprite }[] = [];

  constructor(loc: 'village' | 'town' = 'village') {
    super(loc);
    this.location = loc;
  }

  private get isTown() {
    return this.location === 'town';
  }

  protected buildMap() {
    this.walkers = [];
    this.tinted = [];
    this.lantern = undefined;
    this.folk = [];
    this.guests = [];
    const map = this.make.tilemap({ key: this.location });
    const W = map.width;
    const H = map.height;
    const ts = (n: string) => map.addTilesetImage(n, n)!;
    const water = ts('water');
    const waterLayer = map.createLayer('water', water)!.setDepth(0);
    const ground = map.createLayer('ground', ts('grass'))!.setDepth(1);
    const road = map.createLayer('road', ts('dirt'))!.setDepth(1.5);
    road.forEachTile((t) => (t.tint = 0xf0dcb0));
    const fence = map.createLayer('fence', ts('fences'))!.setDepth(3);
    this.tinted.push(ground);
    let frame = 0;
    this.time.addEvent({ delay: 280, loop: true, callback: () => {
      frame = (frame + 1) % 4;
      waterLayer.forEachTile((t) => { if (t.index > 0) t.index = water.firstgid + frame; });
    } });

    const blocked = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => !ground.getTileAt(x, y) || !!fence.getTileAt(x, y)));
    const objects = (layer: string) => (map.getObjectLayer(layer)?.objects ?? []) as unknown as TiledObject[];

    // Điểm hẹn
    this.points = {};
    for (const o of objects('points')) this.points[o.name] = { x: Math.floor(o.x / TILE), y: Math.floor(o.y / TILE) };

    // Nhà cửa, sạp chợ, giếng, bến, bảng tin
    this.buildings = [];
    for (const o of objects('buildings')) {
      const b: Building = { name: o.name, type: o.type, x: o.x / TILE, y: o.y / TILE, w: o.width / TILE, h: o.height / TILE, label: prop(o, 'label') as string | undefined };
      if (o.type === 'house') {
        b.door = { x: prop(o, 'door') as number, y: b.y + b.h - 1 };
        this.drawHouse(b, Phaser.Display.Color.HexStringToColor(String(prop(o, 'roof')).replace('#ff', '#')).color);
        for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) blocked[y][x] = true;
      } else if (o.type === 'stall') {
        this.add.image(o.x, o.y, 'shop').setOrigin(0).setDepth((b.y + 3) * TILE);
        for (let y = b.y + 1; y < b.y + 3; y++) for (let x = b.x; x < b.x + 3; x++) blocked[y][x] = true;
      } else if (o.type === 'well') {
        this.add.image(o.x, o.y, 'well').setOrigin(0).setDepth((b.y + 2) * TILE);
        for (let y = b.y; y < b.y + 2; y++) for (let x = b.x; x < b.x + 2; x++) blocked[y][x] = true;
      } else if (o.type === 'dock') {
        // Cầu tàu: ván gỗ trên mặt nước, đi lên được
        for (let y = b.y - 1; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
          this.add.rectangle(x * TILE, y * TILE, TILE, TILE, 0xc49a6c).setOrigin(0).setStrokeStyle(1, 0x8a5a36).setDepth(1.8);
          if (y >= 0 && y < H) blocked[y][x] = false;
        }
      } else if (o.type === 'cart') {
        this.add.image(o.x, o.y + 8, 'cart').setOrigin(0).setDepth((b.y + 2) * TILE);
        for (let y = b.y; y < b.y + 2; y++) for (let x = b.x; x < b.x + 2; x++) blocked[y][x] = true;
      } else if (o.type === 'board') {
        const g = this.add.graphics().setDepth((b.y + 1) * TILE);
        g.fillStyle(0x8a5a36).fillRect(o.x + 2, o.y + 8, 2, 8).fillRect(o.x + 12, o.y + 8, 2, 8);
        g.fillStyle(0xc49a6c).fillRect(o.x, o.y, 16, 10).lineStyle(1, 0x5e4032).strokeRect(o.x, o.y, 16, 10);
        g.fillStyle(0xf3ecd8).fillRect(o.x + 3, o.y + 2, 4, 5).fillRect(o.x + 9, o.y + 3, 4, 4);
        blocked[b.y][b.x] = true;
      }
      this.buildings.push(b);
    }

    // Cây cối
    const tex = this.textures.get('biome');
    if (!tex.has('bigTree')) {
      tex.add('bigTree', 0, 16, 0, 32, 32);
      tex.add('smallTree', 0, 0, 0, 16, 32);
    }
    for (const o of objects('decor')) {
      const x = Math.floor(o.x / TILE), y = Math.floor(o.y / TILE);
      const at = (dx: number, dy: number) => { if (blocked[y + dy]) blocked[y + dy][x + dx] = true; };
      let img: Phaser.GameObjects.Image;
      switch (o.type) {
        case 'bigTree': img = this.add.image(x * TILE, y * TILE, 'biome', 'bigTree').setOrigin(0).setDepth((y + 2) * TILE); at(0, 1); at(1, 1); break;
        case 'banyan': img = this.add.image((x + 1) * TILE, (y + 2) * TILE, 'biome', 'bigTree').setOrigin(0.5, 1).setScale(1.7).setDepth((y + 2) * TILE); at(0, 1); at(1, 1); break;
        case 'smallTree': img = this.add.image(x * TILE, y * TILE, 'biome', 'smallTree').setOrigin(0).setDepth((y + 2) * TILE); at(0, 1); break;
        case 'bush': img = this.add.image(x * TILE, y * TILE, 'biome', 28).setOrigin(0).setDepth((y + 1) * TILE); at(0, 0); break;
        case 'berryBush': img = this.add.image(x * TILE, y * TILE, 'biome', 27).setOrigin(0).setDepth((y + 1) * TILE); at(0, 0); break;
        case 'herb': img = this.add.image(x * TILE + 8, (y + 1) * TILE, CROPS.garlic.sheet, CROPS.garlic.frames[2]).setOrigin(0.5, 1).setDepth((y + 1) * TILE); break;
        default: img = this.add.image(x * TILE, y * TILE, 'biome', [24, 25, 32, 33, 34][(x * 7 + y * 3) % 5]).setOrigin(0).setDepth(2.5);
      }
      this.tinted.push(img);
    }
    this.cameras.main.setBackgroundColor('#9bd4c3');

    this.walkable = blocked.map((row) => row.map((b) => !b));
    this.waterTiles = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!ground.getTileAt(x, y) && blocked[y][x]) this.waterTiles.add(key(x, y));
    if (!this.isTown) this.decorateFestival();
    // Mọi điểm hẹn đều là chỗ xuất hiện được (from_farm, cart, east_gate, from_village…)
    const spawns: Record<string, { x: number; y: number; dir?: Dir }> = {};
    for (const [name, pt] of Object.entries(this.points)) spawns[name] = { x: (pt.x + 0.5) * TILE, y: (pt.y + 0.7) * TILE };
    if (this.isTown) {
      const ex = this.points.exit_west;
      this.exits = [{ x: ex.x, y: ex.y - 1, w: 1, h: 3, to: 'village', spawn: 'east_gate' }];
      spawns.default = { ...spawns.from_village, dir: 'right' };
      this.spawnFolk();
    } else {
      const exit = this.points.exit_farm;
      this.exits = [{ x: exit.x, y: exit.y - 1, w: 1, h: 3, to: 'farm', spawn: 'east' }];
      const east = this.points.exit_east;
      if (east && regionOpen(session.profile, this.state, 'town')) this.exits.push({ x: east.x, y: east.y - 1, w: 1, h: 3, to: 'town', spawn: 'from_village' });
      else if (east) {
        for (let y = east.y - 1; y <= east.y + 1; y++) blocked[y][east.x] = true;
        this.add.text((east.x - 1) * TILE, (east.y - 0.4) * TILE, 'Chợ huyện · cấp 5', { fontFamily: 'VT323', fontSize: '10px', color: '#fff4e0', backgroundColor: '#5e4032', padding: { x: 2, y: 0 }, resolution: 4 }).setOrigin(0.5, 1).setDepth(9000);
      }
      this.spawnWalkers();
      this.spawnGuests();
      spawns.from_farm = { x: (this.points.from_farm.x + 0.8) * TILE, y: (this.points.from_farm.y + 0.7) * TILE, dir: 'right' };
      spawns.default = spawns.from_farm;
      spawns.east_gate = { ...spawns.east_gate, dir: 'left' };
    }
    return { blocked, spawns };
  }

  private drawHouse(b: Building, roofTint: number) {
    const px = b.x * TILE, py = b.y * TILE, w = b.w;
    const baseDepth = (b.y + b.h) * TILE;
    const row = (l: number, m: number, r: number) => [l, m, ...Array(Math.max(0, w - 3)).fill(m + 1), r];
    const roof = [row(17, 18, 20), row(24, 25, 27), row(31, 32, 34)];
    const front = [Array.from({ length: w }, (_, i) => (i % 2 === 0 ? 13 : 1)), [...Array(w - 1).fill(11), 12]];
    this.add.rectangle(px, py + 3 * TILE, w * TILE, 2 * TILE, 0x5b3b33).setOrigin(0).setDepth(baseDepth - 1);
    roof.forEach((r, ri) => r.forEach((f, c) => this.add.image(px + c * TILE, py + ri * TILE, 'roof', f).setOrigin(0).setDepth(baseDepth).setTint(roofTint)));
    front.forEach((r, ri) => r.forEach((f, c) => this.add.image(px + c * TILE, py + (3 + ri) * TILE, 'walls', f).setOrigin(0).setDepth(baseDepth)));
    this.add.image(b.door!.x * TILE, b.door!.y * TILE, 'doors', 1).setOrigin(0).setDepth(baseDepth + 1);
    if (b.label) {
      this.add.text((b.door!.x + 0.5) * TILE, (b.y + 3) * TILE - 1, b.label, { fontFamily: 'VT323', fontSize: '10px', color: '#fff4e0', backgroundColor: '#5e4032', padding: { x: 2, y: 0 }, resolution: 4 })
        .setOrigin(0.5, 1).setDepth(baseDepth + 2);
    }
  }

  // ---------------------------------------------------------------- dân làng

  private ensureAnims() {
    if (this.anims.exists('ba_tu-idle-down')) return;
    const rows: Dir[] = ['down', 'up', 'left', 'right'];
    for (const n of NPCS) {
      rows.forEach((d, r) => {
        const base = n.sheet * 16 + r * 4;
        this.anims.create({ key: `${n.id}-idle-${d}`, frames: this.anims.generateFrameNumbers('npcs', { frames: [base, base + 1] }), frameRate: 2, repeat: -1 });
        this.anims.create({ key: `${n.id}-walk-${d}`, frames: this.anims.generateFrameNumbers('npcs', { frames: [base + 2, base + 3] }), frameRate: 6, repeat: -1 });
      });
    }
  }

  private pointOf(name: string, npc: NpcDef) {
    return this.points[name === 'home' ? npc.home : name] ?? this.points.plaza;
  }

  private spawnWalkers() {
    this.ensureAnims();
    for (const def of NPCS) {
      const stop = stopAt(this.state, def);
      const p = this.pointOf(stop, def);
      const sprite = this.add.sprite((p.x + 0.5) * TILE, (p.y + 0.5) * TILE, 'npcs', def.sheet * 16).setOrigin(0.5, 0.62);
      sprite.play(`${def.id}-idle-down`);
      const w: Walker = { def, sprite, path: [], target: stop, hidden: stop === 'home', dir: 'down' };
      sprite.setVisible(!w.hidden);
      this.walkers.push(w);
    }
  }

  /** Tìm đường ngắn nhất theo ô (BFS 4 hướng). */
  private findPath(from: Tile, to: Tile): Tile[] {
    const W = this.walkable[0].length, H = this.walkable.length;
    const ok = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && this.walkable[y][x];
    const prev = new Map<string, string | null>([[key(from.x, from.y), null]]);
    const q: Tile[] = [from];
    while (q.length) {
      const c = q.shift()!;
      if (c.x === to.x && c.y === to.y) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { x: c.x + dx, y: c.y + dy };
        const k = key(n.x, n.y);
        if (!ok(n.x, n.y) || prev.has(k)) continue;
        prev.set(k, key(c.x, c.y));
        q.push(n);
      }
    }
    if (!prev.has(key(to.x, to.y))) return [];
    const out: Tile[] = [];
    for (let k: string | null = key(to.x, to.y); k; k = prev.get(k) ?? null) {
      const [x, y] = k.split(',').map(Number);
      out.unshift({ x, y });
    }
    return out.slice(1);
  }

  private waterTiles = new Set<string>();
  private isWaterTile(t: Tile) {
    return this.waterTiles.has(key(t.x, t.y));
  }

  /** Trang trí ngày hội: dây cờ dọc đường, đèn lồng đỏ (Tết) / đèn ông sao (Trung Thu), cây đào mai. */
  private decorateFestival() {
    const f = festivalToday(this.state);
    if (!f) return;
    for (let x = 17; x <= 33; x += 2) this.add.image(x * TILE, 16 * TILE - 6, 'icons', ICONS.bunting).setOrigin(0).setDepth(16 * TILE + 20);
    const lamp = f.id === 'trung_thu' ? ICONS.star_lantern : ICONS.lantern;
    if (f.id === 'tet' || f.id === 'trung_thu') {
      for (const [x, y] of [[19, 7], [29, 7], [21, 12], [27, 12], [18, 19], [31, 19], [24, 20], [25, 12]]) {
        const img = this.add.image(x * TILE + 8, y * TILE, 'icons', lamp).setOrigin(0.5, 0).setDepth((y + 1) * TILE + 30);
        this.tweens.add({ targets: img, angle: { from: -6, to: 6 }, duration: 900 + x * 13, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    if (f.id === 'tet') {
      // Hai cây đào, mai trước đình
      const tex = this.textures.get('biome');
      if (tex.has('bigTree')) {
        this.add.image(19 * TILE, 9 * TILE, 'biome', 'bigTree').setOrigin(0).setTint(0xffa8c0).setDepth(9 * TILE + 32);
        this.add.image(28 * TILE, 9 * TILE, 'biome', 'bigTree').setOrigin(0).setTint(0xffe070).setDepth(9 * TILE + 32);
      }
    }
    if (this.state.minutes < f.hours[1]) this.message = `${f.name} (${Math.floor(f.hours[0] / 60)}h–${Math.floor(f.hours[1] / 60)}h): ${f.intro}`;
  }

  private tileOf(w: Walker): Tile {
    return { x: Math.floor(w.sprite.x / TILE), y: Math.floor(w.sprite.y / TILE) };
  }

  private updateWalkers(dt: number) {
    for (const w of this.walkers) {
      const stop = stopAt(this.state, w.def);
      if (stop !== w.target) {
        w.target = stop;
        if (w.hidden) {
          const home = this.pointOf('home', w.def);
          w.sprite.setPosition((home.x + 0.5) * TILE, (home.y + 0.5) * TILE).setVisible(true);
          w.hidden = false;
        }
        w.path = this.findPath(this.tileOf(w), this.pointOf(stop, w.def));
      }
      // Trung Thu: bé Tí rước đèn vòng quanh gốc đa
      if (!w.path.length && w.def.id === 'be_ti' && festivalNow(this.state)?.id === 'trung_thu' && w.target.startsWith('fest')) {
        const loop = [{ x: 26, y: 15 }, { x: 30, y: 15 }, { x: 30, y: 12 }, { x: 26, y: 12 }];
        const next = loop[(this.paradeStep = (this.paradeStep + 1) % loop.length)];
        w.path = this.findPath(this.tileOf(w), next);
        if (!this.lantern) this.lantern = this.add.image(0, 0, 'icons', ICONS.star_lantern).setScale(0.8);
      }
      if (this.lantern && w.def.id === 'be_ti') this.lantern.setPosition(w.sprite.x + 7, w.sprite.y - 14).setDepth(w.sprite.y + 6).setVisible(!w.hidden);
      if (w.path.length) {
        const n = w.path[0];
        const tx = (n.x + 0.5) * TILE, ty = (n.y + 0.5) * TILE;
        const dx = tx - w.sprite.x, dy = ty - w.sprite.y;
        const dist = Math.hypot(dx, dy);
        const step = (NPC_SPEED * dt) / 1000;
        if (dist <= step) {
          w.sprite.setPosition(tx, ty);
          w.path.shift();
        } else {
          w.sprite.x += (dx / dist) * step;
          w.sprite.y += (dy / dist) * step;
        }
        const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        if (dir !== w.dir || !w.sprite.anims.currentAnim?.key.includes('walk')) w.sprite.play(`${w.def.id}-walk-${dir}`);
        w.dir = dir;
      } else if (w.sprite.anims.currentAnim?.key.includes('walk')) {
        w.sprite.play(`${w.def.id}-idle-down`);
        w.dir = 'down';
        if (w.target === 'home') {
          w.hidden = true;
          w.sprite.setVisible(false);
        }
      }
      w.sprite.setDepth(w.sprite.y + 4);
    }
  }

  update(t: number, dt: number) {
    super.update(t, dt);
    if (!this.paused) {
      this.updateWalkers(dt);
      this.updateFolk(dt);
      if (this.guests.length && this.guests[0].sprite.visible !== guestAround(this.state.minutes)) this.showGuests();
    }
  }

  // ---------------------------------------------------------------- tương tác

  private walkerAt(t: Tile) {
    let best: Walker | undefined;
    let bd = 1.3;
    for (const w of this.walkers) {
      if (w.hidden) continue;
      const d = Math.hypot(w.sprite.x / TILE - (t.x + 0.5), w.sprite.y / TILE - (t.y + 0.5));
      if (d < bd) { bd = d; best = w; }
    }
    return best;
  }

  protected interact(t: Tile) {
    const gu = this.guestAt(t);
    if (gu) return this.meetGuest(gu.g);
    const w = this.walkerAt(t);
    if (w) return this.meet(w);
    if (heldRod(this.state, this.selected) && !this.walkable[t.y]?.[t.x] && this.isWaterTile(t)) return this.fish('river');
    const b = this.buildings.find((b) => (b.door ? b.door.x === t.x && b.door.y === t.y : t.x >= b.x && t.x < b.x + b.w && t.y >= b.y && t.y < b.y + b.h));
    if (b) return this.useBuilding(b);
    this.hud.toast('Ở đây không có gì');
  }

  private meet(w: Walker) {
    const npc = w.def;
    const face: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
    w.sprite.play(`${npc.id}-idle-${face[this.ctrl.dir]}`);
    const held = this.state.inventory[this.selected];
    const giftable = held && !['tool', 'machine'].includes(ITEMS[held.item].kind);
    if (giftable) {
      return this.hud.say(npc, `Ơi, ${this.state.npcs[npc.id] ? 'con' : 'chào'}! Có chuyện gì không?`, [
        { label: `Tặng ${ITEMS[held.item].name.toLowerCase()}`, primary: true, fn: () => this.gift(npc) },
        { label: 'Nói chuyện', fn: () => this.chat(npc) },
        { label: 'Thôi', fn: () => {} },
      ], this.state);
    }
    this.chat(npc);
  }

  private chat(npc: NpcDef) {
    const fest = festivalTalk(this.state, npc.id);
    if (fest) {
      this.renderHud();
      return this.hud.say(npc, fest, [{ label: 'Cảm ơn!', primary: true, fn: () => {} }], this.state);
    }
    const r = talk(this.state, npc.id);
    if (r.kind === 'event') {
      this.hud.story(npc, r.event, (love) => {
        const reward = finishEvent(this.state, npc.id, r.event, love);
        this.renderHud();
        return reward;
      });
    } else this.hud.say(npc, r.text, undefined, this.state);
    this.renderHud();
  }

  private gift(npc: NpcDef) {
    const r = giveGift(this.state, npc.id, this.selected);
    if (!r.ok) return this.hud.say(npc, r.reason, undefined, this.state);
    sfx('gift');
    const bday = r.birthday ? '<br><b class="talk__reward">Hôm nay là sinh nhật! Quà được gấp 8 lần.</b>' : '';
    this.hud.say(npc, GIFT_REACTION[r.taste] + bday, undefined, this.state);
    this.renderHud();
  }

  // ---------------------------------------------------------------- khách mời tuần này
  private spawnGuests() {
    weekGuests().forEach((g, i) => {
      const key = `guest-${g.id}`;
      const p = this.points[g.spot] ?? this.points.plaza;
      const place = () => {
        if (!this.anims.exists(`${key}-idle`)) this.anims.create({ key: `${key}-idle`, frames: this.anims.generateFrameNumbers(key, { frames: [0, 1] }), frameRate: 2, repeat: -1 });
        const sprite = this.add.sprite((p.x + 0.5 + (i ? -1.5 : 1.5)) * TILE, (p.y + 0.5) * TILE, key, 0).setOrigin(0.5, 0.62).setDepth((p.y + 1) * TILE).play(`${key}-idle`);
        const star = this.add.text(sprite.x, sprite.y - 22, '★', { fontFamily: 'VT323', fontSize: '12px', color: '#f0c040', resolution: 4 }).setOrigin(0.5).setDepth(9000);
        this.tweens.add({ targets: star, y: star.y - 3, duration: 700, yoyo: true, repeat: -1 });
        sprite.setData('star', star);
        this.guests.push({ g, sprite });
        this.showGuests();
      };
      if (this.textures.exists(key)) return place();
      // Hình khách ghép từ nhân vật gốc (màu + nón + đồ trên mặt riêng), dựng một lần cho cả game
      buildSheet(g.look, 'char').then((c) => {
        if (!this.scene.isActive()) return;
        if (!this.textures.exists(key)) {
          const t = this.textures.addCanvas(key, c)!;
          for (let f = 0; f < 16; f++) t.add(f, 0, (f % 4) * 48, Math.floor(f / 4) * 48, 48, 48);
        }
        place();
      }).catch(() => {});
    });
  }

  /** Khách chỉ ra đứng từ 8h tới 20h. */
  private showGuests() {
    const on = guestAround(this.state.minutes);
    for (const { sprite } of this.guests) {
      sprite.setVisible(on);
      (sprite.getData('star') as Phaser.GameObjects.Text | undefined)?.setVisible(on && !hasCard(session.profile, this.guests.find((x) => x.sprite === sprite)!.g.id));
    }
  }

  private guestAt(t: Tile) {
    return this.guests.find(({ sprite }) => sprite.visible && Math.hypot(sprite.x / TILE - (t.x + 0.5), sprite.y / TILE - (t.y + 0.5)) < 1.3);
  }

  private meetGuest(g: Guest) {
    const p = session.profile;
    const st = guestState(p, g.id);
    const line = g.lines[Math.floor(Math.random() * g.lines.length)];
    if (hasCard(p, g.id)) return this.hud.sayGuest(g, `${line}<br><i>"${g.quote}"</i> — Cảm ơn bạn đã giúp ta nhé!`);
    const q = currentQuest(p, g.id);
    if (!st.accepted) {
      return this.hud.sayGuest(g, `${g.bio}<br><b>Nhờ bạn (${st.step + 1}/3):</b> ${questText(p, g.id)}`, [
        { label: 'Nhận việc', primary: true, fn: () => { acceptGuest(p, g.id); touchProfile(true); sfx('gift'); this.hud.toast(`Đã nhận việc của ${g.name} — xem ở sảnh (Tab → Bộ sưu tập)`); } },
        { label: 'Để sau', fn: () => {} },
      ]);
    }
    if (q?.kind === 'deliver') {
      const have = countItem(this.state, q.item);
      return this.hud.sayGuest(g, `${line}<br><b>Việc ${st.step + 1}/3:</b> ${questText(p, g.id)} · bạn có ${have}`, [
        ...(have >= q.qty ? [{ label: `Giao ${q.qty} ${ITEMS[q.item].name.toLowerCase()}`, primary: true, fn: () => {
          const r = deliverGuest(p, this.state, g.id);
          if (r) { touchProfile(true); sfx('catch'); this.hud.toast(`${g.name}: cảm ơn nhiều! Nhận ${r}`); this.showGuests(); this.renderHud(); }
        } }] : []),
        { label: 'Tạm biệt', fn: () => {} },
      ]);
    }
    this.hud.sayGuest(g, `${line}<br><b>Việc ${st.step + 1}/3:</b> ${questText(p, g.id)}`);
  }

  // ---------------------------------------------------------------- chợ huyện: người đi chợ & chủ tiệm
  private spawnFolk() {
    this.ensureAnims();
    const keepers: [string, number, number][] = [['keeper_may', 2, 0xf2c8d8], ['keeper_deco', 6, 0xc8e8b8], ['keeper_vua', 1, 0xf0d8a0], ['keeper_rap', 4, 0xe0c8f0]];
    for (const [pt, sheet, tint] of keepers) {
      const p = this.points[pt];
      if (!p) continue;
      this.add.sprite((p.x + 0.5) * TILE, (p.y + 0.5) * TILE, 'npcs', sheet * 16).setOrigin(0.5, 0.62).setTint(tint).setDepth((p.y + 1) * TILE).play(`${NPCS[sheet].id}-idle-down`);
    }
    const walks = Object.keys(this.points).filter((k) => k.startsWith('walk_'));
    for (let i = 0; i < 5; i++) {
      const p = this.points[walks[i % walks.length]];
      const n = NPCS[(i * 3 + 1) % NPCS.length];
      const sprite = this.add.sprite((p.x + 0.5) * TILE, (p.y + 0.5) * TILE, 'npcs', n.sheet * 16).setOrigin(0.5, 0.62).setTint([0xd8e8ff, 0xffe0d0, 0xe8ffd8, 0xfff0c0, 0xf0d8ff][i]);
      sprite.play(`${n.id}-idle-down`);
      this.folk.push({ sprite, path: [], wait: 500 + i * 900, key: n.id });
    }
  }

  private updateFolk(dt: number) {
    const walks = Object.keys(this.points).filter((k) => k.startsWith('walk_'));
    for (const f of this.folk) {
      if (!f.path.length) {
        f.wait -= dt;
        if (f.wait > 0) continue;
        const to = this.points[walks[Math.floor(Math.random() * walks.length)]];
        f.path = this.findPath({ x: Math.floor(f.sprite.x / TILE), y: Math.floor(f.sprite.y / TILE) }, to);
        f.wait = 2000 + Math.random() * 4000;
        if (!f.path.length) f.sprite.play(`${f.key}-idle-down`, true);
        continue;
      }
      const n = f.path[0];
      const tx = (n.x + 0.5) * TILE, ty = (n.y + 0.5) * TILE;
      const dx = tx - f.sprite.x, dy = ty - f.sprite.y;
      const dist = Math.hypot(dx, dy);
      const step = (NPC_SPEED * 0.8 * dt) / 1000;
      if (dist <= step) { f.sprite.setPosition(tx, ty); f.path.shift(); if (!f.path.length) f.sprite.play(`${f.key}-idle-down`); }
      else {
        f.sprite.x += (dx / dist) * step;
        f.sprite.y += (dy / dist) * step;
        const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        f.sprite.play(`${f.key}-walk-${dir}`, true);
      }
      f.sprite.setDepth(f.sprite.y + 4);
    }
  }

  private townBuilding(b: Building) {
    const s = this.state;
    const p = session.profile;
    switch (b.name) {
      case 'tiem_may': return this.hud.openTailor(s, p);
      case 'tiem_trang_tri': return this.hud.openDecorShop(s);
      case 'vua_thu_mua': return this.hud.openWholesale(s, this.selected);
      case 'rap_hat': {
        const star = weekGuests()[1];
        if (!showTime(s)) return this.hud.toast(`Rạp hát — tối thứ Bảy (18h–22h) ${star.name} biểu diễn`);
        const r = watchShow(p);
        touchProfile(true);
        return this.hud.theater(star, r?.tem ?? null);
      }
      case 'nha_dan2': return this.hud.openShop(s, 'festival', 'Tiệm tạp hóa · hàng thiết yếu', ['fertilizer', 'hay', 'wood', 'stone', 'rod', 'beehive']);
      default: return this.hud.toast(`${b.label ?? 'Nhà'} — chủ nhà mời bạn chén nước chè`);
    }
  }

  private useBuilding(b: Building) {
    const s = this.state;
    if (b.type === 'cart') return this.openWorldMap();
    if (this.isTown && b.type === 'house') return this.townBuilding(b);
    const fest = festivalNow(s);
    if (b.type === 'stall' && fest?.shop) return this.hud.openShop(s, 'festival', `Sạp ${fest.name}`, fest.shop);
    const shopKey = b.type === 'stall' ? 'market' : (b.name as keyof typeof SHOPS);
    const shop = SHOPS[shopKey];
    if (shop) {
      const owner = NPC[shop.npc];
      if (!shopOpen(s, shopKey)) return this.hud.toast(`${b.label ?? 'Sạp chợ'} đóng cửa — ${owner.name} bán ${shopHours(s, shopKey)}`);
      return this.hud.openShop(s, shop.tab, `${owner.name} · ${owner.role}`);
    }
    if (b.type === 'well') {
      const r = refillCan(s);
      this.hud.toast(r.ok ? 'Đã đổ đầy bình tưới' : r.reason);
      return this.renderHud();
    }
    if (b.type === 'board') return this.hud.openOrders(s);
    if (b.type === 'dock') return this.hud.toast(heldRod(s, this.selected) ? 'Đứng trên cầu tàu, quay mặt ra nước rồi thả câu' : 'Bến sông — cầm cần câu để câu cá');
    if (b.name === 'dinh') return this.hud.openBundles(s, fest?.id === 'tet' ? { label: 'Chơi bầu cua', fn: () => this.hud.openBauCua(s) } : undefined);
    // Nhà dân: gõ cửa, có người ở nhà thì ra nói chuyện
    const owner = NPCS.find((n) => n.home && this.points[n.home] && Math.abs(this.points[n.home].x - b.door!.x) <= 2 && Math.abs(this.points[n.home].y - (b.door!.y + 1)) <= 2);
    if (owner && stopAt(s, owner) === 'home' && s.minutes < 22 * 60) {
      npcState(s, owner.id);
      return this.chat(owner);
    }
    this.hud.toast(`${b.label ?? 'Nhà'} — gõ cửa không ai trả lời`);
  }

  refresh() {
    const tint: Record<Season, number> = { spring: 0xffffff, summer: 0xf6ffdc, fall: 0xffc488, winter: 0xcfdcf2 };
    const c = tint[seasonOf(this.state.day)];
    for (const o of this.tinted) {
      if (o instanceof Phaser.Tilemaps.TilemapLayer) o.forEachTile((t) => (t.tint = c));
      else if (o.active) o.setTint(c);
    }
  }
}
