import '@fontsource/vt323/400.css';
import type { FarmState } from './game/farm';
import { watchUiScale } from './ui/settings';
import { mountTouch } from './ui/touch';
import { showCover, showSettingsModal } from './ui/cover';
import { openLobby } from './ui/lobby';
import { attachProfile, session } from './game/session';
import { reconcile } from './net/cloud';
import { watchErrors } from './net/errors';
import { askChoice } from './ui/cover';
import type { Hud } from './ui/hud';
import type Phaser from 'phaser';

const when = (t: number) => new Date(t).toLocaleString('vi-VN');

/** Luồng vào game: trang bìa → sảnh → chơi. Trong game bấm Tab mở lại sảnh. */
let running: { hud: Hud; game: Phaser.Game } | null = null;

function showLobby() {
  openLobby({
    inGame: !!running,
    play: (_slot, s) => launch(s),
    resume: () => running?.hud.pause(false),
    openSettings: showSettingsModal,
    onLook: () => { if (running) void import('./boot').then((b) => b.reloadLook(running!.game, running!.hud)); },
  });
}

async function launch(local: FarmState) {
  if (running) { session.live = local; return; }
  // So với bản trên mây: máy khác chơi tiếp thì lấy về; cả hai cùng có tiến độ mới thì hỏi
  const s = await reconcile(local, async (c) => {
    const cloud = JSON.parse(c.data) as FarmState;
    const pick = await askChoice(`<h2>Có bản lưu mới hơn trên mây</h2>
      <p>Trên máy này: <b>ngày ${local.day}</b>, lưu lúc ${when(local.savedAt ?? 0)}.</p>
      <p>Trên mây (máy khác): <b>ngày ${cloud.day}</b>, lưu lúc ${when(c.updated)}.</p>
      <p>Chọn bản muốn chơi tiếp. Bản còn lại vẫn được giữ trên mây để lấy lại (Cài đặt → Bản lưu).</p>`,
    [{ id: 'cloud', label: 'Dùng bản trên mây', primary: true }, { id: 'local', label: 'Giữ bản trên máy này' }]);
    return pick as 'cloud' | 'local';
  }).catch(() => local);
  session.live = s;
  // Tải phần game (Phaser) lúc này, có màn chờ
  const wait = document.createElement('div');
  wait.className = 'boot-wait';
  wait.textContent = 'Đang tải nông trại…';
  document.body.append(wait);
  try {
    const { start } = await import('./boot');
    running = start(s);
    document.body.classList.add('playing');
  } catch {
    wait.textContent = 'Không tải được game — kiểm tra mạng rồi tải lại trang';
    return;
  }
  wait.remove();
}

watchErrors();
attachProfile();
watchUiScale();
mountTouch();
window.addEventListener('lobby:open', () => {
  if (!running || document.querySelector('.lobby')) return;
  running.hud.pause(true);
  showLobby();
});
showCover(showLobby, showSettingsModal);
// Người chơi còn đang xem trang bìa / sảnh thì tải trước phần game cho lúc bấm Chơi khỏi chờ
window.setTimeout(() => void import('./boot').catch(() => {}), 1500);

// Cài như app + chơi khi mất mạng (chỉ bản build, không bật khi dev)
if (import.meta.env.PROD && 'serviceWorker' in navigator) window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => {}));
