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
    <div class="tm">${MENU.map(([label, act]) => `<button class="tm__btn" data-act="${act}">${label}</button>`).join('')}${canFullscreen() ? '<button class="tm__btn tm__fs" aria-label="Toàn màn hình">⛶</button>' : ''}</div>`;
  document.body.append(root, mountRotate());

  root.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) => {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('on'); sendAction(b.dataset.act as Action); });
    const off = () => b.classList.remove('on');
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
  });

  // Nút toàn màn hình (Android): vào/thoát toàn màn hình, vào thì thử khoá ngang luôn
  root.querySelector('.tm__fs')?.addEventListener('click', () => {
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
    else void goLandscape();
  });

  // Cần điều khiển: kéo núm trong vòng tròn, lệch càng xa đi càng nhanh
  const pad = root.querySelector<HTMLElement>('.tj')!;
  const knob = root.querySelector<HTMLElement>('.tj__knob')!;
  let id: number | null = null;
  const move = (e: PointerEvent) => {
    const r = pad.getBoundingClientRect();
    const R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
    // Game đang tự xoay 90°: đổi hướng kéo trên màn hình sang hướng trong game
    if (isRotated()) [dx, dy] = [dy, -dx];
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

// ---------------------------------------------------------------- xoay game ngang (khi trình duyệt không chịu xoay)
// iPhone có khi không xoay trình duyệt dù đã tắt khoá xoay. Khi đó cả trang tự quay 90° bên trong màn dọc:
// người chơi cầm máy nằm ngang như bình thường. Toạ độ chạm được đổi lại cho Phaser (boot.ts) và cần điều khiển.
const ROT_KEY = 'nongtrai.ui.rot90';

function rotPref() {
  try { return localStorage.getItem(ROT_KEY) === '1'; } catch { return false; }
}

/** Đang xoay trang 90° (máy đứng dọc mà người chơi chọn xoay game). */
export const isRotated = () => document.body.classList.contains('rot90');

/** Bật/tắt theo lựa chọn + hướng thật của màn: máy đã ngang thì không cần xoay. */
export function updateRotation() {
  const on = isTouchDevice() && rotPref() && window.innerHeight > window.innerWidth;
  const root = document.documentElement.style;
  root.setProperty('--rw', `${window.innerHeight}px`);
  root.setProperty('--rh', `${window.innerWidth}px`);
  root.setProperty('--vw', on ? `${window.innerHeight / 100}px` : '1vw');
  root.setProperty('--vh', on ? `${window.innerWidth / 100}px` : '1vh');
  if (on === isRotated()) return;
  document.body.classList.toggle('rot90', on);
  window.dispatchEvent(new Event('resize'));
}

export function setRotatePref(on: boolean) {
  try { if (on) localStorage.setItem(ROT_KEY, '1'); else localStorage.removeItem(ROT_KEY); } catch { /* bỏ qua */ }
  updateRotation();
}
export const rotatePref = rotPref;

// ---------------------------------------------------------------- màn dọc
// Điện thoại bật "Khóa xoay dọc" (iPhone) / tắt "Tự động xoay" (Android) thì trình duyệt không bao giờ xoay ngang,
// còn Safari iPhone không cho trang tự khoá hướng màn. Nên màn nhắc xoay chỉ là lời khuyên: luôn có nút chơi tiếp.
const PORTRAIT_KEY = 'nongtrai.ui.portraitOk';

function portraitOk() {
  try { return localStorage.getItem(PORTRAIT_KEY) === '1'; } catch { return false; }
}

function setPortraitOk(on: boolean) {
  document.body.classList.toggle('portrait-ok', on);
  try { if (on) localStorage.setItem(PORTRAIT_KEY, '1'); else localStorage.removeItem(PORTRAIT_KEY); } catch { /* bỏ qua */ }
}

const canFullscreen = () => !!(document.fullscreenEnabled || (document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled);

type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };

/** Vào toàn màn hình rồi khoá ngang (Chrome Android làm được; Safari iPhone thì không). Trả về true nếu đã xoay được. */
export async function goLandscape(): Promise<boolean> {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  try {
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else el.webkitRequestFullscreen?.();
    }
  } catch { /* máy không cho toàn màn hình */ }
  try {
    const o = screen.orientation as LockableOrientation | undefined;
    if (o?.lock) await o.lock('landscape');
  } catch { /* không khoá được hướng (iPhone, hoặc chưa toàn màn hình) */ }
  // Chờ trình duyệt đổi cỡ xong rồi mới xem đã ngang chưa
  await new Promise((r) => setTimeout(r, 350));
  return !matchMedia('(orientation: portrait)').matches;
}

function mountRotate() {
  const rotate = document.createElement('div');
  rotate.className = 'rotate';
  rotate.innerHTML = `<div class="rotate__box">
    <b>Xoay ngang điện thoại</b>
    <span>Nhà Thằng Phong chơi đẹp nhất ở màn hình ngang</span>
    <p class="rotate__tip">Đã xoay mà không đổi? Có thể máy đang <b>khoá xoay</b>:<br>
      • <b>iPhone</b>: vuốt từ góc phải trên xuống → tắt biểu tượng ổ khoá 🔒<br>
      • <b>Android</b>: kéo thanh thông báo xuống → bật <b>Tự động xoay</b></p>
    <div class="rotate__btns">
      <button class="rotate__btn rotate__btn--go" data-rot="turn">Xoay game ngang (cầm máy nằm ngang)</button>
      <button class="rotate__btn" data-rot="fs">Toàn màn hình &amp; xoay ngang</button>
      <button class="rotate__btn" data-rot="portrait">Chơi màn dọc</button>
    </div>
    <small class="rotate__msg"></small>
  </div>`;
  if (portraitOk()) document.body.classList.add('portrait-ok');
  const msg = rotate.querySelector<HTMLElement>('.rotate__msg')!;
  const fs = rotate.querySelector<HTMLButtonElement>('[data-rot="fs"]')!;
  // Không có cách nào vào toàn màn hình (Safari iPhone) thì ẩn nút cho khỏi bấm vô ích
  if (!canFullscreen()) fs.hidden = true;
  fs.addEventListener('click', async () => {
    msg.textContent = '';
    if (!(await goLandscape())) msg.textContent = 'Máy không cho tự xoay — hãy tắt khoá xoay rồi xoay ngang, hoặc bấm “Chơi màn dọc”.';
  });
  rotate.querySelector('[data-rot="portrait"]')!.addEventListener('click', () => setPortraitOk(true));
  rotate.querySelector('[data-rot="turn"]')!.addEventListener('click', () => setRotatePref(true));
  const again = () => { updateRotation(); window.setTimeout(updateRotation, 400); };
  window.addEventListener('resize', updateRotation);
  window.addEventListener('orientationchange', again);
  updateRotation();
  const land = matchMedia('(orientation: landscape)');
  land.addEventListener?.('change', () => { if (land.matches) msg.textContent = ''; });
  return rotate;
}
