import Phaser from 'phaser';
import { TILE } from './world';
import { PLAYER_TEX } from './playerSheet';
import { worn } from './skills';
import { sfx, type Sfx } from '../audio/sound';
import { touchInput } from '../ui/touch';
import { padInput } from './controls';

export type Dir = 'down' | 'up' | 'left' | 'right';
export interface Tile { x: number; y: number }

const BASE_SPEED = 70;
const REACH = 1.6; // ô — tầm với khi bấm chuột
const DIR_ROW: Record<Dir, number> = { down: 0, up: 1, left: 2, right: 3 };
const DIR_VEC: Record<Dir, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

/** Tạo hoạt ảnh nhân vật một lần cho cả game (anims dùng chung giữa các cảnh). */
/** Hình nhân vật: bản đã ghép ngoại hình nếu có, không thì hình gốc. */
const tex = (scene: Phaser.Scene, kind: 'char' | 'actions') => (PLAYER_TEX[kind] && scene.textures.exists(PLAYER_TEX[kind]) ? PLAYER_TEX[kind] : kind);

function ensureAnims(scene: Phaser.Scene) {
  if (scene.anims.exists('idle-down')) return;
  const CHAR = tex(scene, 'char');
  const ACT = tex(scene, 'actions');
  for (const d of Object.keys(DIR_ROW) as Dir[]) {
    const row = DIR_ROW[d] * 4;
    scene.anims.create({ key: `idle-${d}`, frames: scene.anims.generateFrameNumbers(CHAR, { frames: [row, row + 1] }), frameRate: 2, repeat: -1 });
    scene.anims.create({ key: `walk-${d}`, frames: scene.anims.generateFrameNumbers(CHAR, { frames: [row + 2, row + 3] }), frameRate: 7, repeat: -1 });
    const a = DIR_ROW[d] * 2;
    scene.anims.create({ key: `hoe-${d}`, frames: scene.anims.generateFrameNumbers(ACT, { frames: [a, a + 1] }), frameRate: 7 });
    scene.anims.create({ key: `water-${d}`, frames: scene.anims.generateFrameNumbers(ACT, { frames: [16 + a, 17 + a] }), frameRate: 5 });
    scene.anims.create({ key: `axe-${d}`, frames: scene.anims.generateFrameNumbers(ACT, { frames: [8 + a, 9 + a] }), frameRate: 8 });
  }
}

/**
 * Nhân vật người chơi: di chuyển, va chạm, hướng nhìn, ô mục tiêu (khung vàng), hoạt ảnh dụng cụ.
 * Dùng chung cho mọi bản đồ.
 */
export class PlayerController {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  dir: Dir = 'down';
  busy = false;
  private mouseTile: Tile | null = null;
  private highlight: Phaser.GameObjects.Rectangle;
  private cursor: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private walls: Phaser.Physics.Arcade.StaticGroup;
  private dynamic = new Map<string, Phaser.GameObjects.Zone>();
  /** Lưới ô bị chặn (cập nhật theo setBlocked) — để tìm đường khi chạm vào ô xa. */
  private grid: boolean[][];
  /** Đường đang tự đi (chạm để đi) + việc làm khi tới nơi. */
  private path: Tile[] = [];
  private arrive: (() => void) | null = null;
  private stuck = { d: Infinity, t: 0 };

  constructor(private scene: Phaser.Scene, x: number, y: number, blocked: boolean[][], onClick: (t: Tile) => void) {
    ensureAnims(scene);
    this.grid = blocked.map((row) => [...row]);
    const h = blocked.length;
    const w = blocked[0].length;
    this.sprite = scene.physics.add.sprite(x, y, tex(scene, 'char'), 0);
    this.sprite.setSize(10, 7).setOffset(19, 25).setOrigin(0.5, 0.62);
    this.sprite.setCollideWorldBounds(true);
    scene.physics.world.setBounds(0, 0, w * TILE, h * TILE);
    this.sprite.play('idle-down');

    const walls = scene.physics.add.staticGroup();
    this.walls = walls;
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++)
        if (blocked[yy][xx]) this.setBlocked(xx, yy, true);
    scene.physics.add.collider(this.sprite, walls);

    this.highlight = scene.add.rectangle(0, 0, TILE, TILE).setStrokeStyle(1, 0xfff4c0, 0.9).setOrigin(0).setDepth(9000);
    this.highlight.setFillStyle(0xfff4c0, 0.12);

    const kb = scene.input.keyboard!;
    this.cursor = kb.createCursorKeys();
    this.keys = kb.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const t = { x: Math.floor(p.worldX / TILE), y: Math.floor(p.worldY / TILE) };
      this.mouseTile = this.inReach(t) ? t : null;
    });
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!p.leftButtonDown() && !p.wasTouch) return;
      const t = { x: Math.floor(p.worldX / TILE), y: Math.floor(p.worldY / TILE) };
      if (this.inReach(t)) {
        this.stop();
        this.face(t);
        onClick(t);
      } else if (p.wasTouch && !this.busy) {
        // Chạm ô xa: tự đi tới; ô đó là vật (cửa, quầy, cây…) thì tới cạnh rồi dùng luôn
        const blockedTarget = !!this.grid[t.y]?.[t.x];
        this.walkTo(t, blockedTarget ? () => { if (this.inReach(t)) { this.face(t); onClick(t); } } : null);
      }
    });
  }

  /** Lưới ô bị chặn hiện tại (bản đồ nhỏ đọc). */
  walkGrid() {
    return this.grid;
  }

  /** Chặn/bỏ chặn một ô lúc đang chơi (cây mới trồng, máy móc, cây bị chặt…). */
  setBlocked(x: number, y: number, on: boolean) {
    if (this.grid[y] && x >= 0 && x < this.grid[y].length) this.grid[y][x] = on;
    const k = `${x},${y}`;
    const z = this.dynamic.get(k);
    if (on && !z) {
      const zone = this.scene.add.zone(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE, TILE);
      this.walls.add(zone);
      this.dynamic.set(k, zone);
    } else if (!on && z) {
      this.walls.remove(z, true, true);
      this.dynamic.delete(k);
    }
  }

  feetTile(): Tile {
    return { x: Math.floor(this.sprite.x / TILE), y: Math.floor((this.sprite.body!.y + 4) / TILE) };
  }

  facingTile(): Tile {
    const f = this.feetTile();
    const [dx, dy] = DIR_VEC[this.dir];
    return { x: f.x + dx, y: f.y + dy };
  }

  /** Ô đang có khung vàng: ô dưới chuột nếu trong tầm với, không thì ô trước mặt. */
  targetTile(): Tile {
    if (this.mouseTile && this.inReach(this.mouseTile)) {
      this.face(this.mouseTile);
      return this.mouseTile;
    }
    return this.facingTile();
  }

  inReach(t: Tile) {
    const f = this.feetTile();
    return Math.hypot(t.x - f.x, t.y - f.y) <= REACH && !(t.x === f.x && t.y === f.y);
  }

  face(t: Tile) {
    const f = this.feetTile();
    const dx = t.x - f.x;
    const dy = t.y - f.y;
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  }

  place(x: number, y: number, dir: Dir = 'down') {
    this.sprite.setPosition(x, y);
    this.dir = dir;
    this.sprite.play(`idle-${dir}`);
  }

  /** Chạy hoạt ảnh dụng cụ, khóa di chuyển cho tới khi xong. */
  playTool(anim: 'hoe' | 'water' | 'axe', done: () => void, sound: Sfx = anim) {
    this.busy = true;
    sfx(sound);
    this.sprite.setVelocity(0);
    this.sprite.play(`${anim}-${this.dir}`);
    this.sprite.once('animationcomplete', () => {
      this.busy = false;
      done();
    });
  }

  /** Tìm đường theo ô (BFS 4 hướng) tới `t`, hoặc tới ô cạnh nó nếu `t` bị chặn. */
  walkTo(t: Tile, then: (() => void) | null) {
    const H = this.grid.length, W = this.grid[0].length;
    const free = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && !this.grid[y][x];
    const goals = new Set<string>();
    if (free(t.x, t.y)) goals.add(`${t.x},${t.y}`);
    else for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (free(t.x + dx, t.y + dy)) goals.add(`${t.x + dx},${t.y + dy}`);
    if (!goals.size) return false;
    const start = this.feetTile();
    const prev = new Map<string, string | null>([[`${start.x},${start.y}`, null]]);
    const queue: Tile[] = [start];
    let end: string | null = goals.has(`${start.x},${start.y}`) ? `${start.x},${start.y}` : null;
    while (queue.length && !end && prev.size < 4000) {
      const c = queue.shift()!;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const x = c.x + dx, y = c.y + dy, k = `${x},${y}`;
        if (prev.has(k) || !free(x, y)) continue;
        prev.set(k, `${c.x},${c.y}`);
        if (goals.has(k)) { end = k; break; }
        queue.push({ x, y });
      }
    }
    if (!end) return false;
    const path: Tile[] = [];
    for (let k: string | null = end; k && prev.get(k) !== null; k = prev.get(k) ?? null) {
      const [x, y] = k.split(',').map(Number);
      path.unshift({ x, y });
    }
    this.path = path;
    this.arrive = then;
    this.stuck = { d: Infinity, t: 0 };
    if (!path.length) this.finishWalk();
    return true;
  }

  stop() {
    this.path = [];
    this.arrive = null;
  }

  private finishWalk() {
    const then = this.arrive;
    this.stop();
    this.sprite.setVelocity(0);
    then?.();
  }

  /** Hướng đi khi đang tự đi theo đường (0,0 = tới nơi / không có đường). */
  private pathVector(): [number, number] {
    const next = this.path[0];
    if (!next) return [0, 0];
    const body = this.sprite.body!;
    const fx = this.sprite.x, fy = body.y + 4;
    const tx = next.x * TILE + TILE / 2, ty = next.y * TILE + TILE / 2;
    const dx = tx - fx, dy = ty - fy;
    const d = Math.hypot(dx, dy);
    if (d < 2.5) {
      this.path.shift();
      this.stuck = { d: Infinity, t: this.scene.time.now };
      if (!this.path.length) { this.finishWalk(); return [0, 0]; }
      return this.pathVector();
    }
    // Kẹt (vật mới mọc chắn đường, con vật đứng giữa lối) → bỏ đi tiếp
    const now = this.scene.time.now;
    if (d < this.stuck.d - 0.5) this.stuck = { d, t: now };
    else if (now - this.stuck.t > 900) { this.stop(); return [0, 0]; }
    return [dx / d, dy / d];
  }

  update(paused: boolean) {
    if (paused) {
      this.sprite.setVelocity(0);
      return;
    }
    if (!this.busy) {
      let vx = (this.cursor.right.isDown || this.keys.D.isDown ? 1 : 0) - (this.cursor.left.isDown || this.keys.A.isDown ? 1 : 0) + touchInput.vx + padInput.vx;
      let vy = (this.cursor.down.isDown || this.keys.S.isDown ? 1 : 0) - (this.cursor.up.isDown || this.keys.W.isDown ? 1 : 0) + touchInput.vy + padInput.vy;
      if (vx || vy) this.stop();
      else if (this.path.length) [vx, vy] = this.pathVector();
      // Bàn phím đi hết tốc; cần điều khiển lệch ít đi chậm
      const len = Math.hypot(vx, vy);
      const k = len > 1 ? 1 / len : 1;
      const speed = BASE_SPEED * (worn === 'speed' ? 1.1 : 1);
      this.sprite.setVelocity(vx * k * speed, vy * k * speed);
      if (vx || vy) {
        // Đi bằng bàn phím: khung vàng trở về ô trước mặt cho tới khi chuột di chuyển lại
        this.mouseTile = null;
        this.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
        this.sprite.anims.play(`walk-${this.dir}`, true);
      } else this.sprite.anims.play(`idle-${this.dir}`, true);
    }
    this.sprite.setDepth(this.sprite.body!.y + 7);
    if (this.mouseTile && !this.inReach(this.mouseTile)) this.mouseTile = null;
    const t = this.mouseTile ?? this.facingTile();
    this.highlight.setPosition(t.x * TILE, t.y * TILE);
  }
}
