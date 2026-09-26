import { openSavePanel } from './savePanel';
// Trang bìa: cảnh nhiều lớp đổi theo mùa & giờ thật, lệch nhẹ theo chuột; ngày lễ thật có trang trí riêng.
import ICONS from '../../assets/Custom/icons.json';
import { music } from '../audio/sound';
import type { Season } from '../data';
import { applyVolume } from '../audio/sound';
import { saveSettings, settings } from './settings';
import './lobby.css';

const LAYERS = ['sky', 'far', 'near', 'field', 'props'] as const;
const DEPTH = [0, 6, 12, 20, 28];

export function realSeason(d = new Date()): Season {
  const m = d.getMonth() + 1;
  return m <= 3 ? 'spring' : m <= 6 ? 'summer' : m <= 9 ? 'fall' : 'winter';
}
export const isNight = (d = new Date()) => d.getHours() >= 18 || d.getHours() < 6;

export type Holiday = 'tet' | 'trung_thu' | 'noel' | null;
/** Ngày lễ theo lịch thật (Tết, Trung Thu tính gần đúng theo tháng dương). */
export function holiday(d = new Date()): Holiday {
  const m = d.getMonth() + 1, day = d.getDate();
  if ((m === 1 && day >= 20) || (m === 2 && day <= 20)) return 'tet';
  if (m === 9) return 'trung_thu';
  if (m === 12 && day >= 15) return 'noel';
  return null;
}

const SEASON_LABEL: Record<Season, string> = { spring: 'Mùa xuân', summer: 'Mùa hè', fall: 'Mùa gặt', winter: 'Mùa đông' };
const HOLIDAY_LABEL: Record<Exclude<Holiday, null>, string> = { tet: 'Chúc mừng năm mới!', trung_thu: 'Trung Thu rước đèn', noel: 'Giáng sinh an lành' };

const iconBg = (name: keyof typeof ICONS, size: number) => {
  const i = ICONS[name];
  const cols = 16;
  const rows = Math.ceil(Object.keys(ICONS).length / cols);
  return `background-image:url('/Custom/icons.png');background-size:${cols * size}px ${rows * size}px;background-position:-${(i % cols) * size}px -${Math.floor(i / cols) * size}px`;
};

export function showCover(onEnter: () => void, openSettings: () => void) {
  const now = new Date();
  const season = realSeason(now);
  const night = isNight(now);
  const hol = holiday(now);
  const el = document.createElement('div');
  el.className = `cover${night ? ' cover--night' : ''}`;
  const scene = document.createElement('div');
  scene.className = 'cover__scene';
  const layers = LAYERS.map((l) => {
    const d = document.createElement('div');
    d.className = `cover__layer cover__layer--${l}`;
    d.style.backgroundImage = `url('/Custom/phase2/cover/${season}_${l}.png')`;
    scene.append(d);
    return d;
  });
  // Cửa sổ nhà sáng đèn ban đêm (toạ độ theo ảnh 320×180)
  if (night) {
    for (const x of [46, 74]) {
      const w = document.createElement('i');
      w.className = 'cover__window';
      w.style.left = `${(x / 320) * 100}%`;
      w.style.top = `${(98 / 180) * 100}%`;
      layers[4].append(w);
    }
    for (let i = 0; i < 16; i++) {
      const f = document.createElement('i');
      f.className = 'cover__firefly';
      f.style.left = `${8 + Math.random() * 84}%`;
      f.style.top = `${58 + Math.random() * 34}%`;
      f.style.animationDelay = `${-Math.random() * 6}s`;
      f.style.animationDuration = `${4 + Math.random() * 4}s`;
      scene.append(f);
    }
  }
  // Trang trí ngày lễ: đèn lồng đỏ (Tết), đèn ông sao (Trung Thu), tuyết (Noel); cánh hoa rơi mùa xuân
  const deco = document.createElement('div');
  deco.className = 'cover__deco';
  if (hol === 'tet' || hol === 'trung_thu') {
    for (let i = 0; i < 7; i++) {
      const l = document.createElement('i');
      l.className = 'cover__lantern';
      l.style.left = `${6 + i * 14.5}%`;
      l.style.animationDelay = `${-i * 0.4}s`;
      l.setAttribute('style', `${l.getAttribute('style')};${iconBg(hol === 'tet' ? 'lantern' : 'star_lantern', 48)}`);
      deco.append(l);
    }
  }
  const fall = hol === 'noel' || season === 'winter' ? 'snow' : season === 'spring' || hol === 'tet' ? 'petal' : null;
  if (fall) {
    for (let i = 0; i < 26; i++) {
      const p = document.createElement('i');
      p.className = `cover__${fall}`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDelay = `${-Math.random() * 10}s`;
      p.style.animationDuration = `${7 + Math.random() * 6}s`;
      deco.append(p);
    }
  }
  const sub = hol ? HOLIDAY_LABEL[hol] : `${SEASON_LABEL[season]} · ${night ? 'đêm yên tĩnh' : 'ngày đẹp trời'}`;
  el.innerHTML = `<div class="cover__front">
      <div class="cover__logo"><h1>NHÀ THẰNG PHONG</h1><span class="cover__chick" aria-hidden="true"></span></div>
      <p class="cover__sub">${sub}</p>
      <div class="cover__buttons">
        <button type="button" class="btn btn--primary cover__go">Vào game</button>
        <div class="row"><button type="button" class="btn" data-a="settings">Cài đặt</button><button type="button" class="btn" data-a="credits">Ghi công</button></div>
      </div>
    </div>
    <footer class="cover__foot"><span>Phiên bản 2.0 · tự lưu khi đi ngủ</span><span>Cảnh nền đổi theo mùa và giờ thật</span><span>Làm cho vui, không thương mại</span></footer>`;
  el.prepend(scene, deco);
  document.body.append(el);

  const move = (e: PointerEvent) => {
    const dx = e.clientX / window.innerWidth - 0.5;
    const dy = e.clientY / window.innerHeight - 0.5;
    layers.forEach((l, i) => (l.style.transform = `translate(${-dx * DEPTH[i]}px, ${-dy * DEPTH[i] * 0.4}px)`));
  };
  window.addEventListener('pointermove', move);
  music.play(season, night);

  const close = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('keydown', key);
    el.classList.add('cover--out');
    window.setTimeout(() => el.remove(), 420);
    onEnter();
  };
  const key = (e: KeyboardEvent) => { if ((e.key === 'Enter' || e.code === 'Space') && !document.querySelector('.cover-modal')) { e.preventDefault(); close(); } };
  window.addEventListener('keydown', key);
  (el.querySelector('.cover__go') as HTMLButtonElement).onclick = close;
  (el.querySelector('[data-a=settings]') as HTMLButtonElement).onclick = openSettings;
  (el.querySelector('[data-a=credits]') as HTMLButtonElement).onclick = () => showCredits();
  (el.querySelector('.cover__go') as HTMLButtonElement).focus();
}

export function coverModal(html: string) {
  const m = document.createElement('div');
  m.className = 'title cover-modal';
  m.innerHTML = `<div class="panel credits">${html}<div class="row"><button class="btn btn--primary" data-close>Đóng</button></div></div>`;
  m.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => m.remove();
  document.body.append(m);
  m.querySelector<HTMLButtonElement>('[data-close]')!.focus();
  return m;
}

/** Hộp hỏi chọn một trong vài phương án; trả về phương án đã bấm. */
export function askChoice(html: string, options: { id: string; label: string; primary?: boolean }[]): Promise<string> {
  return new Promise((resolve) => {
    const m = document.createElement('div');
    m.className = 'title cover-modal';
    m.innerHTML = `<div class="panel credits">${html}<div class="row"></div></div>`;
    const row = m.querySelector('.row')!;
    for (const o of options) {
      const b = document.createElement('button');
      b.className = o.primary ? 'btn btn--primary' : 'btn';
      b.textContent = o.label;
      b.onclick = () => { m.remove(); resolve(o.id); };
      row.append(b);
    }
    document.body.append(m);
  });
}

export function showCredits() {
  coverModal(`<h2>Ghi công</h2>
    <p><b>Hình ảnh:</b> bộ <i>Sprout Lands</i> của <b>Cup Nooble</b> (cupnooble.itch.io) — dùng theo giấy phép của tác giả, không phát tán lại bộ hình gốc. Cây, cá, dân làng, khách mời, cảnh bìa vẽ thêm bằng script theo phong cách Sprout Lands.</p>
    <p><b>Chữ:</b> VT323 — Peter Hull (SIL Open Font License).</p>
    <p><b>Âm thanh & nhạc:</b> tự tổng hợp bằng WebAudio ngay trong game (thang ngũ cung), không dùng file ngoài.</p>
    <p><b>Công nghệ:</b> Phaser 3 (MIT), TypeScript, Vite. Làm cho vui, không thương mại.</p>`);
}

export function showSettingsModal() {
  const m = coverModal(`<h2>Cài đặt</h2>
    <label class="set__row"><span>Nhạc</span><input type="range" min="0" max="100" data-k="music"></label>
    <label class="set__row"><span>Tiếng động</span><input type="range" min="0" max="100" data-k="sfx"></label>
    <label class="set__row"><span>Cỡ chữ</span><input type="range" min="85" max="140" step="5" data-k="uiScale"></label>
    <div class="row"><button class="btn" data-saves>Bản lưu & khôi phục</button></div>`);
  m.querySelector<HTMLButtonElement>('[data-saves]')!.onclick = () => { m.remove(); openSavePanel(); };
  m.querySelectorAll<HTMLInputElement>('input[data-k]').forEach((inp) => {
    const k = inp.dataset.k as 'music' | 'sfx' | 'uiScale';
    inp.value = String(Math.round(settings[k] * 100));
    inp.oninput = () => { settings[k] = Number(inp.value) / 100; saveSettings(); applyVolume(); };
  });
}
