import Phaser from 'phaser';
import ICONS from '../../assets/Custom/icons.json';
import * as net from '../net/friends';
import { sfx } from '../audio/sound';
import { addItem, cropStage, isRipe, key, removeFromSlot, refillCan, seasonOf, ship, treeMature, unkey, useOnTile, type TileEnv, type UseResult } from './farm';
import { ANIMALS, BUILDINGS, CROPS, isDecor, ITEMS, MACHINES, SOIL_NAME, TRELLIS, NODES, REGROW_DAYS, TREES, type BuildingId, type Season } from '../data';
import { areaTiles, objectReady, placeObject, strike, toolTier, useObject } from './resources';
import { hasGreenhouse, heldRod, isGreenhouseKey } from './activities';
import { giantAt, harvestGiant } from './farming2';
import { animalsIn, capacityOf, collectFish, collectHoney, grazingToday, hearts, isBuilt, ownsWorkingBuffalo, placeBeehive, toggleDoor, touchAnimal } from './animals';
import { critterAt, refreshBubble, spawnCritters, type Critter } from './critters';
import type { Tile } from './player';
import {
  AUTOTILE, buildWorld, decorSize, GRASS_PALETTE, GROUND, MAP_TINT, RED_PALETTE, SAND_PALETTE, soilAt, FENCE_TILE, inCave, inShop, inWell, isTillable, isWater, lotAt, lotDoor, MAP_H, MAP_W, neighborMask, TILE,
  type Decor, type World,
} from './world';
import { recolorGrass } from './RegionScenes';
import { WorldScene } from './WorldScene';

/** Nhân hai màu tint (theo từng kênh). */
const mulColor = (a: number, b: number) => (((((a >> 16) & 255) * ((b >> 16) & 255)) / 255) << 16) | (((((a >> 8) & 255) * ((b >> 8) & 255)) / 255) << 8) | (((a & 255) * (b & 255)) / 255);

const SOIL_HINT = { loam: '', sand: 'hợp khoai, dưa hấu, đậu phộng, bí đao (lớn nhanh hơn)', clay: 'giữ ẩm lâu; hợp khoai môn, lúa, bắp cải', red: 'trồng được cà phê, hồ tiêu' } as const;

export class FarmScene extends WorldScene {
  readonly location = 'farm' as const;
  private world!: World;
  private soil!: Phaser.Tilemaps.TilemapLayer;
  private waterLayer!: Phaser.Tilemaps.TilemapLayer;
  private waterFirst = 0;
  private dirtFirst = 0;
  private cropSprites = new Map<string, Phaser.GameObjects.Image>();
  private pestSprites = new Map<string, Phaser.GameObjects.Image>();
  private giantSprites = new Map<string, Phaser.GameObjects.Image>();
  private softDecor = new Map<string, Phaser.GameObjects.Image>();
  private chest!: Phaser.GameObjects.Sprite;
  private grassLayer!: Phaser.Tilemaps.TilemapLayer;
  private decorImages: Phaser.GameObjects.Image[] = [];
  private treeSprites = new Map<string, Phaser.GameObjects.Container>();
  private hiveSprites = new Map<string, Phaser.GameObjects.Container>();
  private critters: Critter[] = [];
  /** Cây/đá chặt được: mọi ô của vật → vật đó (+ sát thương đã chịu hôm nay). */
  private nodes = new Map<string, { d: Decor; img: Phaser.GameObjects.Image; dmg: number }>();
  private objectSprites = new Map<string, Phaser.GameObjects.Container>();
  private shift!: Phaser.Input.Keyboard.Key;
  private mailboxImg!: Phaser.GameObjects.Image;
  protected outdoor = true;

  constructor() {
    super('farm');
  }

  init(data: Parameters<WorldScene['init']>[0]) {
    super.init(data);
    this.critters = [];
  }

  protected buildMap() {
    this.world = buildWorld(7, this.state.map ?? 'plain');
    this.cropSprites = new Map();
    this.pestSprites = new Map();
    this.giantSprites = new Map();
    this.softDecor = new Map();
    this.treeSprites = new Map();
    this.hiveSprites = new Map();
    this.objectSprites = new Map();
    this.nodes = new Map();
    this.decorImages = [];
    this.shift = this.input.keyboard!.addKey('SHIFT');
    // Ao cá đã xây: lô đất thành nước
    if (this.state.buildings.pond && isBuilt(this.state, 'pond')) {
      const l = BUILDINGS.pond.lot;
      for (let y = l.y; y < l.y + l.h; y++) for (let x = l.x; x < l.x + l.w; x++) { this.world.land[y][x] = false; this.world.blocked[y][x] = true; }
    }
    this.buildGround();
    this.buildBuildings();
    this.buildLots();
    this.buildDecor();
    this.buildChickens();
    const { spawn, house } = this.world;
    const spawns: Record<string, { x: number; y: number; dir?: 'down' | 'left' }> = {
      door: { x: (house.door.x + 0.5) * TILE, y: (house.door.y + 1.7) * TILE, dir: 'down' as const },
      default: { x: (spawn.x + 0.5) * TILE, y: (spawn.y + 0.7) * TILE },
    };
    const { cave } = this.world;
    spawns.cave = { x: (cave.x + 1) * TILE, y: (cave.y + 2.7) * TILE, dir: 'down' };
    const { east, greenhouse: gh } = this.world;
    spawns.cart = { x: (this.world.cart.x + 2.6) * TILE, y: (this.world.cart.y + 0.7) * TILE, dir: 'down' };
    spawns.greenhouse = { x: (gh.x + 2) * TILE, y: (gh.y + gh.h + 0.7) * TILE, dir: 'down' };
    spawns.east = { x: (east.x - 1.5) * TILE, y: (east.y0 + 1) * TILE, dir: 'left' };
    this.exits = [{ x: east.x, y: east.y0, w: 1, h: east.y1 - east.y0 + 1, to: 'village', spawn: 'from_farm' }];
    for (const b of Object.values(BUILDINGS)) {
      const d = lotDoor(b);
      spawns[b.id] = { x: (d.x + 0.5) * TILE, y: (d.y + 1.7) * TILE, dir: 'down' };
    }
    return { blocked: this.world.blocked, spawns };
  }

  // ---------------------------------------------------------------- dựng bản đồ

  private buildGround() {
    const w = this.world;
    const map = this.make.tilemap({ width: MAP_W, height: MAP_H, tileWidth: TILE, tileHeight: TILE });
    const water = map.addTilesetImage('water', 'water', TILE, TILE, 0, 0, 1)!;
    // Cỏ theo bản đồ + bãi cát + đất đỏ: đổi màu tileset cỏ lúc chạy
    const pal = GRASS_PALETTE[this.state.map ?? 'plain'];
    const grassKey = pal ? recolorGrass(this, `grass-${this.state.map}`, pal[0], pal[1]) : 'grass';
    const grass = map.addTilesetImage(grassKey, grassKey, TILE, TILE, 0, 0, 100)!;
    const sandKey = recolorGrass(this, 'sand', ...SAND_PALETTE);
    const redKey = recolorGrass(this, 'reddirt', ...RED_PALETTE);
    const grounds = [grass, map.addTilesetImage(sandKey, sandKey, TILE, TILE, 0, 0, 700)!, map.addTilesetImage(redKey, redKey, TILE, TILE, 0, 0, 900)!];
    const dirt = map.addTilesetImage('dirt', 'dirt', TILE, TILE, 0, 0, 300)!;
    const fences = map.addTilesetImage('fences', 'fences', TILE, TILE, 0, 0, 500)!;
    this.waterFirst = water.firstgid;
    this.dirtFirst = dirt.firstgid;

    this.waterLayer = map.createBlankLayer('water', water)!.setDepth(0);
    this.waterLayer.fill(water.firstgid);
    const grassLayer = map.createBlankLayer('grass', grounds)!.setDepth(1);
    this.grassLayer = grassLayer;
    this.soil = map.createBlankLayer('soil', dirt)!.setDepth(2);
    const fenceLayer = map.createBlankLayer('fence', fences)!.setDepth(3);

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (w.land[y][x]) {
          const m = neighborMask(w.land, x, y);
          const idx = m === 15 && w.grassVariant[y][x] >= 0 ? w.grassVariant[y][x] : AUTOTILE[m];
          grassLayer.putTileAt(grounds[w.ground[y][x] ?? GROUND.grass].firstgid + idx, x, y);
        }
        if (w.fence[y][x]) fenceLayer.putTileAt(fences.firstgid + FENCE_TILE[neighborMask(w.fence, x, y)], x, y);
      }
    }
    let frame = 0;
    this.time.addEvent({
      delay: 280, loop: true, callback: () => {
        frame = (frame + 1) % 4;
        this.waterLayer.forEachTile((t) => (t.index = this.waterFirst + frame));
      },
    });
  }

  private buildBuildings() {
    const { house, bin, shop, well } = this.world;
    const px = house.x * TILE;
    const py = house.y * TILE;
    const roofRows = [[17, 18, 19, 19, 20], [24, 25, 26, 26, 27], [31, 32, 33, 33, 34]];
    const front = [[13, 1, 13, 1, 13], [11, 11, 11, 11, 12]];
    const baseDepth = (house.y + house.h) * TILE;
    // Nền tối sau cửa sổ để kính không lộ cỏ phía sau
    this.add.rectangle(px, py + 3 * TILE, house.w * TILE, 2 * TILE, 0x5b3b33).setOrigin(0).setDepth(baseDepth - 1);
    roofRows.forEach((row, r) => row.forEach((f, c) => this.add.image(px + c * TILE, py + r * TILE, 'roof', f).setOrigin(0).setDepth(baseDepth)));
    front.forEach((row, r) => row.forEach((f, c) => this.add.image(px + c * TILE, py + (3 + r) * TILE, 'walls', f).setOrigin(0).setDepth(baseDepth)));
    this.add.image(house.door.x * TILE, house.door.y * TILE, 'doors', 1).setOrigin(0).setDepth(baseDepth + 1);

    this.chest = this.add.sprite(bin.x * TILE + TILE / 2, bin.y * TILE + TILE, 'chest', 0).setOrigin(0.5, 0.78).setDepth((bin.y + 1) * TILE);
    if (!this.anims.exists('chest-open')) {
      this.anims.create({ key: 'chest-open', frames: this.anims.generateFrameNumbers('chest', { start: 0, end: 4 }), frameRate: 18 });
    }
    this.add.image(shop.x * TILE, shop.y * TILE, 'shop').setOrigin(0).setDepth((shop.y + 3) * TILE);
    this.add.image(well.x * TILE, well.y * TILE, 'well').setOrigin(0).setDepth((well.y + 2) * TILE);
    const { cave, mailbox, greenhouse: gh, cart } = this.world;
    this.add.image(cart.x * TILE, cart.y * TILE - 8, 'cart').setOrigin(0).setDepth((cart.y + 1) * TILE);
    if (hasGreenhouse(this.state)) {
      this.add.image((gh.x + gh.w / 2) * TILE, (gh.y + gh.h) * TILE, 'greenhouse').setOrigin(0.5, 1).setDepth((gh.y + gh.h) * TILE);
      // Nhà kính mới xây: dọn đất đá bên dưới
      for (let y = gh.y; y < gh.y + gh.h; y++) for (let x = gh.x; x < gh.x + gh.w; x++) {
        const k = key(x, y);
        delete this.state.tilled[k]; delete this.state.crops[k]; delete this.state.trees[k]; delete this.state.objects[k]; delete this.state.beehives[k];
        this.world.blocked[y][x] = true;
      }
    }
    this.mailboxImg = this.add.image(mailbox.x * TILE + 8, (mailbox.y + 1) * TILE, 'icons', 0).setOrigin(0.5, 1).setDepth((mailbox.y + 1) * TILE);
    // Biển chỉ đường sang làng
    this.add.text((this.world.east.x - 2) * TILE, (this.world.east.y0 - 0.2) * TILE, 'Làng →', { fontFamily: 'VT323', fontSize: '10px', color: '#fff4e0', backgroundColor: '#5e4032', padding: { x: 2, y: 0 }, resolution: 4 })
      .setOrigin(0.5, 1).setDepth((this.world.east.y0 + 1) * TILE);
    this.add.image(cave.x * TILE, cave.y * TILE, 'cave').setOrigin(0).setDepth((cave.y + 2) * TILE);
  }

  /** Chuồng trại trên lô đất: đã xây → hình chuồng; đang xây → biển báo; chưa mua → để trống. */
  private buildLots() {
    const tex: Partial<Record<BuildingId, string>> = { coop: 'chickenhouse', barn: 'barn', shed: 'shed' };
    for (const b of Object.values(BUILDINGS)) {
      const bd = this.state.buildings[b.id];
      if (!bd) continue;
      const { x, y, w, h } = b.lot;
      const baseDepth = (y + h) * TILE;
      if (bd.readyDay > this.state.day) {
        this.add.rectangle(x * TILE, y * TILE, w * TILE, h * TILE, 0x8a6a3a, 0.35).setOrigin(0).setStrokeStyle(1, 0x5e4032).setDepth(3);
        this.add.text((x + w / 2) * TILE, (y + h / 2) * TILE, 'Đang xây', { fontFamily: 'VT323', fontSize: '12px', color: '#3b2a2e', resolution: 4 }).setOrigin(0.5).setDepth(baseDepth);
      } else if (b.id !== 'pond') {
        this.add.image((x + w / 2) * TILE, (y + h) * TILE, tex[b.id]!).setOrigin(0.5, 1).setDepth(baseDepth);
      }
      if (b.id !== 'pond') for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.world.blocked[yy][xx] = true;
    }
  }

  private buildDecor() {
    // Tán cây nhiều ô: cắt thêm frame từ Basic_Grass_Biom_things.png (một lần cho cả game)
    const tex = this.textures.get('biome');
    if (!tex.has('bigTree')) {
      tex.add('bigTree', 0, 16, 0, 32, 32);
      tex.add('fruitTree', 0, 48, 0, 32, 32);
      tex.add('smallTree', 0, 0, 0, 16, 32);
      tex.add('sunflower', 0, 128, 32, 16, 32);
    }
    const tall = new Set(['bigTree', 'fruitTree', 'smallTree', 'sunflower']);
    const single: Record<string, number> = { rock: 16, bigRock: 17, bush: 28, berryBush: 27, stump: 22 };
    const s = this.state;
    const occupied = (x: number, y: number) => {
      const k = key(x, y);
      return !!(s.tilled[k] || s.crops[k] || s.trees[k] || s.objects[k] || s.beehives[k]);
    };
    for (const d of this.world.decor) {
      const [w, h] = decorSize(d.kind);
      const dk = key(d.x, d.y);
      if ('frame' in d && s.tilled[dk]) continue;
      if (s.cleared[dk] !== undefined) {
        // Đã chặt: đủ ngày và chỗ còn trống thì mọc lại, không thì để trống (bỏ chặn đường)
        let free = s.day - s.cleared[dk] >= REGROW_DAYS;
        for (let yy = d.y; yy < d.y + h; yy++) for (let xx = d.x; xx < d.x + w; xx++) if (occupied(xx, yy)) free = false;
        const px = this.state.player;
        if (Math.floor(px.x / TILE) >= d.x && Math.floor(px.x / TILE) < d.x + w && Math.floor(px.y / TILE) >= d.y && Math.floor(px.y / TILE) < d.y + h) free = false;
        if (!free) {
          for (let yy = d.y; yy < d.y + h; yy++) for (let xx = d.x; xx < d.x + w; xx++) this.world.blocked[yy][xx] = false;
          continue;
        }
        delete s.cleared[dk];
      }
      let img: Phaser.GameObjects.Image;
      if (tall.has(d.kind)) img = this.add.image(d.x * TILE, d.y * TILE, 'biome', d.kind).setOrigin(0);
      else if ('frame' in d) {
        img = this.add.image(d.x * TILE, d.y * TILE, 'biome', d.frame).setOrigin(0);
        this.softDecor.set(key(d.x, d.y), img);
      } else img = this.add.image(d.x * TILE, d.y * TILE, 'biome', single[d.kind]).setOrigin(0);
      img.setDepth('frame' in d ? 2.5 : (d.y + (tall.has(d.kind) ? 2 : 1)) * TILE);
      if (d.tint) img.setData('tint', d.tint);
      this.decorImages.push(img);
      if (NODES[d.kind]) {
        const node = { d, img, dmg: 0 };
        for (let yy = d.y; yy < d.y + h; yy++) for (let xx = d.x; xx < d.x + w; xx++) this.nodes.set(key(xx, yy), node);
      }
    }
  }

  private buildChickens() {
    if (!this.anims.exists('chicken-idle')) {
      this.anims.create({ key: 'chicken-idle', frames: this.anims.generateFrameNumbers('chicken', { frames: [0, 1] }), frameRate: 2, repeat: -1 });
      this.anims.create({ key: 'chicken-walk', frames: this.anims.generateFrameNumbers('chicken', { frames: [4, 5, 6, 7] }), frameRate: 8, repeat: -1 });
    }
    for (let i = 0; i < 3; i++) {
      const c = this.add.sprite((20 + i * 2) * TILE, (3 + i) * TILE, 'chicken', 0).play('chicken-idle');
      const wander = () => {
        const tx = Phaser.Math.Clamp(c.x + Phaser.Math.Between(-40, 40), 19 * TILE, 26 * TILE);
        const ty = Phaser.Math.Clamp(c.y + Phaser.Math.Between(-24, 24), 2 * TILE, 6 * TILE);
        c.setFlipX(tx > c.x);
        c.play('chicken-walk');
        this.tweens.add({
          targets: c, x: tx, y: ty, duration: Phaser.Math.Distance.Between(c.x, c.y, tx, ty) * 40,
          onUpdate: () => c.setDepth(c.y + 4),
          onComplete: () => { c.play('chicken-idle'); this.time.delayedCall(Phaser.Math.Between(1500, 5000), wander); },
        });
      };
      this.time.delayedCall(Phaser.Math.Between(500, 3000), wander);
    }
  }

  // ---------------------------------------------------------------- tương tác

  /** Ở nông trại bạn: chỉ tưới giúp (1 lần/ngày), để quà ở hòm thư, ra cửa nhà để về. */
  private visitInteract(t: Tile) {
    const v = this.visit!;
    const { house, mailbox } = this.world;
    if (t.x === house.door.x && t.y === house.door.y) return this.leaveVisit();
    const held = this.state.inventory[this.selected];
    if (t.x === mailbox.x && t.y === mailbox.y) {
      if (!held || ['tool', 'machine'].includes(ITEMS[held.item].kind)) return this.hud.toast('Cầm món muốn tặng rồi bấm vào hòm thư');
      const item = held.item;
      const qty = Math.min(held.qty, 99);
      return this.hud.choose('Để quà', `Bỏ ${qty} ${ITEMS[item].name.toLowerCase()} vào hòm thư của ${v.name}?`, [
        { label: 'Gửi', primary: true, fn: () => {
          net.sendGift(v.code, item, qty).then(() => {
            const slot = this.state.inventory.findIndex((x) => x?.item === item);
            if (slot >= 0) removeFromSlot(this.state, slot, qty);
            this.hud.toast(`Đã để ${qty} ${ITEMS[item].name.toLowerCase()} cho ${v.name}`);
            this.renderHud();
          }).catch((e) => this.hud.toast((e as Error).message));
        } },
        { label: 'Thôi', fn: () => {} },
      ]);
    }
    const k = key(t.x, t.y);
    const crop = this.state.crops[k];
    if (held?.item === 'can' && this.state.tilled[k]) {
      if (v.helped) return this.hud.toast(`Hôm nay đã tưới giúp ${v.name} rồi — mai quay lại nhé`);
      if (crop && isRipe(crop)) return this.hud.toast('Cây chín rồi, để bạn tự hái nhé');
      const r = useOnTile(this.state, this.selected, t.x, t.y, { tillable: false, nearWater: false });
      if (!r.ok) return this.hud.toast(r.reason);
      this.helpedTiles.add(k);
      return this.ctrl.playTool('water', () => { this.refresh(); this.renderHud(); this.hud.toast(`Đã tưới ${this.helpedTiles.size} ô — về nhà sẽ gửi cho ${v.name}`); });
    }
    if (crop && isRipe(crop)) return this.hud.toast('Không hái trộm nhé!');
    this.hud.toast(`Nông trại của ${v.name}: dùng bình tưới để tưới giúp, để quà ở hòm thư, ra cửa nhà để về`);
  }

  protected interact(t: Tile) {
    if (this.visit) return this.visitInteract(t);
    const { house, bin } = this.world;
    if (t.x === house.door.x && t.y === house.door.y) return this.travel('house', 'door');
    if (inCave(this.world, t.x, t.y)) return this.travel('mine', 'entry');
    const tk = key(t.x, t.y);
    if (this.state.objects[tk]) return this.interactObject(t);
    const gk = giantAt(this.state, t.x, t.y);
    if (gk) {
      const r = harvestGiant(this.state, gk, this.selected);
      if (!r.ok) return this.hud.toast(r.reason);
      return this.ctrl.playTool('axe', () => {
        for (let i = 0; i < 4; i++) this.time.delayedCall(i * 90, () => this.popItem(t, r.item));
        this.hud.toast(`Bổ được ${r.qty} ${ITEMS[r.item].name.toLowerCase()} (bạc)!`);
        this.refresh();
        this.renderHud();
      });
    }
    const node = this.nodes.get(tk);
    const heldNow = this.state.inventory[this.selected]?.item;
    if (node && (heldNow === 'axe' || heldNow === 'pickaxe')) return this.hitNode(t, node);
    if (heldNow && (heldNow in MACHINES || isDecor(heldNow))) {
      const r = placeObject(this.state, this.selected, t.x, t.y, isTillable(this.world, t.x, t.y) && !node);
      this.hud.toast(r.ok ? `Đã đặt ${ITEMS[heldNow].name.toLowerCase()}${isDecor(heldNow) ? ' — nông trại đẹp hơn' : ` — ${MACHINES[heldNow as keyof typeof MACHINES].info}`}` : r.reason);
      this.refresh();
      return this.renderHud();
    }
    const crit = critterAt(this.critters, t.x, t.y);
    if (crit) return this.touchCritter(crit);
    const lot = lotAt(t.x, t.y);
    if (lot) return this.interactLot(lot.id);
    const hiveKey = key(t.x, t.y);
    if (this.state.beehives[hiveKey]) {
      const r = collectHoney(this.state, hiveKey);
      if (r.ok) this.popItem(t, r.item!);
      this.hud.toast(r.ok ? `Lấy được ${ITEMS[r.item!].name.toLowerCase()}` : r.reason);
      this.refresh();
      return this.renderHud();
    }
    if (this.state.inventory[this.selected]?.item === 'beehive') {
      const r = placeBeehive(this.state, this.selected, t.x, t.y, isTillable(this.world, t.x, t.y));
      this.hud.toast(r.ok ? 'Đã đặt tổ ong — 4 ngày ra mật, gần hoa thì ra mật hoa' : r.reason);
      this.refresh();
      return this.renderHud();
    }
    if (t.x === this.world.mailbox.x && t.y === this.world.mailbox.y) return this.openMailbox();
    if (t.y === this.world.cart.y && (t.x === this.world.cart.x || t.x === this.world.cart.x + 1)) return this.openWorldMap();
    const gh = this.world.greenhouse;
    if (hasGreenhouse(this.state) && t.x >= gh.x && t.x < gh.x + gh.w && t.y >= gh.y && t.y < gh.y + gh.h) return this.travel('greenhouse', 'door');
    if (heldRod(this.state, this.selected) && isWater(this.world, t.x, t.y)) {
      const pond = ((t.x + 0.5 - 40) / 4.6) ** 2 + ((t.y + 0.5 - 26) / 3.4) ** 2 < 1 || !!lotAt(t.x, t.y);
      return this.fish(pond ? 'pond' : 'sea');
    }
    if (inShop(this.world, t.x, t.y)) return this.hud.toast('Quầy cũ đã dời ra chợ làng — bà Tư bán hạt ở chợ (đi về phía đông)');
    if (inWell(this.world, t.x, t.y) || isWater(this.world, t.x, t.y)) {
      const r = refillCan(this.state);
      this.hud.toast(r.ok ? 'Đã đổ đầy bình tưới' : r.reason);
      return this.renderHud();
    }
    if (t.x === bin.x && t.y === bin.y) {
      const r = ship(this.state, this.selected);
      if (r.ok) {
        this.chest.play('chest-open');
        sfx('coin');
        this.time.delayedCall(500, () => this.chest.playReverse('chest-open'));
        this.hud.toast(`Đã bỏ ${r.qty} ${ITEMS[r.item!].name} vào thùng — nhận tiền sáng mai`);
        this.renderHud();
      } else this.hud.toast(r.reason);
      return;
    }
    const held = this.state.inventory[this.selected]?.item;
    // Giữ Shift với cuốc/bình đã nâng cấp: tác dụng cả vùng
    const area = (held === 'hoe' || held === 'can') && this.shift.isDown ? areaTiles(toolTier(this.state, held), t, this.ctrl.dir) : [t];
    let r: UseResult = { ok: false, reason: '' };
    let done = 0;
    for (const tt of area) {
      const rr = useOnTile(this.state, this.selected, tt.x, tt.y, this.envAt(tt.x, tt.y));
      if (tt === t || (!r.ok && rr.ok)) r = rr;
      if (rr.ok) {
        done++;
        if (rr.action === 'till') this.softDecor.get(key(tt.x, tt.y))?.destroy();
      }
      if (rr.ok && rr.action === 'till' && tt === t) {
        const soil = this.state.tilled[key(t.x, t.y)]?.soil;
        if (soil) this.hud.toast(`${SOIL_NAME[soil]} — ${SOIL_HINT[soil]}`);
      }
      if (rr.ok && rr.action === 'pest' && tt === t) this.hud.toast('Bắt được sâu! Cây lớn tiếp từ mai');
    }
    if (!r.ok) return this.hud.toast(r.reason);
    if (area.length > 1) this.hud.toast(`${held === 'hoe' ? 'Cuốc' : 'Tưới'} ${done} ô`);
    // Có trâu khỏe: cuốc một lần được cả 3×3 ô
    if (r.action === 'till' && held === 'hoe' && ownsWorkingBuffalo(this.state)) {
      const energy = this.state.energy;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const x = t.x + dx, y = t.y + dy;
        if (useOnTile(this.state, this.selected, x, y, this.envAt(x, y)).ok) this.softDecor.get(key(x, y))?.destroy();
      }
      this.state.energy = energy;
    }
    const finish = () => {
      if (r.action === 'harvest') this.popItem(t, r.item!);
      this.refresh();
      this.renderHud();
    };
    const anim = r.action === 'till' ? 'hoe' : r.action === 'water' ? 'water' : null;
    if (anim && (held === 'hoe' || held === 'can')) this.ctrl.playTool(anim, finish);
    else finish();
  }

  /** Ô (x,y) cuốc/trồng được không, có sát nước không. */
  private envAt(x: number, y: number): TileEnv {
    const k = key(x, y);
    const nearWater = this.nearWater(x, y);
    // Ô sát mép ao bình thường không cuốc được (bờ cỏ), nhưng được đào thành ruộng nước
    const onLand = !isWater(this.world, x, y) && !this.world.blocked[y]?.[x];
    const free = !this.state.objects[k] && !this.state.beehives[k] && !this.state.trees[k] && !this.nodes.has(k);
    return { tillable: free && (isTillable(this.world, x, y) || (onLand && nearWater)) && !giantAt(this.state, x, y), nearWater, soil: soilAt(x, y, this.state.map ?? 'plain') };
  }

  private hitNode(t: Tile, node: { d: Decor; img: Phaser.GameObjects.Image; dmg: number }) {
    const r = strike(this.state, this.selected, node.d.kind, node.dmg);
    if (!r.ok) return this.hud.toast(r.reason);
    const anim = NODES[node.d.kind].tool === 'axe' ? 'axe' : 'hoe';
    this.ctrl.playTool(anim, () => {
      if (!r.broke) {
        node.dmg = NODES[node.d.kind].hp - r.hp;
        this.tweens.add({ targets: node.img, x: node.img.x + 1.5, duration: 45, yoyo: true, repeat: 2 });
      } else {
        const { d } = node;
        const [w, h] = decorSize(d.kind);
        this.state.cleared[key(d.x, d.y)] = this.state.day;
        for (let yy = d.y; yy < d.y + h; yy++) for (let xx = d.x; xx < d.x + w; xx++) {
          this.nodes.delete(key(xx, yy));
          this.world.blocked[yy][xx] = false;
          this.ctrl.setBlocked(xx, yy, false);
        }
        this.tweens.add({ targets: node.img, alpha: 0, duration: 250, onComplete: () => node.img.destroy() });
        r.drops.forEach(([item], i) => this.time.delayedCall(i * 120, () => this.popItem(t, item)));
        this.hud.toast(`Được ${r.drops.map(([it, n]) => `${n} ${ITEMS[it].name.toLowerCase()}`).join(', ')}`);
      }
      this.renderHud();
    }, anim === 'axe' ? 'axe' : 'pick');
  }

  private interactObject(t: Tile) {
    const k = key(t.x, t.y);
    const r = useObject(this.state, k, this.selected);
    if (!r.ok) return this.hud.toast(r.reason);
    if (r.action === 'open') return this.hud.openStorage(this.state, k);
    const name = ITEMS[r.item].name.toLowerCase();
    const msg = { collect: `Lấy được ${name}`, load: `Đã bỏ ${r.qty} nguyên liệu — đang làm ${name}`, pickup: `Đã nhặt ${name} lên`, mill: `Xay được ${r.qty} ${name}` }[r.action];
    this.hud.toast(msg);
    if (r.action === 'collect' || r.action === 'mill') this.popItem(t, r.item);
    this.refresh();
    this.renderHud();
  }

  private openMailbox() {
    const box = this.state.mailbox;
    if (!box.length) return this.hud.toast('Hòm thư trống');
    const got: string[] = [];
    while (box.length) {
      const m = box[0];
      if (!addItem(this.state, m.item, m.qty)) break;
      got.push(`${m.qty} ${ITEMS[m.item].name.toLowerCase()} (từ ${m.from})`);
      box.shift();
    }
    this.hud.toast(got.length ? `Nhận ${got.join(', ')}${box.length ? ' — túi đầy, còn quà trong hòm' : ''}` : 'Túi đồ đầy');
    this.refresh();
    this.renderHud();
  }

  private refreshObjects() {
    for (const [k, c] of this.objectSprites) {
      c.destroy();
      if (!this.state.objects[k]) {
        const [x, y] = unkey(k);
        this.ctrl?.setBlocked(x, y, false);
      }
    }
    this.objectSprites.clear();
    for (const [k, o] of Object.entries(this.state.objects)) {
      const [x, y] = unkey(k);
      const cont = this.add.container(0, 0).setDepth((y + 1) * TILE);
      cont.add(this.add.image(x * TILE + 8, (y + 1) * TILE, 'icons', ITEMS[o.kind].icon[1]).setOrigin(0.5, 1));
      if (o.out) {
        const ready = objectReady(this.state, o);
        const [tex, fr] = ITEMS[o.out].icon;
        const bubble = this.add.image(x * TILE + 8, y * TILE - 5, tex, fr).setScale(0.6).setAlpha(ready ? 1 : 0.45);
        cont.add(bubble);
        if (ready) this.tweens.add({ targets: bubble, y: bubble.y - 2, duration: 500, yoyo: true, repeat: -1 });
      }
      this.objectSprites.set(k, cont);
      this.ctrl?.setBlocked(x, y, true);
    }
  }

  /** Ô sát ao, hoặc sát một ô ruộng nước khác → cuốc ra ruộng nước. */
  private nearWater(x: number, y: number) {
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isWater(this.world, x + dx, y + dy) || this.state.tilled[key(x + dx, y + dy)]?.paddy);
  }

  // ---------------------------------------------------------------- vẽ lại theo trạng thái

  private interactLot(b: BuildingId) {
    const def = BUILDINGS[b];
    const bd = this.state.buildings[b];
    if (!bd) return this.hud.toast(`Lô đất cho ${def.name.toLowerCase()} — mua ở quầy, tab "Chuồng trại"`);
    if (bd.readyDay > this.state.day) return this.hud.toast(`${def.name} đang xây, mai xong`);
    if (b === 'pond') {
      const r = collectFish(this.state);
      this.hud.toast(r.ok ? `Bắt được ${r.qty} con cá` : r.reason);
      return this.renderHud();
    }
    const n = animalsIn(this.state, b).length;
    this.hud.choose(def.name, `${n}/${capacityOf(this.state, b)} con · máng còn ${bd.hay} phần cỏ khô · cửa đang ${bd.open ? 'mở' : 'đóng'}`, [
      { label: 'Vào trong', primary: true, fn: () => this.travel(b, 'door') },
      { label: bd.open ? 'Đóng cửa chuồng' : 'Mở cửa (thả ra đồng)', fn: () => {
        const open = toggleDoor(this.state, b);
        this.hud.toast(open ? 'Đã mở cửa — ngày nắng thú sẽ ra đồng ăn cỏ (không tốn cỏ khô)' : 'Đã đóng cửa chuồng');
        this.scene.restart({ state: this.state, hud: this.hud, spawn: b });
      } },
      { label: 'Thôi', fn: () => {} },
    ]);
  }

  private touchCritter(c: Critter) {
    const r = touchAnimal(this.state, c.animal.id);
    if (!r.ok) return this.hud.toast(r.reason);
    sfx(ANIMALS[r.animal.kind].home === 'coop' ? 'cluck' : 'moo');
    const def = ANIMALS[r.animal.kind];
    const parts = [`${r.animal.name} (${def.name.toLowerCase()}) · ${hearts(r.animal)}/10 tim`];
    if (r.item) {
      parts.unshift(`Lấy được ${ITEMS[r.item].name.toLowerCase()}`);
      this.popItem({ x: Math.floor(c.sprite.x / TILE), y: Math.floor(c.sprite.y / TILE) - 1 }, r.item);
    } else if (r.petted) parts.unshift('Vuốt ve');
    this.hud.toast(parts.join(' · '));
    refreshBubble(this, c);
    this.renderHud();
  }

  /** Ngày nắng mở cửa chuồng: thú ra bãi cỏ cạnh chuồng. */
  private spawnGrazers() {
    for (const c of this.critters) { c.sprite.destroy(); c.bubble?.destroy(); }
    this.critters = [];
    if (this.state.minutes >= 18 * 60) return;
    for (const b of ['coop', 'barn', 'shed'] as const) {
      if (!isBuilt(this.state, b) || !grazingToday(this.state, b)) continue;
      const l = BUILDINGS[b].lot;
      const area = { x0: (l.x + l.w + 0.8) * TILE, y0: (l.y + 0.8) * TILE, x1: (l.x + l.w + 4.5) * TILE, y1: (l.y + l.h + 0.5) * TILE };
      this.critters.push(...spawnCritters(this, animalsIn(this.state, b), area));
    }
  }

  private refreshHives() {
    for (const [k, c] of this.hiveSprites) if (!this.state.beehives[k]) { c.destroy(); this.hiveSprites.delete(k); }
    for (const [k, h] of Object.entries(this.state.beehives)) {
      const [x, y] = unkey(k);
      this.hiveSprites.get(k)?.destroy();
      const cont = this.add.container(0, 0).setDepth((y + 1) * TILE);
      cont.add(this.add.image(x * TILE + 8, (y + 1) * TILE, 'icons', ITEMS.beehive.icon[1]).setOrigin(0.5, 1));
      if (h.honey) cont.add(this.add.image(x * TILE + 8, y * TILE - 4, 'icons', ITEMS.honey.icon[1]).setScale(0.6));
      this.hiveSprites.set(k, cont);
      this.ctrl?.setBlocked(x, y, true);
    }
  }

  refresh() {
    this.refreshSeason();
    this.refreshSoil();
    this.refreshCrops();
    this.refreshGiants();
    this.refreshTrees();
    this.refreshHives();
    this.refreshObjects();
    this.mailboxImg.setFrame(ICONS[this.state.mailbox.length ? 'mailbox_full' : 'mailbox']);
    if (this.critters.length === 0) this.spawnGrazers();
    else for (const c of this.critters) refreshBubble(this, c);
  }

  private refreshSeason() {
    const tint: Record<Season, number> = { spring: 0xffffff, summer: 0xf6ffdc, fall: 0xffc488, winter: 0xcfdcf2 };
    const t = mulColor(tint[seasonOf(this.state.day)], MAP_TINT[this.state.map ?? 'plain']);
    this.grassLayer.forEachTile((tile) => (tile.tint = t));
    for (const img of this.decorImages) if (img.active) img.setTint(img.getData('tint') ? mulColor(t, img.getData('tint')) : t);
  }

  private refreshTrees() {
    for (const [k, c] of this.treeSprites) {
      if (!this.state.trees[k]) {
        c.destroy();
        this.treeSprites.delete(k);
        const [x, y] = unkey(k);
        this.ctrl?.setBlocked(x, y, false);
      }
    }
    for (const [k, t] of Object.entries(this.state.trees)) {
      const [x, y] = unkey(k);
      this.treeSprites.get(k)?.destroy();
      const cx = x * TILE + TILE / 2;
      const by = (y + 1) * TILE;
      const cont = this.add.container(0, 0).setDepth(by);
      const def = TREES[t.id];
      if (treeMature(t)) {
        cont.add(this.add.image(cx, by, 'biome', 'bigTree').setOrigin(0.5, 1));
        const spots = [[-7, -22], [5, -18], [-1, -27]];
        for (let i = 0; i < t.fruit; i++) {
          const [fx, fy] = spots[i];
          cont.add(this.add.image(cx + fx, by + fy, ITEMS[def.fruit].icon[0], ITEMS[def.fruit].icon[1]).setScale(0.55));
        }
      } else if (t.age >= def.grow / 3) {
        cont.add(this.add.image(cx, by, 'biome', 'smallTree').setOrigin(0.5, 1));
      } else {
        cont.add(this.add.image(cx, by, 'biome', 15).setOrigin(0.5, 1));
      }
      this.treeSprites.set(k, cont);
      this.ctrl?.setBlocked(x, y, true);
    }
  }

  private refreshSoil() {
    const tilled: boolean[][] = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));
    const outdoor = Object.entries(this.state.tilled).filter(([k]) => !isGreenhouseKey(k));
    for (const [k] of outdoor) {
      const [x, y] = k.split(',').map(Number);
      tilled[y][x] = true;
    }
    this.soil.fill(-1);
    for (const [k, t] of outdoor) {
      const [x, y] = k.split(',').map(Number);
      const tile = this.soil.putTileAt(this.dirtFirst + AUTOTILE[neighborMask(tilled, x, y)], x, y);
      const dry = t.soil === 'sand' ? 0xf8e4a8 : t.soil === 'clay' ? 0xb8a8b4 : t.soil === 'red' ? 0xf08868 : t.fert ? 0xd8c8a8 : 0xffffff;
      const wet = t.soil === 'red' ? 0xa05040 : t.soil === 'sand' ? 0xb09060 : 0x8a6a5a;
      tile.tint = t.paddy ? 0x78a8bc : t.watered ? wet : dry;
    }
  }

  private refreshGiants() {
    for (const [k, img] of this.giantSprites) if (!this.state.giants[k]) {
      img.destroy();
      this.giantSprites.delete(k);
      const [x, y] = unkey(k);
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) this.ctrl?.setBlocked(x + dx, y + dy, false);
    }
    for (const [k, g] of Object.entries(this.state.giants)) {
      if (this.giantSprites.has(k)) continue;
      const [x, y] = unkey(k);
      const [tex, fr] = ITEMS[CROPS[g.id].harvest].icon;
      const img = this.add.image((x + 1.5) * TILE, (y + 3) * TILE, tex, fr).setOrigin(0.5, 1).setScale(3).setDepth((y + 3) * TILE);
      this.giantSprites.set(k, img);
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) this.ctrl?.setBlocked(x + dx, y + dy, true);
    }
  }

  private refreshCrops() {
    for (const [k, img] of this.cropSprites) {
      if (!this.state.crops[k]) {
        img.destroy();
        this.cropSprites.delete(k);
        const [x, y] = unkey(k);
        this.ctrl?.setBlocked(x, y, false);
      }
    }
    for (const [k, p] of this.pestSprites) if (!this.state.crops[k]?.pest) { p.destroy(); this.pestSprites.delete(k); }
    for (const [k, c] of Object.entries(this.state.crops)) {
      if (isGreenhouseKey(k)) continue;
      const [x, y] = k.split(',').map(Number);
      const def = CROPS[c.id];
      const frame = def.frames[cropStage(c)];
      let img = this.cropSprites.get(k);
      if (!img) {
        img = this.add.image(x * TILE + TILE / 2, (y + 1) * TILE, def.sheet, frame).setOrigin(0.5, 1).setDepth((y + 1) * TILE - 1);
        this.cropSprites.set(k, img);
      }
      img.setFrame(frame);
      if (def.tint) img.setTint(def.tint);
      // Cây leo giàn: không đi xuyên qua được
      if (TRELLIS.has(c.id)) this.ctrl?.setBlocked(x, y, true);
      if (c.pest && !this.pestSprites.has(k)) {
        const bug = this.add.image(x * TILE + 10, y * TILE + 2, 'icons', ICONS.pest).setScale(0.85).setDepth((y + 1) * TILE + 1);
        this.tweens.add({ targets: bug, x: bug.x - 3, duration: 500, yoyo: true, repeat: -1 });
        this.pestSprites.set(k, bug);
      }
      // Cây chín nhún nhẹ để người chơi thấy
      if (isRipe(c) && !img.getData('bob')) {
        img.setData('bob', this.tweens.add({ targets: img, scaleY: 1.08, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
      }
    }
  }
}
