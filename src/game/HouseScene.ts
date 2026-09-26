import ICONS from '../../assets/Custom/icons.json';
import type { Tile } from './player';
import { TILE } from './world';
import { WorldScene } from './WorldScene';

const W = 9;
const H = 7;
const DOOR = { x: 4, y: 6 };
const BED = { x: 1, y: 1 }; // 1×2 ô
const STOVE = { x: 5, y: 1 };

/** Nội thất: [frame trong Basic_Furniture.png, x, y, chặn đường?] */
const FURNITURE: [number, number, number, boolean][] = [
  [9, BED.x, BED.y, true], [18, BED.x, BED.y + 1, true], // giường
  [12, 2, 1, true], // đèn ngủ
  [21, 3, 1, true], // tủ
  [3, 7, 1, true], // chậu cây
  [30, 6, 4, true], [22, 5, 4, true], [23, 7, 4, true], // bàn + 2 ghế
  [48, 3, 3, false], [49, 4, 3, false], // thảm
];
/** Treo trên tường trên cùng */
const WALL_DECOR: [number, number][] = [[33, 4], [2, 6]];

/** Trong nhà: ngủ ở giường, đi ra cửa về nông trại. */
export class HouseScene extends WorldScene {
  readonly location = 'house' as const;

  constructor() {
    super('house');
  }

  protected buildMap() {
    // Phòng ghép 9 mảnh từ Wooden House.png (7 cột): góc 7/9/21/23, cạnh 8/14/16/22, sàn 15
    const at = (x: number, y: number) => {
      const top = y === 0, bottom = y === H - 1, left = x === 0, right = x === W - 1;
      if (top) return left ? 7 : right ? 9 : 8;
      if (bottom) return left ? 21 : right ? 23 : 22;
      return left ? 14 : right ? 16 : 15;
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) this.add.image(x * TILE, y * TILE, 'interior', at(x, y)).setOrigin(0).setDepth(0);
    this.add.image(DOOR.x * TILE, DOOR.y * TILE, 'interior', 15).setOrigin(0).setDepth(0);
    this.add.image(DOOR.x * TILE, DOOR.y * TILE, 'doors', 1).setOrigin(0).setDepth(1);

    const blocked = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => y === 0 || y === H - 1 || x === 0 || x === W - 1));
    blocked[DOOR.y][DOOR.x] = false;
    for (const [f, x, y, block] of FURNITURE) {
      this.add.image(x * TILE, y * TILE, 'furniture', f).setOrigin(0).setDepth(block ? (y + 1) * TILE : 1);
      if (block) blocked[y][x] = true;
    }
    for (const [f, x] of WALL_DECOR) this.add.image(x * TILE, 0, 'furniture', f).setOrigin(0).setDepth(2);
    // Bếp (nâng nhà ở lò rèn bác Năm)
    if (this.state.flags.includes('kitchen')) {
      this.add.image(STOVE.x * TILE, STOVE.y * TILE, 'icons', ICONS.stove).setOrigin(0).setDepth((STOVE.y + 1) * TILE);
      blocked[STOVE.y][STOVE.x] = true;
    }
    this.cameras.main.setBackgroundColor('#241a22');

    return {
      blocked,
      spawns: {
        door: { x: (DOOR.x + 0.5) * TILE, y: (DOOR.y - 0.3) * TILE, dir: 'up' as const },
        bed: { x: (BED.x + 1.5) * TILE, y: (BED.y + 1.7) * TILE, dir: 'down' as const },
        default: { x: (BED.x + 1.5) * TILE, y: (BED.y + 1.7) * TILE, dir: 'down' as const },
      },
    };
  }

  protected interact(t: Tile) {
    if (t.x === BED.x && (t.y === BED.y || t.y === BED.y + 1)) return this.hud.confirmSleep(this.state);
    if (t.x === DOOR.x && t.y === DOOR.y) return this.travel('farm', 'door');
    if (t.x === STOVE.x && t.y === STOVE.y && this.state.flags.includes('kitchen')) return this.hud.openCooking(this.state);
    this.hud.toast('Bấm vào giường để ngủ, ra cửa để về nông trại');
  }

  update(t: number, dt: number) {
    super.update(t, dt);
    // Bước vào ô cửa là ra ngoài
    const f = this.ctrl.feetTile();
    if (!this.paused && f.x === DOOR.x && f.y === DOOR.y) this.travel('farm', 'door');
  }
}
