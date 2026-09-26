import Phaser from 'phaser';
import { TILE } from './world';
import { PLAYER_TEX } from './playerSheet';
import { worn } from './skills';
import { sfx, type Sfx } from '../audio/sound';

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

  constructor(private scene: Phaser.Scene, x: number, y: number, blocked: boolean[][], onClick: (t: Tile) => void) {
    ensureAnims(scene);
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
      if (!p.leftButtonDown()) return;
      const t = { x: Math.floor(p.worldX / TILE), y: Math.floor(p.worldY / TILE) };
      if (this.inReach(t)) {
        this.face(t);
        onClick(t);
      }
    });
  }

  /** Chặn/bỏ chặn một ô lúc đang chơi (cây mới trồng, máy móc, cây bị chặt…). */
  setBlocked(x: number, y: number, on: boolean) {
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

  update(paused: boolean) {
    if (paused) {
      this.sprite.setVelocity(0);
      return;
    }
    if (!this.busy) {
      const vx = (this.cursor.right.isDown || this.keys.D.isDown ? 1 : 0) - (this.cursor.left.isDown || this.keys.A.isDown ? 1 : 0);
      const vy = (this.cursor.down.isDown || this.keys.S.isDown ? 1 : 0) - (this.cursor.up.isDown || this.keys.W.isDown ? 1 : 0);
      const len = Math.hypot(vx, vy) || 1;
      const speed = BASE_SPEED * (worn === 'speed' ? 1.1 : 1);
      this.sprite.setVelocity((vx / len) * speed, (vy / len) * speed);
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
