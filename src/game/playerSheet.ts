// Spritesheet nhân vật người chơi trong Phaser, dựng từ ngoại hình ở hồ sơ.
// Mỗi lần đổi ngoại hình tạo khóa hình mới (pchar-1, pchar-2…) để cảnh cũ không vẽ vào hình đã xóa.
import type Phaser from 'phaser';
import type { Look } from '../data';
import { buildSheet } from '../ui/avatar';

let version = 0;
export const PLAYER_TEX = { char: '', actions: '' };
const ANIM_PREFIX = ['idle-', 'walk-', 'hoe-', 'water-', 'axe-'];

function addSheet(textures: Phaser.Textures.TextureManager, key: string, canvas: HTMLCanvasElement) {
  const t = textures.addCanvas(key, canvas)!;
  const cols = canvas.width / 48;
  const rows = canvas.height / 48;
  for (let i = 0; i < cols * rows; i++) t.add(i, 0, (i % cols) * 48, Math.floor(i / cols) * 48, 48, 48);
}

/**
 * Dựng hình nhân vật theo ngoại hình và xóa hoạt ảnh cũ (cảnh tạo lại theo hình mới khi khởi động).
 * Trả về hàm xóa hình cũ — gọi sau khi cảnh đã khởi động lại.
 */
export async function installPlayerSheets(game: Phaser.Game, look: Look) {
  const [c, a] = await Promise.all([buildSheet(look, 'char'), buildSheet(look, 'actions')]);
  const old = { ...PLAYER_TEX };
  version++;
  PLAYER_TEX.char = `pchar-${version}`;
  PLAYER_TEX.actions = `pactions-${version}`;
  addSheet(game.textures, PLAYER_TEX.char, c);
  addSheet(game.textures, PLAYER_TEX.actions, a);
  for (const d of ['down', 'up', 'left', 'right']) for (const p of ANIM_PREFIX) if (game.anims.exists(p + d)) game.anims.remove(p + d);
  return () => {
    for (const k of [old.char, old.actions]) if (k && game.textures.exists(k)) game.textures.remove(k);
  };
}
