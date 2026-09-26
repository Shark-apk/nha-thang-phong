import { ANIMALS, BUILDINGS, ITEMS, QUALITY_NAME } from '../data';
import { animalsIn, fillTrough, grazingToday, hearts, touchAnimal } from './animals';
import { critterAt, refreshBubble, spawnCritters, type Critter } from './critters';
import type { Tile } from './player';
import { TILE } from './world';
import { WorldScene } from './WorldScene';
import { sfx } from '../audio/sound';

type Home = 'coop' | 'barn' | 'shed';
const SIZE: Record<Home, { w: number; h: number }> = { coop: { w: 9, h: 7 }, barn: { w: 11, h: 8 }, shed: { w: 9, h: 7 } };

/** Trong chuồng: máng cỏ ở trên, thú đi lại, cửa ở dưới. */
export class AnimalScene extends WorldScene {
  readonly location: Home;
  private critters: Critter[] = [];
  private trough = { x: 0, y: 1, w: 3 };
  private door = { x: 0, y: 0 };
  private troughImg!: Phaser.GameObjects.Image;

  constructor(home: Home) {
    super(home);
    this.location = home;
  }

  protected buildMap() {
    const { w: W, h: H } = SIZE[this.location];
    this.door = { x: Math.floor(W / 2), y: H - 1 };
    this.trough = { x: Math.floor(W / 2) - 1, y: 1, w: 3 };
    const at = (x: number, y: number) => {
      const top = y === 0, bottom = y === H - 1, left = x === 0, right = x === W - 1;
      if (top) return left ? 7 : right ? 9 : 8;
      if (bottom) return left ? 21 : right ? 23 : 22;
      return left ? 14 : right ? 16 : 15;
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) this.add.image(x * TILE, y * TILE, 'interior', at(x, y)).setOrigin(0).setDepth(0);
    // Sàn rơm
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if ((x * 7 + y * 3) % 5 === 0) this.add.image(x * TILE, y * TILE, 'milkgrass', 3).setOrigin(0).setAlpha(0.35).setDepth(0.5);
    this.add.image(this.door.x * TILE, this.door.y * TILE, 'interior', 15).setOrigin(0).setDepth(0);
    this.add.image(this.door.x * TILE, this.door.y * TILE, 'doors', 1).setOrigin(0).setDepth(1);
    this.troughImg = this.add.image(this.trough.x * TILE, this.trough.y * TILE, 'trough', 0).setOrigin(0).setDepth((this.trough.y + 1) * TILE);
    if (this.location === 'coop') for (const x of [1, W - 2]) this.add.image(x * TILE, 1 * TILE, 'nest', 3).setOrigin(0).setDepth(TILE * 2);
    this.cameras.main.setBackgroundColor('#241a22');

    const blocked = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => y === 0 || y === H - 1 || x === 0 || x === W - 1));
    blocked[this.door.y][this.door.x] = false;
    for (let x = this.trough.x; x < this.trough.x + this.trough.w; x++) blocked[this.trough.y][x] = true;

    const outside = grazingToday(this.state, this.location) && this.state.minutes < 18 * 60;
    this.critters = outside ? [] : spawnCritters(this, animalsIn(this.state, this.location), { x0: 1.6 * TILE, y0: 3 * TILE, x1: (W - 1.6) * TILE, y1: (H - 1.4) * TILE });
    if (outside && animalsIn(this.state, this.location).length) this.message = 'Cửa chuồng đang mở — thú đang ăn cỏ ngoài đồng';

    return {
      blocked,
      spawns: {
        door: { x: (this.door.x + 0.5) * TILE, y: (this.door.y - 0.3) * TILE, dir: 'up' as const },
        default: { x: (this.door.x + 0.5) * TILE, y: (this.door.y - 0.3) * TILE, dir: 'up' as const },
      },
    };
  }

  refresh() {
    const bd = this.state.buildings[this.location];
    this.troughImg?.setFrame(bd && bd.hay > 0 ? 1 : 0);
    for (const c of this.critters) refreshBubble(this, c);
  }

  protected interact(t: Tile) {
    if (t.x === this.door.x && t.y === this.door.y) return this.travel('farm', this.location);
    if (t.y === this.trough.y && t.x >= this.trough.x && t.x < this.trough.x + this.trough.w) {
      const r = fillTrough(this.state, this.location, this.selected);
      const bd = this.state.buildings[this.location]!;
      this.hud.toast(r.ok ? `Đổ ${r.qty} cỏ khô vào máng (còn ${bd.hay} phần)` : `${r.reason} · máng còn ${bd.hay} phần`);
      this.refresh();
      return this.renderHud();
    }
    const c = critterAt(this.critters, t.x, t.y);
    if (!c) return this.hud.toast(`${BUILDINGS[this.location].name}: bấm vào thú để vuốt ve, vào máng để đổ cỏ khô`);
    this.touch(c);
  }

  private touch(c: Critter) {
    const r = touchAnimal(this.state, c.animal.id);
    if (!r.ok) return this.hud.toast(r.reason);
    sfx(this.location === 'coop' ? 'cluck' : 'moo');
    const def = ANIMALS[r.animal.kind];
    const parts = [`${r.animal.name} (${def.name.toLowerCase()}) · ${hearts(r.animal)}/10 tim`];
    if (r.item) {
      parts.unshift(`Lấy được ${ITEMS[r.item].name.toLowerCase()}${r.q ? ` loại ${QUALITY_NAME[r.q].toLowerCase()}` : ''}`);
      this.popItem({ x: Math.floor(c.sprite.x / TILE), y: Math.floor(c.sprite.y / TILE) - 1 }, r.item);
    } else if (r.petted) parts.unshift('Vuốt ve');
    this.tweens.add({ targets: c.sprite, y: c.sprite.y - 4, duration: 120, yoyo: true });
    this.hud.toast(parts.join(' · '));
    refreshBubble(this, c);
    this.renderHud();
  }

  update(t: number, dt: number) {
    super.update(t, dt);
    const f = this.ctrl.feetTile();
    if (!this.paused && f.x === this.door.x && f.y === this.door.y) this.travel('farm', this.location);
  }
}
