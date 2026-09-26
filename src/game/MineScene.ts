import Phaser from 'phaser';
import { has } from './skills';
import { ITEMS, NODES } from '../data';
import { addItem, countItem, key, seeded } from './farm';
import type { Tile } from './player';
import { mineBroken, mineRocks, strike } from './resources';
import { CHEST_FLOORS, DEEP_LEVEL, faint, ladderIndex, MINE_FLOORS, MONSTERS, monstersForFloor, openChest, rockKind, swordDamage, type MonsterKind } from './regions';
import { TILE } from './world';
import { WorldScene, type SceneData } from './WorldScene';
import { session } from './session';
import { levelOf } from './profile';
import { emit } from './bus';
import { sfx } from '../audio/sound';
import { settings } from '../ui/settings';
import ICONS from '../../assets/Custom/icons.json';

const W = 22;
const H = 15;
const FRAME: Record<string, number> = { mine_rock: 7, mine_copper: 8, mine_iron: 9, mine_gold: 10, mine_big: 11, mine_gem: 10 };
/** Vài cột đá cố định giữa hang cho đỡ trống trải. */
const PILLARS: [number, number][] = [[5, 5], [6, 5], [15, 4], [16, 9], [16, 10], [4, 10], [10, 7]];
/** Lối xuống hang sâu ở hang đá trên. */
const DEEP_DOOR = { x: 19, y: 3 };
const CHEST = { x: 11, y: 3 };
const MAX_HP = 100;
/** Máu hiện tại trong hang sâu (không lưu — lên khỏi hang là hồi đầy). */
let hp = MAX_HP;

interface Monster { kind: MonsterKind; spr: Phaser.GameObjects.Sprite; hp: number; hitAt: number; wander: number }

/**
 * Hang đá: tầng 0 là hang trên (đá mọc lại mỗi sáng). Từ cấp nông trại 10 mở hang sâu 30 tầng:
 * mỗi tầng giấu lối xuống dưới một tảng đá, có quái (dơi, slime, người đá), rương báu ở tầng 10/20/30.
 */
export class MineScene extends WorldScene {
  readonly location = 'mine' as const;
  private exit = { x: Math.floor(W / 2), y: H - 1 };
  private rocks = new Map<string, { node: string; img: Phaser.GameObjects.Image; dmg: number }>();
  private floor = 0;
  private ladder: { x: number; y: number } | null = null;
  private ladderOpen = false;
  private monsters: Monster[] = [];
  private hurtAt = 0;
  private grid: boolean[][] = [];

  constructor() {
    super('mine');
  }

  init(data: SceneData) {
    super.init(data);
    const next = data.floor ?? 0;
    if (next > 0 && this.floor === 0) hp = MAX_HP;
    this.floor = next;
  }

  private bkey = (x: number, y: number) => (this.floor ? `${this.floor}:${key(x, y)}` : key(x, y));

  protected buildMap() {
    this.rocks = new Map();
    this.monsters = [];
    this.ladder = null;
    this.ladderOpen = false;
    this.hurtAt = 0;
    const f = this.floor;
    const tint = f ? Phaser.Display.Color.GetColor(255 - f * 3, 240 - f * 4, 255 - f * 2) : 0xffffff;
    this.cameras.main.setBackgroundColor(f ? '#0c0810' : '#15101a');
    const pillars = f ? Array.from({ length: 6 + (f % 4) }, (_, i) => [2 + Math.floor(seeded(f * 53 + i * 7) * (W - 4)), 3 + Math.floor(seeded(f * 31 + i * 11) * (H - 6))] as [number, number]) : PILLARS;
    const pillar = new Set(pillars.map(([x, y]) => key(x, y)));
    const blocked = Array.from({ length: H }, () => Array(W).fill(false));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nearExit = Math.abs(x - this.exit.x) <= 1 && y >= H - 3;
        const wall = y <= 1 || y === H - 1 || x === 0 || x === W - 1 || (pillar.has(key(x, y)) && !nearExit);
        const face = y === 1 && x > 0 && x < W - 1;
        let frame = wall ? (face ? 5 : 4) : (x * 5 + y * 3) % 7 === 0 ? 3 : (x + y * 2) % 4 === 0 ? 1 : (x * y) % 5 === 0 ? 2 : 0;
        if (x === this.exit.x && y === this.exit.y) frame = 6;
        if (x === this.exit.x && y === this.exit.y) this.add.image(x * TILE, y * TILE, 'mine', 0).setOrigin(0).setDepth(0).setTint(tint);
        this.add.image(x * TILE, y * TILE, 'mine', frame).setOrigin(0).setDepth(frame === 6 ? 0.5 : 0).setTint(tint);
        blocked[y][x] = wall && !(x === this.exit.x && y === this.exit.y);
      }
    }
    // Cột đá chừa chân vách như mặt tường
    for (const [x, y] of pillars) if (blocked[y][x]) this.add.image(x * TILE, y * TILE + 6, 'mine', 5).setOrigin(0).setDepth((y + 1) * TILE).setCrop(0, 0, 16, 10).setTint(tint);

    if (!f) {
      // Lối xuống hang sâu
      this.add.image(DEEP_DOOR.x * TILE, DEEP_DOOR.y * TILE, 'icons', ICONS.ladder_down).setOrigin(0).setDepth(0.6);
      blocked[DEEP_DOOR.y][DEEP_DOOR.x] = true;
    }
    const chestHere = !!CHEST_FLOORS[f] && !this.state.chests.includes(f);
    if (chestHere) {
      this.add.image(CHEST.x * TILE + 8, (CHEST.y + 1) * TILE, 'chest', 0).setOrigin(0.5, 0.8).setDepth((CHEST.y + 1) * TILE);
      blocked[CHEST.y][CHEST.x] = true;
    }

    const spots: [number, number][] = [];
    for (let y = 2; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        if (blocked[y][x] || (Math.abs(x - this.exit.x) <= 1 && y >= H - 3)) continue;
        if (!f && Math.abs(x - DEEP_DOOR.x) <= 1 && Math.abs(y - DEEP_DOOR.y) <= 1) continue;
        spots.push([x, y]);
      }
    const broken = mineBroken(this.state);
    const day = this.state.day;
    const list = f
      ? mineRocks(day * 41 + f, spots, 30).map((r, i) => ({ ...r, node: rockKind(f, seeded(day * 17 + f * 131 + i * 3)) }))
      : mineRocks(day, spots, has(this.state, 'tham_hiem') ? 44 : 34);
    const li = f && f < MINE_FLOORS ? ladderIndex(f, day, list.length) : -1;
    list.forEach((r, i) => {
      if (i === li) this.ladder = { x: r.x, y: r.y };
      if (broken.has(this.bkey(r.x, r.y))) return;
      const img = this.add.image(r.x * TILE, r.y * TILE, 'mine', FRAME[r.node]).setOrigin(0).setDepth((r.y + 1) * TILE - 2).setTint(r.node === 'mine_gem' ? 0x9ad8ff : tint);
      this.rocks.set(key(r.x, r.y), { node: r.node, img, dmg: 0 });
      blocked[r.y][r.x] = true;
    });
    const lad = this.ladder as { x: number; y: number } | null; // gán trong forEach nên TS không thấy
    if (lad && !this.rocks.has(key(lad.x, lad.y))) this.showLadder();
    this.grid = blocked;

    // Quái
    const free = spots.filter(([x, y]) => !blocked[y][x] && y < H - 4);
    monstersForFloor(f, day).forEach((kind, i) => {
      const [x, y] = free[Math.floor(seeded(day * 3 + f * 7 + i * 13) * free.length)] ?? [5, 5];
      this.spawnMonster(kind, (x + 0.5) * TILE, (y + 0.5) * TILE);
    });

    const entry = { x: (this.exit.x + 0.5) * TILE, y: (this.exit.y - 0.4) * TILE, dir: 'up' as const };
    const deep = { x: (DEEP_DOOR.x + 0.5) * TILE, y: (DEEP_DOOR.y + 1.6) * TILE, dir: 'down' as const };
    if (f) {
      this.hud.hp(hp, MAX_HP);
      this.events.once('shutdown', () => this.hud.hp(null));
      if (!this.message) this.message = `Hang sâu tầng ${f}${this.monsters.length ? ` — ${this.monsters.length} con quái, cầm kiếm để đánh` : ''} · lối xuống giấu dưới một tảng đá${chestHere ? ' · có rương báu!' : ''}`;
    } else if (!this.message) this.message = `Hang đá — ${this.rocks.size} tảng đá hôm nay, mai mọc lại. Cầm cuốc chim để đập.`;
    return { blocked, spawns: { entry, deep, default: entry } };
  }

  private spawnMonster(kind: MonsterKind, x: number, y: number) {
    const m = MONSTERS[kind];
    const anim = `mon-${kind}`;
    if (!this.anims.exists(anim)) this.anims.create({ key: anim, frames: this.anims.generateFrameNumbers('monsters', { frames: [m.row * 2, m.row * 2 + 1] }), frameRate: kind === 'bat' ? 8 : 3, repeat: -1 });
    const spr = this.add.sprite(x, y, 'monsters', m.row * 2).play(anim);
    this.monsters.push({ kind, spr, hp: m.hp + Math.floor(this.floor / 10) * 2, hitAt: 0, wander: Math.random() * Math.PI * 2 });
  }

  private showLadder() {
    const l = this.ladder!;
    this.add.image(l.x * TILE, l.y * TILE, 'icons', ICONS.ladder_down).setOrigin(0).setDepth(0.6);
    this.ladderOpen = true;
  }

  /** Xuống / lên tầng khác. */
  private goFloor(n: number, spawn = 'entry', message?: string) {
    if (this.paused) return;
    this.paused = true;
    sfx('door');
    this.cameras.main.fadeOut(220, 8, 4, 10);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ state: this.state, hud: this.hud, spawn, floor: n, message } satisfies SceneData));
  }

  private openElevator() {
    if (levelOf(session.profile.xp).level < DEEP_LEVEL) return this.hud.toast(`Hang sâu mở ở cấp nông trại ${DEEP_LEVEL}`);
    const stops = [1, ...Array.from({ length: 6 }, (_, i) => (i + 1) * 5).filter((n) => n <= this.state.mineDeepest)];
    const sword = countItem(this.state, 'sword') > 0;
    this.hud.choose('Hang sâu', `${sword ? '' : 'Chưa có kiếm — mua ở thợ rèn (800 xu) để đánh quái. '}Hết máu là ngất, mất 10% tiền (tối đa 1.000 xu). Tầng sâu nhất đã tới: ${this.state.mineDeepest}.`, [
      ...stops.map((n) => ({ label: `Tầng ${n}`, primary: n === stops[stops.length - 1], fn: () => this.goFloor(n) })),
      { label: 'Thôi', fn: () => {} },
    ]);
  }

  protected interact(t: Tile) {
    const f = this.floor;
    if (t.x === this.exit.x && t.y === this.exit.y) return f ? this.goFloor(0, 'deep', 'Lên lại hang đá — máu hồi đầy') : this.travel('farm', 'cave');
    if (!f && t.x === DEEP_DOOR.x && t.y === DEEP_DOOR.y) return this.openElevator();
    if (f && t.x === CHEST.x && t.y === CHEST.y && CHEST_FLOORS[f] && !this.state.chests.includes(f)) {
      const got = openChest(this.state, f);
      sfx('gift');
      this.hud.toast(`Rương báu: ${got!.join(', ')}`);
      this.renderHud();
      return this.goFloor(f, 'entry', `Tầng ${f} · rương đã mở`);
    }
    if (this.ladderOpen && this.ladder && t.x === this.ladder.x && t.y === this.ladder.y) {
      const next = f + 1;
      if (next > this.state.mineDeepest) { this.state.mineDeepest = next; emit('deep', 1); }
      return this.goFloor(next, 'entry', next % 5 === 0 ? `Tầng ${next} — thang máy đã mở tới đây` : undefined);
    }
    if (countItem(this.state, 'sword') && this.state.inventory[this.selected]?.item === 'sword') return this.swing(t);
    const k = key(t.x, t.y);
    const rock = this.rocks.get(k);
    if (!rock) return this.hud.toast(this.monsterAt(t) ? 'Cầm kiếm (mua ở thợ rèn) để đánh quái' : 'Đất đá cứng, không làm gì được');
    const r = strike(this.state, this.selected, rock.node, rock.dmg);
    if (!r.ok) return this.hud.toast(r.reason);
    this.ctrl.playTool('hoe', () => {
      if (!r.broke) {
        rock.dmg = NODES[rock.node].hp - r.hp;
        this.tweens.add({ targets: rock.img, x: rock.img.x + 1.5, duration: 45, yoyo: true, repeat: 2 });
      } else {
        this.rocks.delete(k);
        this.state.mine!.broken.push(this.bkey(t.x, t.y));
        this.ctrl.setBlocked(t.x, t.y, false);
        this.grid[t.y][t.x] = false;
        this.tweens.add({ targets: rock.img, alpha: 0, scale: 0.6, duration: 200, onComplete: () => rock.img.destroy() });
        r.drops.forEach(([item], i) => this.time.delayedCall(i * 120, () => this.popItem(t, item)));
        const found = this.ladder && this.ladder.x === t.x && this.ladder.y === t.y;
        if (found) this.showLadder();
        this.hud.toast(`${found ? 'Tìm thấy lối xuống! · ' : ''}Được ${r.drops.map(([it, n]) => `${n} ${ITEMS[it].name.toLowerCase()}`).join(', ')}`);
      }
      this.renderHud();
    }, 'pick');
  }

  private monsterAt(t: Tile) {
    const cx = (t.x + 0.5) * TILE, cy = (t.y + 0.5) * TILE;
    return this.monsters.find((m) => Math.hypot(m.spr.x - cx, m.spr.y - cy) < 16);
  }

  /** Vung kiếm vào ô trước mặt: trúng quái trong tầm thì trừ máu, đẩy lùi. */
  private swing(t: Tile) {
    this.ctrl.playTool('axe', () => {
      const cx = (t.x + 0.5) * TILE, cy = (t.y + 0.5) * TILE;
      const pl = this.ctrl.sprite;
      for (const m of [...this.monsters]) {
        if (Math.hypot(m.spr.x - cx, m.spr.y - cy) > 18) continue;
        m.hp -= swordDamage(this.state);
        m.hitAt = this.time.now;
        m.spr.setTint(0xff6a6a);
        this.time.delayedCall(150, () => m.spr.active && m.spr.clearTint());
        const d = Math.hypot(m.spr.x - pl.x, m.spr.y - pl.y) || 1;
        this.push(m, ((m.spr.x - pl.x) / d) * 12, ((m.spr.y - pl.y) / d) * 12);
        if (m.hp <= 0) this.kill(m);
      }
    }, 'swing');
  }

  private kill(m: Monster) {
    this.monsters = this.monsters.filter((x) => x !== m);
    sfx('slay');
    emit('slay', 1, m.kind);
    const drop = m.kind === 'golem' ? 'ore_gold' : m.kind === 'slime' && Math.random() < 0.4 ? 'ore_iron' : Math.random() < 0.3 ? 'ore_copper' : null;
    const t = { x: Math.floor(m.spr.x / TILE), y: Math.floor(m.spr.y / TILE) };
    if (drop && addItem(this.state, drop, 1)) { this.popItem(t, drop); this.renderHud(); }
    this.tweens.add({ targets: m.spr, alpha: 0, scale: 1.4, duration: 220, onComplete: () => m.spr.destroy() });
  }

  /** Dời quái, không cho xuyên đá (dơi bay qua được). */
  private push(m: Monster, dx: number, dy: number) {
    const fly = m.kind === 'bat';
    const ok = (x: number, y: number) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return tx > 0 && ty > 1 && tx < W - 1 && ty < H - 1 && (fly || !this.grid[ty]?.[tx]); };
    if (ok(m.spr.x + dx, m.spr.y)) m.spr.x += dx;
    if (ok(m.spr.x, m.spr.y + dy)) m.spr.y += dy;
  }

  update(t: number, dt: number) {
    super.update(t, dt);
    if (!this.floor || this.paused) return;
    const pl = this.ctrl.sprite;
    const s = dt / 1000;
    for (const m of this.monsters) {
      const def = MONSTERS[m.kind];
      const dx = pl.x - m.spr.x, dy = pl.y - 4 - m.spr.y;
      const d = Math.hypot(dx, dy) || 1;
      if (this.time.now - m.hitAt < 250) continue;
      if (d < 7 * TILE) this.push(m, (dx / d) * def.speed * s, (dy / d) * def.speed * s);
      else {
        m.wander += (Math.random() - 0.5) * 0.3;
        this.push(m, Math.cos(m.wander) * def.speed * 0.4 * s, Math.sin(m.wander) * def.speed * 0.4 * s);
      }
      m.spr.setFlipX(dx < 0).setDepth(m.spr.y + 6);
      if (d < 11 && this.time.now - this.hurtAt > 900) this.hurt(def.damage, m);
    }
  }

  private hurt(n: number, m: Monster) {
    this.hurtAt = this.time.now;
    hp -= n;
    sfx('hurt');
    if (!settings.reduceMotion) this.cameras.main.shake(120, 0.006);
    this.ctrl.sprite.setTint(0xff8080);
    this.time.delayedCall(200, () => this.ctrl.sprite.clearTint());
    const pl = this.ctrl.sprite;
    const d = Math.hypot(m.spr.x - pl.x, m.spr.y - pl.y) || 1;
    this.push(m, ((m.spr.x - pl.x) / d) * 14, ((m.spr.y - pl.y) / d) * 14);
    this.hud.hp(hp, MAX_HP);
    if (hp <= 0) this.passOut();
  }

  private passOut() {
    this.paused = true;
    const lost = faint(this.state);
    hp = MAX_HP;
    this.floor = 0;
    this.hud.hp(null);
    this.hud.fadeOut(() => {
      this.state.location = 'house';
      this.hud.fadeIn('Bạn ngất trong hang…\nDân làng khiêng bạn về nhà.');
      this.scene.start('house', { state: this.state, hud: this.hud, spawn: 'bed', message: `Mất ${lost.toLocaleString('vi-VN')} xu tiền thuốc men. Lần sau mang đồ ăn theo (F để ăn)` } satisfies SceneData);
    });
  }
}
