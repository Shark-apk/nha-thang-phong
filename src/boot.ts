// Phần game chạy bằng Phaser (tải riêng, sau khi người chơi bấm Chơi) — trang bìa và sảnh hiện ra trước, không phải chờ 1,5 MB Phaser.
import Phaser from 'phaser';
import { BootScene } from './game/BootScene';
import { FarmScene } from './game/FarmScene';
import { HouseScene } from './game/HouseScene';
import { AnimalScene } from './game/AnimalScene';
import { MineScene } from './game/MineScene';
import { VillageScene } from './game/VillageScene';
import { GreenhouseScene } from './game/GreenhouseScene';
import { ForestScene, SeaScene, SkyScene } from './game/RegionScenes';
import { DAY_START, type FarmState } from './game/farm';
import { mountDebug } from './ui/debug';
import { Hud } from './ui/hud';
import { session } from './game/session';
import { installPlayerSheets } from './game/playerSheet';
import { syncFriends, WorldScene } from './game/WorldScene';
import { saveGame } from './game/save';
import { pushCloud } from './net/cloud';
import * as net from './net/friends';

export function start(state: FarmState) {
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
  document.body.classList.add('playing');
  // Tự lưu: khi ẩn / đóng tab; lên mây mỗi 5 phút
  const saveNow = () => { if (session.live) saveGame(session.live); };
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
  // Thư bạn bè (tưới giúp, quà, tim, bán được hàng) nhận ngay trong lúc chơi, mỗi phút một lần
  window.setInterval(async () => {
    const sc = game.scene.getScenes(true).find((x): x is WorldScene => x instanceof WorldScene);
    if (!session.live || !net.loadIdentity() || !sc || sc.visiting || document.visibilityState === 'hidden') return;
    try {
      const msgs = await net.fetchInbox();
      if (!msgs.length) return;
      const lines = net.applyInbox(session.live, msgs);
      saveNow();
      sc.debugRefresh();
      if (lines.length) hud.toast(lines.join(' · '));
      document.querySelector('.tm__btn[data-act="friends"]')?.classList.add('dot');
    } catch { /* mất mạng thì phút sau thử lại */ }
  }, 60_000);
  window.setInterval(async () => {
    if (!session.live) return;
    saveNow();
    if ((await pushCloud(session.live)) === 'conflict') hud.toast('Máy khác vừa lưu bản mới hơn lên mây — lần mở game sau sẽ hỏi giữ bản nào');
  }, 5 * 60_000);
  // Nhận thư bạn bè (tưới giúp, quà) và gửi ảnh chụp nông trại
  syncFriends(state, hud, () => game.scene.getScenes(true).forEach((sc) => sc instanceof WorldScene && sc.debugRefresh()));
  // Chỉ khi dev: cho script test điều khiển được
  if (import.meta.env.DEV) {
    (window as unknown as { __game: Phaser.Game }).__game = game;
    mountDebug(game);
  }
  return { hud, game };
}

/** Đổi ngoại hình khi game đang chạy: dựng lại hình rồi khởi động lại cảnh (giữ nguyên trạng thái, vẫn tạm dừng). */
export async function reloadLook(game: Phaser.Game, hud: Hud) {
  const sc = game.scene.getScenes(true).find((x): x is WorldScene => x instanceof WorldScene);
  const dropOld = await installPlayerSheets(game, session.profile.look);
  if (!sc) return dropOld();
  sc.events.once('create', () => {
    hud.pause(!!document.querySelector('.lobby'));
    window.setTimeout(dropOld, 100);
  });
  sc.scene.restart({ state: sc.debugState(), hud });
}

