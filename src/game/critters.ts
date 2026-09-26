// Vẽ vật nuôi đi lang thang trong một vùng; dùng chung cho trong chuồng và ngoài đồng.
import Phaser from 'phaser';
import { ANIMALS, ITEMS } from '../data';
import type { Animal } from './animals';

export interface Critter {
  animal: Animal;
  sprite: Phaser.GameObjects.Sprite;
  bubble: Phaser.GameObjects.Image | null;
}

function ensureAnims(scene: Phaser.Scene) {
  if (scene.anims.exists('cow-idle')) return;
  scene.anims.create({ key: 'cow-idle', frames: scene.anims.generateFrameNumbers('cow', { frames: [0, 1, 2] }), frameRate: 3, repeat: -1 });
  scene.anims.create({ key: 'cow-walk', frames: scene.anims.generateFrameNumbers('cow', { frames: [3, 4] }), frameRate: 5, repeat: -1 });
  if (!scene.anims.exists('chicken-idle')) {
    scene.anims.create({ key: 'chicken-idle', frames: scene.anims.generateFrameNumbers('chicken', { frames: [0, 1] }), frameRate: 2, repeat: -1 });
    scene.anims.create({ key: 'chicken-walk', frames: scene.anims.generateFrameNumbers('chicken', { frames: [4, 5, 6, 7] }), frameRate: 8, repeat: -1 });
  }
}

/** Thả các con vật đi lang thang trong khung (pixel). */
export function spawnCritters(scene: Phaser.Scene, animals: Animal[], area: { x0: number; y0: number; x1: number; y1: number }): Critter[] {
  ensureAnims(scene);
  return animals.map((a, i) => {
    const sp = ANIMALS[a.kind].sprite;
    const x = Phaser.Math.Between(area.x0, area.x1);
    const y = Phaser.Math.Between(area.y0, area.y1);
    const sprite = scene.add.sprite(x, y, sp.tex, sp.idle[0]).setOrigin(0.5, 0.85);
    const anim = sp.tex === 'cow' ? 'cow' : sp.tex === 'chicken' ? 'chicken' : null;
    if (anim) sprite.play(`${anim}-idle`);
    const c: Critter = { animal: a, sprite, bubble: null };
    const wander = () => {
      if (!sprite.active) return;
      const tx = Phaser.Math.Clamp(sprite.x + Phaser.Math.Between(-36, 36), area.x0, area.x1);
      const ty = Phaser.Math.Clamp(sprite.y + Phaser.Math.Between(-20, 20), area.y0, area.y1);
      sprite.setFlipX(anim === 'chicken' ? tx > sprite.x : tx < sprite.x);
      if (anim) sprite.play(`${anim}-walk`);
      const bob = anim ? null : scene.tweens.add({ targets: sprite, scaleY: 0.92, duration: 180, yoyo: true, repeat: -1 });
      scene.tweens.add({
        targets: sprite, x: tx, y: ty, duration: Math.max(300, Phaser.Math.Distance.Between(sprite.x, sprite.y, tx, ty) * 45),
        onUpdate: () => {
          sprite.setDepth(sprite.y);
          c.bubble?.setPosition(sprite.x, sprite.y - sp.size * 0.9 - 4).setDepth(sprite.y + 1);
        },
        onComplete: () => {
          bob?.stop();
          sprite.setScale(1);
          if (anim) sprite.play(`${anim}-idle`);
          scene.time.delayedCall(Phaser.Math.Between(1200, 4200), wander);
        },
      });
    };
    scene.time.delayedCall(400 + i * 350, wander);
    sprite.setDepth(sprite.y);
    refreshBubble(scene, c);
    return c;
  });
}

/** Bong bóng sản phẩm trên đầu con vật khi có đồ để lấy. */
export function refreshBubble(scene: Phaser.Scene, c: Critter) {
  const def = ANIMALS[c.animal.kind];
  const show = c.animal.product && def.product;
  if (show && !c.bubble) {
    const [tex, f] = ITEMS[def.product!].icon;
    c.bubble = scene.add.image(c.sprite.x, c.sprite.y - def.sprite.size * 0.9 - 4, tex, f).setScale(0.7).setDepth(c.sprite.y + 1);
    scene.tweens.add({ targets: c.bubble, y: '-=2', duration: 500, yoyo: true, repeat: -1 });
  } else if (!show && c.bubble) {
    c.bubble.destroy();
    c.bubble = null;
  }
}

/** Con vật gần ô (x,y) nhất trong bán kính 1,2 ô. */
export function critterAt(critters: Critter[], tx: number, ty: number, tile = 16) {
  let best: Critter | null = null;
  let bd = 1.3 * tile;
  for (const c of critters) {
    const d = Phaser.Math.Distance.Between(c.sprite.x, c.sprite.y - 4, tx * tile + tile / 2, ty * tile + tile / 2);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}
