import Phaser from 'phaser';
import '@fontsource/vt323/400.css';
import { BootScene } from './game/BootScene';
import { FarmScene } from './game/FarmScene';
import { HouseScene } from './game/HouseScene';
import { AnimalScene } from './game/AnimalScene';
import { MineScene } from './game/MineScene';
import { VillageScene } from './game/VillageScene';
import { GreenhouseScene } from './game/GreenhouseScene';
import { ForestScene, SeaScene, SkyScene } from './game/RegionScenes';
import { DAY_START } from './game/farm';
import { mountDebug } from './ui/debug';
import { Hud } from './ui/hud';
import type { FarmState } from './game/farm';
import { applyUiScale } from './ui/settings';
import { showCover, showSettingsModal } from './ui/cover';
import { openLobby } from './ui/lobby';
import { attachProfile, session } from './game/session';
import { installPlayerSheets } from './game/playerSheet';
import { syncFriends, WorldScene } from './game/WorldScene';

function start(state: FarmState) {
  const hud = new Hud(document.getElementById('ui')!);
  session.toast = (m) => hud.toast(m);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#9bd4c3',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [],
  });
  game.scene.add('farm', FarmScene);
  game.scene.add('house', HouseScene);
  game.scene.add('mine', MineScene);
  game.scene.add('village', VillageScene);
  game.scene.add('town', new VillageScene('town'));
  game.scene.add('greenhouse', GreenhouseScene);
  game.scene.add('forest', ForestScene);
  game.scene.add('sea', SeaScene);
  game.scene.add('sky', SkyScene);
  for (const home of ['coop', 'barn', 'shed'] as const) game.scene.add(home, new AnimalScene(home));
  const fresh = state.day === 1 && state.minutes === DAY_START;
  game.scene.add('boot', BootScene, true, {
    state, hud,
    message: fresh ? 'Chào mừng tới nông trại! Cầm cuốc (phím 1) và bấm Space trước mặt để cuốc đất.' : `Ngày ${state.day} — chúc một ngày làm vườn vui vẻ!`,
  });
  running = { hud, game };
  // Nhận thư bạn bè (tưới giúp, quà) và gửi ảnh chụp nông trại
  syncFriends(state, hud, () => game.scene.getScenes(true).forEach((sc) => sc instanceof WorldScene && sc.debugRefresh()));
  // Chỉ khi dev: cho script test điều khiển được
  if (import.meta.env.DEV) {
    (window as unknown as { __game: Phaser.Game }).__game = game;
    mountDebug(game);
  }
}

/** Luồng vào game: trang bìa → sảnh → chơi. Trong game bấm Tab mở lại sảnh. */
let running: { hud: Hud; game: Phaser.Game } | null = null;

function showLobby() {
  openLobby({
    inGame: !!running,
    play: (_slot, s) => launch(s),
    resume: () => running?.hud.pause(false),
    openSettings: showSettingsModal,
    onLook: () => { if (running) void reloadLook(running.game, running.hud); },
  });
}

/** Đổi ngoại hình khi game đang chạy: dựng lại hình rồi khởi động lại cảnh (giữ nguyên trạng thái, vẫn tạm dừng). */
async function reloadLook(game: Phaser.Game, hud: Hud) {
  const sc = game.scene.getScenes(true).find((x): x is WorldScene => x instanceof WorldScene);
  const dropOld = await installPlayerSheets(game, session.profile.look);
  if (!sc) return dropOld();
  sc.events.once('create', () => {
    hud.pause(!!document.querySelector('.lobby'));
    window.setTimeout(dropOld, 100);
  });
  sc.scene.restart({ state: sc.debugState(), hud });
}

function launch(s: FarmState) {
  session.live = s;
  if (running) return;
  start(s);
}

attachProfile();
applyUiScale();
window.addEventListener('lobby:open', () => {
  if (!running || document.querySelector('.lobby')) return;
  running.hud.pause(true);
  showLobby();
});
showCover(showLobby, showSettingsModal);
