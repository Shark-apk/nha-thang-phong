import Phaser from 'phaser';
import { ITEMS } from '../data';
import { useOnTile } from './farm';
import { drawPlots } from './RegionScenes';
import { GH_X } from './activities';
import type { Tile } from './player';
import { TILE } from './world';
import { WorldScene } from './WorldScene';

const W = 12;
const H = 9;
/** Luống đất trong nhà kính (tọa độ trong cảnh). */
const BED = { x0: 1, y0: 2, x1: 10, y1: 6 };
const DOOR = { x: 6, y: H - 1 };

/**
 * Nhà kính: trồng được mọi loại cây quanh năm, tưới nhỏ giọt tự động mỗi sáng.
 * Đất & cây lưu chung bảng với nông trại, tọa độ x cộng thêm GH_X.
 */
export class GreenhouseScene extends WorldScene {
  readonly location = 'greenhouse' as const;
  private soil!: Phaser.Tilemaps.TilemapLayer;
  private dirtFirst = 0;
  private crops = new Map<string, Phaser.GameObjects.Image>();

  constructor() {
    super('greenhouse');
  }

  protected buildMap() {
    this.crops = new Map();
    const at = (x: number, y: number) => {
      const top = y === 0, bottom = y === H - 1, left = x === 0, right = x === W - 1;
      if (top) return left ? 7 : right ? 9 : 8;
      if (bottom) return left ? 21 : right ? 23 : 22;
      return left ? 14 : right ? 16 : 15;
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) this.add.image(x * TILE, y * TILE, 'interior', at(x, y)).setOrigin(0).setDepth(0).setTint(0xe8f4f0);
    this.add.image(DOOR.x * TILE, DOOR.y * TILE, 'interior', 15).setOrigin(0).setDepth(0);
    this.add.image(DOOR.x * TILE, DOOR.y * TILE, 'doors', 1).setOrigin(0).setDepth(1);
    // Nền luống đất
    this.add.rectangle(BED.x0 * TILE, BED.y0 * TILE, (BED.x1 - BED.x0 + 1) * TILE, (BED.y1 - BED.y0 + 1) * TILE, 0x9a6a4a, 0.35).setOrigin(0).setDepth(0.5);
    const map = this.make.tilemap({ width: W, height: H, tileWidth: TILE, tileHeight: TILE });
    const dirt = map.addTilesetImage('dirt', 'dirt', TILE, TILE, 0, 0, 1)!;
    this.dirtFirst = dirt.firstgid;
    this.soil = map.createBlankLayer('soil', dirt)!.setDepth(1);
    this.cameras.main.setBackgroundColor('#20302a');
    const blocked = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => y === 0 || y === H - 1 || x === 0 || x === W - 1));
    blocked[DOOR.y][DOOR.x] = false;
    const spawn = { x: (DOOR.x + 0.5) * TILE, y: (DOOR.y - 0.3) * TILE, dir: 'up' as const };
    this.message ??= 'Nhà kính — trồng gì cũng được, quanh năm; sáng nào cũng tự tưới';
    return { blocked, spawns: { door: spawn, default: spawn } };
  }

  private inBed = (t: Tile) => t.x >= BED.x0 && t.x <= BED.x1 && t.y >= BED.y0 && t.y <= BED.y1;

  protected interact(t: Tile) {
    if (t.x === DOOR.x && t.y === DOOR.y) return this.travel('farm', 'greenhouse');
    if (!this.inBed(t)) return this.hud.toast('Chỉ trồng trong luống đất');
    const held = this.state.inventory[this.selected]?.item;
    if (held && ITEMS[held].kind === 'sapling') return this.hud.toast('Cây ăn trái phải trồng ngoài trời');
    const r = useOnTile(this.state, this.selected, GH_X + t.x, t.y, { tillable: true, nearWater: false, anySeason: true });
    if (!r.ok) return this.hud.toast(r.reason);
    const finish = () => {
      if (r.action === 'harvest') this.popItem(t, r.item!);
      this.refresh();
      this.renderHud();
    };
    if (r.action === 'till' || r.action === 'water') this.ctrl.playTool(r.action === 'till' ? 'hoe' : 'water', finish);
    else finish();
  }

  update(t: number, dt: number) {
    super.update(t, dt);
    const f = this.ctrl.feetTile();
    if (!this.paused && f.x === DOOR.x && f.y === DOOR.y) this.travel('farm', 'greenhouse');
  }

  refresh() {
    drawPlots(this, this.state, this.soil, this.dirtFirst, this.crops, GH_X, W, H);
  }
}
