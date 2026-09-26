// Điều khiển cảm ứng (điện thoại, máy tính bảng): cần điều khiển ảo, nút Dùng / Ăn, thanh nút thay phím tắt.
// Các nút gửi đúng phím tắt đang có (Space, F, I, K…) nên mọi bảng trong game dùng chung một đường.
import './touch.css';
import { sendAction, type Action } from '../game/controls';

/** Hướng đi từ cần điều khiển (-1…1), PlayerController đọc mỗi khung hình. */
export const touchInput = { vx: 0, vy: 0 };

/** Đổi chữ hướng dẫn nói về phím sang nút cảm ứng (khi đang chơi bằng cảm ứng). */
export function touchText(t: string) {
  if (!document.body.classList.contains('touch')) return t;
  return t
    .replace(/<kbd>Space<\/kbd>(\s*\/\s*<kbd>[^<]*<\/kbd>)*/g, 'nút <b>Dùng</b>').replace(/\bbấm Space\b/g, 'bấm nút Dùng').replace(/\bSpace\b/g, 'nút Dùng')
    .replace(/\(phím (\d)\)/g, '(ô $1)').replace(/phím <kbd>F<\/kbd>|\(F\)/g, 'nút Ăn').replace(/<kbd>([IKBMC])<\/kbd>/g, (_m, k: string) => ({ I: 'Túi', K: 'Chế tạo', B: 'Bạn bè', M: 'Bản đồ', C: 'Lịch' })[k] ?? k);
}

export const isTouchDevice = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

const MENU: [string, Action][] = [
  ['Túi', 'inventory'], ['Chế tạo', 'craft'], ['Bạn bè', 'friends'], ['Bản đồ', 'map'], ['Lịch', 'calendar'], ['Sổ tay', 'wiki'], ['Sảnh', 'lobby'], ['⚙', 'settings'],
];

let mounted = false;

export function mountTouch() {
  if (mounted || !isTouchDevice()) return;
  mounted = true;
  document.body.classList.add('touch');
  const root = document.createElement('div');
  root.className = 'touch-ui';
  root.innerHTML = `
    <div class="tj"><div class="tj__knob"></div></div>
    <div class="tb">
      <button class="tb__btn tb__use" data-act="use">Dùng</button>
      <button class="tb__btn tb__eat" data-act="eat">Ăn</button>
    </div>
    <div class="tm">${MENU.map(([label, act]) => `<button class="tm__btn" data-act="${act}">${label}</button>`).join('')}</div>`;
  const rotate = document.createElement('div');
  rotate.className = 'rotate';
  rotate.innerHTML = '<div><b>Xoay ngang điện thoại</b><span>Nhà Thằng Phong chơi ở màn hình ngang</span></div>';
  document.body.append(root, rotate);

  root.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) => {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('on'); sendAction(b.dataset.act as Action); });
    const off = () => b.classList.remove('on');
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
  });

  // Cần điều khiển: kéo núm trong vòng tròn, lệch càng xa đi càng nhanh
  const pad = root.querySelector<HTMLElement>('.tj')!;
  const knob = root.querySelector<HTMLElement>('.tj__knob')!;
  let id: number | null = null;
  const move = (e: PointerEvent) => {
    const r = pad.getBoundingClientRect();
    const R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const dead = 0.18;
    const k = Math.min(1, d / R);
    touchInput.vx = k < dead ? 0 : dx / R;
    touchInput.vy = k < dead ? 0 : dy / R;
  };
  const end = () => { id = null; knob.style.transform = ''; touchInput.vx = touchInput.vy = 0; };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); id = e.pointerId; pad.setPointerCapture(e.pointerId); move(e); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  // Mở bảng (túi, cửa hàng…) thì thả cần để nhân vật không đi tiếp
  window.addEventListener('blur', end);
}
