// Co-op thời gian thực: kết nối phòng (Cloudflare), vào/rời phòng, đồng bộ đất, vị trí, chat, ngủ chung.
// Chủ phòng giữ bản gốc của đất: khách gửi thay đổi cho chủ, chủ áp vào rồi phát lại cho cả nhóm.
import type { FarmState } from '../game/farm';
import type { Look } from '../data';
import type { Dir } from '../game/player';
import { applyPatch, applyWorld, clockOf, compose, homeBackup, withHome, worldOf, WorldTracker, type WorldPatch, type WorldSnap } from '../game/coopWorld';
import { saveGame, setSaveHook } from '../game/save';
import { session } from '../game/session';
import { call, loadIdentity } from './friends';

export interface Remote { c: string; n: string; h: boolean; x: number; y: number; loc: string; dir: Dir; moving: boolean; look?: Look; chat?: { text: string; until: number } }

/** Cảnh đang chơi làm những việc co-op cần (boot.ts nối vào). */
export interface CoopCtx {
  state(): FarmState | null;
  /** Cảnh đang chạy (để vẽ lại sau khi nhận thay đổi, chạy qua đêm cho khách…). */
  scene(): { debugRefresh(): void; coopNight(w: WorldSnap): void; coopSleepNow(): void; coopMessage?(m: Msg): void } | undefined;
  switchTo(s: FarmState, scene: string, spawn: string, message?: string): void;
  toast(m: string): void;
  bar(): void;
}
type Msg = { t: string; from?: string; [k: string]: unknown };

/** Máy chủ phòng trên Cloudflare (điền sau khi deploy `coop/`); để trống = chưa bật co-op trên bản web. */
const PROD_URL = 'wss://nha-thang-phong-coop.nha-thang-phong-coop.workers.dev';
const coopUrl = () => {
  const env = import.meta.env.VITE_COOP_URL as string | undefined;
  if (env) return env;
  const local = !location.hostname || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  return local ? 'ws://localhost:8789' : PROD_URL;
};

export const coop = {
  role: null as null | 'host' | 'guest',
  room: '',
  hostName: '',
  me: '',
  remotes: new Map<string, Remote>(),
  /** Ai đã lên giường (chủ phòng đếm). */
  ready: new Set<string>(),
  /** Khách: đã nhận bản đất đầu tiên, đang ở nông trại bạn. */
  inside: false,
};

let ctx: CoopCtx | null = null;
let ws: WebSocket | null = null;
let tracker: WorldTracker | null = null;
let home: Record<string, unknown> | null = null;
let retry = 0;
let closing = false;
let dirty = false;
let timers: number[] = [];

export const initCoop = (c: CoopCtx) => { ctx = c; };
export const inCoop = () => !!coop.role;
/** Có máy chủ co-op để kết nối không (bản web chỉ bật khi đã deploy máy chủ phòng). */
export const coopAvailable = () => !!coopUrl();
export const isGuest = () => coop.role === 'guest';
export const others = () => [...coop.remotes.values()];

function send(m: object) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
}

async function ticket(room: string) {
  const id = loadIdentity();
  if (!id) throw new Error('Cần đăng ký bạn bè trước (phím B)');
  return call<{ ticket: string; room: string; host: boolean; hostName: string }>(id.url, `/api/coop/${room}/ticket`, { token: id.token, body: {} });
}

/** Chủ phòng mở phòng ở nông trại của mình. */
export async function hostRoom() {
  if (coop.role) throw new Error('Đang ở trong phòng co-op rồi');
  const id = loadIdentity();
  if (!id) throw new Error('Cần đăng ký bạn bè trước (phím B)');
  await connect(id.code, 'host');
}

/** Vào phòng co-op của bạn (bạn phải đang mở phòng). */
export async function joinRoom(code: string) {
  if (coop.role) throw new Error('Đang ở trong phòng co-op rồi');
  await connect(code.toUpperCase(), 'guest');
}

async function connect(room: string, role: 'host' | 'guest') {
  const t = await ticket(room);
  coop.role = role;
  coop.room = t.room;
  coop.hostName = t.hostName;
  closing = false;
  await new Promise<void>((resolve, reject) => {
    const sock = new WebSocket(`${coopUrl()}/room/${t.room}?t=${encodeURIComponent(t.ticket)}`);
    ws = sock;
    let opened = false;
    sock.onopen = () => { opened = true; retry = 0; resolve(); };
    sock.onerror = () => { if (!opened) { reset(); reject(new Error('Không kết nối được máy chủ co-op')); } };
    sock.onmessage = (e) => { try { onMessage(JSON.parse(e.data)); } catch (err) { console.error(err); } };
    sock.onclose = () => { if (ws === sock) onClose(); };
  });
  startTimers();
  ctx?.bar();
}

function onClose() {
  ws = null;
  if (closing || !coop.role) return;
  // Rớt mạng: nối lại (lấy vé mới), tối đa 6 lần
  if (retry++ >= 6) return leaveRoom('Mất kết nối phòng co-op');
  ctx?.toast('Mất kết nối co-op — đang nối lại…');
  const role = coop.role;
  const room = coop.room;
  window.setTimeout(async () => {
    if (!coop.role) return;
    coop.role = null;
    try { await connect(room, role); } catch { onClose(); }
  }, Math.min(15_000, 1000 * 2 ** retry));
}

function reset() {
  for (const t of timers) clearInterval(t);
  timers = [];
  coop.role = null;
  coop.room = '';
  coop.inside = false;
  coop.remotes.clear();
  coop.ready.clear();
  tracker = null;
  ws = null;
}

/** Rời phòng. Khách về lại nông trại của mình (mang theo đồ, tiền đã kiếm). */
export function leaveRoom(reason?: string) {
  const wasGuest = coop.role === 'guest' && coop.inside;
  closing = true;
  send({ t: 'bye' });
  ws?.close();
  reset();
  const s = ctx?.state();
  if (wasGuest && s && home) {
    const mine = withHome(s, home);
    home = null;
    setSaveHook(null);
    saveGame(mine);
    session.live = mine;
    ctx?.switchTo(mine, mine.location ?? 'farm', 'default', reason ?? 'Đã về nông trại của mình');
  } else if (reason) ctx?.toast(reason);
  home = null;
  setSaveHook(null);
  ctx?.bar();
}

function startTimers() {
  for (const t of timers) clearInterval(t);
  timers = [
    // Gửi phần đất vừa đổi (mọi người) — chủ gửi cho cả nhóm, khách gửi cho chủ
    window.setInterval(() => {
      const s = ctx?.state();
      if (!s || !tracker || (coop.role === 'guest' && !coop.inside)) return;
      const p = tracker.poll(s);
      if (p) send({ t: 'patch', p });
    }, 250),
    // Chủ phòng: đồng hồ chung
    window.setInterval(() => {
      const s = ctx?.state();
      if (coop.role === 'host' && s && coop.remotes.size) send({ t: 'clock', ...clockOf(s) });
    }, 3000),
    // Vẽ lại sau khi nhận thay đổi (gom lại, không vẽ mỗi tin)
    window.setInterval(() => { if (dirty) { dirty = false; ctx?.scene()?.debugRefresh(); } }, 150),
  ];
}

function meMsg(to?: string) {
  send({ t: 'me', to, n: session.profile.name, look: session.profile.look });
}

function onMessage(m: Msg) {
  const s = ctx?.state();
  switch (m.t) {
    case 'hello': {
      coop.me = m.me as string;
      for (const p of m.players as { c: string; n: string; h: boolean }[]) coop.remotes.set(p.c, { ...p, x: 0, y: 0, loc: '', dir: 'down', moving: false });
      meMsg();
      if (coop.role === 'host' && s) {
        tracker = new WorldTracker(s);
        if (coop.remotes.size) send({ t: 'snap', w: worldOf(s) }); // chủ vào lại: gửi lại đất cho cả nhóm
        ctx?.toast('Đã mở phòng co-op — bạn bè bấm "Chơi cùng" ở bảng bạn bè để vào');
      } else ctx?.toast(`Đang vào nông trại của ${coop.hostName}…`);
      break;
    }
    case 'join': {
      coop.remotes.set(m.c as string, { c: m.c as string, n: m.n as string, h: !!m.h, x: 0, y: 0, loc: '', dir: 'down', moving: false });
      meMsg(m.c as string);
      if (coop.role === 'host' && s) send({ t: 'snap', to: m.c, w: worldOf(s) });
      ctx?.toast(`${m.n} đã vào phòng`);
      ctx?.bar();
      break;
    }
    case 'me': {
      const r = coop.remotes.get(m.from!);
      if (r) { r.n = m.n as string; r.look = m.look as Look; }
      break;
    }
    case 'pos': {
      const r = coop.remotes.get(m.from!);
      if (r) Object.assign(r, { x: m.x, y: m.y, loc: m.loc, dir: m.dir, moving: m.moving });
      break;
    }
    case 'chat': {
      const r = coop.remotes.get(m.from!);
      const text = String(m.text ?? '').slice(0, 80);
      if (r) r.chat = { text, until: Date.now() + 5000 };
      ctx?.toast(`${r?.n ?? 'Bạn'}: ${text}`);
      break;
    }
    case 'leave': {
      const r = coop.remotes.get(m.c as string);
      coop.remotes.delete(m.c as string);
      coop.ready.delete(m.c as string);
      if (r) ctx?.toast(`${r.n} đã rời phòng`);
      ctx?.bar();
      maybeSleep();
      break;
    }
    case 'snap': {
      if (coop.role !== 'guest' || !s) break;
      const w = m.w as WorldSnap;
      if (!coop.inside) {
        // Vào phòng: cất nông trại của mình, dùng đất + giờ của chủ phòng
        home = homeBackup(s);
        const g = compose(s, w);
        setSaveHook((x) => withHome(x, home!));
        tracker = new WorldTracker(g);
        coop.inside = true;
        session.live = g;
        ctx?.switchTo(g, 'farm', 'cart', `Đang ở nông trại của ${coop.hostName} — cùng làm nhé!`);
      } else {
        applyWorld(s, w);
        tracker?.reset(s);
        dirty = true;
      }
      ctx?.bar();
      break;
    }
    case 'patch': {
      if (!s || !tracker || (coop.role === 'guest' && !coop.inside)) break;
      const p = m.p as WorldPatch;
      applyPatch(s, p);
      tracker.absorb(p);
      if (coop.role === 'host') send({ t: 'patch', p }); // phát lại cho các khách khác
      dirty = true;
      break;
    }
    case 'clock': {
      if (coop.role === 'guest' && s && coop.inside) Object.assign(s, { day: m.day, minutes: m.minutes, weather: m.weather, tomorrow: m.tomorrow });
      break;
    }
    case 'ready': {
      if (coop.role !== 'host') break;
      coop.ready.add(m.from!);
      const r = coop.remotes.get(m.from!);
      ctx?.toast(`${r?.n ?? 'Bạn'} đã lên giường (${coop.ready.size}/${coop.remotes.size + 1})`);
      maybeSleep();
      break;
    }
    case 'night': {
      if (coop.role === 'guest' && coop.inside) { coop.ready.clear(); ctx?.scene()?.coopNight(m.w as WorldSnap); }
      break;
    }
    case 'error':
    case 'closed':
    case 'kick': {
      const why = String(m.reason ?? (m.t === 'kick' ? 'Chủ phòng đã mời bạn ra' : 'Phòng đã đóng'));
      closing = true;
      leaveRoom(why);
      break;
    }
    default:
      ctx?.scene()?.coopMessage?.(m);
  }
}

// ---------------------------------------------------------------- dành cho cảnh

/** Vị trí của mình (cảnh gọi vài lần mỗi giây). */
export function sendPos(p: { x: number; y: number; loc: string; dir: Dir; moving: boolean }) {
  send({ t: 'pos', ...p });
}

export function sendChat(text: string) {
  const t = text.trim().slice(0, 80);
  if (t) send({ t: 'chat', text: t });
}

/** Tin riêng của cảnh (quái trong hang…). */
export const sendRaw = (m: object) => send(m);

/**
 * Đi ngủ trong co-op. Trả về true nếu co-op lo (không ngủ ngay):
 * - khách: báo đã lên giường, chờ chủ phòng cho cả nhóm qua đêm
 * - chủ: chờ mọi người lên giường (ngất lúc 2h thì qua đêm luôn)
 */
export function coopSleep(passedOut: boolean): boolean {
  if (coop.role === 'guest' && coop.inside) {
    send({ t: 'ready' });
    ctx?.toast(passedOut ? 'Khuya quá — chờ chủ phòng cho cả nhóm qua đêm' : 'Đã lên giường — chờ cả nhóm đi ngủ');
    return true;
  }
  if (coop.role === 'host' && !passedOut && coop.remotes.size) {
    coop.ready.add(coop.me);
    if (coop.ready.size <= coop.remotes.size) {
      ctx?.toast(`Đã lên giường — chờ bạn bè (${coop.ready.size}/${coop.remotes.size + 1})`);
      return true;
    }
  }
  return false;
}

function maybeSleep() {
  if (coop.role !== 'host' || !coop.ready.has(coop.me)) return;
  if (coop.ready.size > coop.remotes.size) ctx?.scene()?.coopSleepNow();
}

/** Chủ phòng vừa qua đêm: gửi đất + ngày mới cho cả nhóm. */
export function afterHostNight(s: FarmState) {
  if (coop.role !== 'host') return;
  coop.ready.clear();
  tracker?.reset(s);
  send({ t: 'night', w: worldOf(s) });
}

/** Khách vừa qua đêm theo chủ: ghi nhận đất mới. */
export function afterGuestNight(s: FarmState) {
  tracker?.reset(s);
}
