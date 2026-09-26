// Ghép hình nhân vật người chơi lúc chạy: nhân vật gốc Sprout Lands → đổi màu lông/áo → chồng lớp nón, đồ trên mặt.
// Dùng cho cả Phaser (spritesheet) và giao diện HTML (ảnh xem trước).
import { BODY_COLORS, SHIRT_COLORS, type Look } from '../data';

const SRC = { char: '/Characters/Basic Charakter Spritesheet.png', actions: '/Characters/Basic Charakter Actions.png' };
export type SheetKind = keyof typeof SRC;

const images = new Map<string, Promise<HTMLImageElement>>();
function img(url: string) {
  let p = images.get(url);
  if (!p) {
    p = new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error(`Không tải được ${url}`));
      i.src = encodeURI(url);
    });
    images.set(url, p);
  }
  return p;
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const BODY = [243, 242, 192];
const BODY2 = [243, 216, 197];
const SHIRT = [118, 109, 170];
const same = (d: Uint8ClampedArray, i: number, c: number[]) => d[i] === c[0] && d[i + 1] === c[1] && d[i + 2] === c[2];

const sheets = new Map<string, Promise<HTMLCanvasElement>>();
export const lookKey = (l: Look) => `${l.body}-${l.shirt}-${l.hat}-${l.face}`;

/** Spritesheet đã ghép cho ngoại hình `look` (có bộ nhớ đệm). */
export function buildSheet(look: Look, kind: SheetKind): Promise<HTMLCanvasElement> {
  const k = `${kind}:${lookKey(look)}`;
  let p = sheets.get(k);
  if (!p) {
    p = (async () => {
      const base = await img(SRC[kind]);
      const c = document.createElement('canvas');
      c.width = base.width;
      c.height = base.height;
      const g = c.getContext('2d')!;
      g.drawImage(base, 0, 0);
      const data = g.getImageData(0, 0, c.width, c.height);
      const d = data.data;
      const body = hex(BODY_COLORS[look.body] ?? BODY_COLORS[0]);
      const body2 = body.map((v) => Math.round(v * 0.93));
      const shirt = hex(SHIRT_COLORS[look.shirt] ?? SHIRT_COLORS[0]);
      const collar = shirt.map((v) => Math.round(v * 0.72));
      const W = c.width;
      // Từng khung 48×48: phần thân nằm dưới khăn quàng cổ (màu tím gốc) là "áo"
      for (let fy = 0; fy < c.height; fy += 48) {
        for (let fx = 0; fx < W; fx += 48) {
          let collarTop = Infinity;
          for (let y = fy; y < fy + 48 && collarTop === Infinity; y++) for (let x = fx; x < fx + 48; x++) {
            if (same(d, (y * W + x) * 4, SHIRT)) { collarTop = y; break; }
          }
          for (let y = fy; y < fy + 48; y++) for (let x = fx; x < fx + 48; x++) {
            const i = (y * W + x) * 4;
            if (!d[i + 3]) continue;
            const torso = y > collarTop;
            const to = same(d, i, SHIRT) ? collar : same(d, i, BODY) ? (torso ? shirt : body) : same(d, i, BODY2) ? (torso ? shirt : body2) : null;
            if (to) { d[i] = to[0]; d[i + 1] = to[1]; d[i + 2] = to[2]; }
          }
        }
      }
      g.putImageData(data, 0, 0);
      for (const layer of [look.hat ? `hat_${look.hat}` : null, look.face ? `face_${look.face}` : null]) {
        if (layer) g.drawImage(await img(`/Custom/player/${layer}_${kind}.png`), 0, 0);
      }
      return c;
    })();
    sheets.set(k, p);
  }
  return p;
}

/** Ảnh một khung (48×48, bảng đi lại) phóng to — cho giao diện HTML. Khung 0 = đứng nhìn xuống. */
export async function avatarURL(look: Look, frame = 0, scale = 4) {
  const sheet = await buildSheet(look, 'char');
  const c = document.createElement('canvas');
  // Cắt sát nhân vật: bỏ phần trống quanh khung 48×48
  const crop = { x: 8, y: 6, w: 32, h: 32 };
  c.width = crop.w * scale;
  c.height = crop.h * scale;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(sheet, (frame % 4) * 48 + crop.x, Math.floor(frame / 4) * 48 + crop.y, crop.w, crop.h, 0, 0, c.width, c.height);
  return c.toDataURL();
}

/** Đặt ảnh nhân vật làm nền cho phần tử (bất đồng bộ). */
export function paintAvatar(el: HTMLElement, look: Look, frame = 0, scale = 4) {
  avatarURL(look, frame, scale).then((u) => {
    el.style.backgroundImage = `url(${u})`;
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
  }).catch(() => {});
}
