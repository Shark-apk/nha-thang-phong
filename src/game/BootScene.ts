import Phaser from 'phaser';
import { ASSETS } from './assets';
import { installPlayerSheets } from './playerSheet';
import { session } from './session';
import VILLAGE from '../maps/village.json';
import TOWN from '../maps/town.json';
import type { SceneData } from './WorldScene';

/** Tải toàn bộ hình một lần rồi vào bản đồ người chơi đang đứng. */
export class BootScene extends Phaser.Scene {
  private data0!: SceneData;

  constructor() {
    super('boot');
  }

  init(data: SceneData) {
    this.data0 = data;
  }

  preload() {
    for (const [k, path, w, h] of ASSETS) this.load.spritesheet(k, encodeURI(path), { frameWidth: w, frameHeight: h });
    // Bản đồ Tiled nhúng sẵn trong bundle (không cần tải riêng)
    this.load.tilemapTiledJSON('village', VILLAGE);
    this.load.tilemapTiledJSON('town', TOWN);
  }

  async create() {
    // Hình nhân vật theo ngoại hình người chơi (lỗi thì dùng hình gốc)
    await installPlayerSheets(this.game, session.profile.look).catch(() => {});
    this.scene.start(this.data0.state.location ?? 'farm', { ...this.data0, spawn: 'default' });
  }
}
