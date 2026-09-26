// Dữ liệu server bạn bè (SQLite có sẵn trong Node ≥ 22): người chơi, bạn bè, ảnh chụp nông trại, tưới giúp, quà.
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ chữ dễ nhầm (0/O, 1/I)
export const MAX_SNAPSHOT = 300_000;
export const MAX_GIFT_QTY = 99;

export function openDb(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, token TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      snapshot TEXT, updated INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS friends (a INTEGER NOT NULL, b INTEGER NOT NULL, PRIMARY KEY (a, b));
    CREATE TABLE IF NOT EXISTS inbox (
      id INTEGER PRIMARY KEY, to_id INTEGER NOT NULL, from_id INTEGER NOT NULL, kind TEXT NOT NULL,
      data TEXT NOT NULL, created INTEGER NOT NULL, delivered INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS helped (from_id INTEGER NOT NULL, to_id INTEGER NOT NULL, date TEXT NOT NULL, PRIMARY KEY (from_id, to_id, date));
    CREATE TABLE IF NOT EXISTS likes (from_id INTEGER NOT NULL, to_id INTEGER NOT NULL, date TEXT NOT NULL, PRIMARY KEY (from_id, to_id, date));
    CREATE TABLE IF NOT EXISTS contest (
      contest TEXT NOT NULL, player_id INTEGER NOT NULL, item TEXT NOT NULL, q INTEGER NOT NULL, score INTEGER NOT NULL, updated INTEGER NOT NULL,
      PRIMARY KEY (contest, player_id));
    CREATE TABLE IF NOT EXISTS market (
      id INTEGER PRIMARY KEY, seller INTEGER NOT NULL, item TEXT NOT NULL, q INTEGER NOT NULL, qty INTEGER NOT NULL, price INTEGER NOT NULL,
      created INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open', buyer INTEGER);
  `);
  return db;
}

const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
const cleanName = (n) => String(n ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24);

export class FriendsError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function register(db, name) {
  const n = cleanName(name);
  if (!n) throw new FriendsError(400, 'Cần tên nông trại');
  const token = randomBytes(24).toString('hex');
  for (;;) {
    const code = Array.from(randomBytes(6), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
    try {
      db.prepare('INSERT INTO players (code, token, name) VALUES (?, ?, ?)').run(code, token, n);
      return { code, token, name: n };
    } catch (e) {
      if (!String(e.message).includes('UNIQUE')) throw e;
    }
  }
}

export function auth(db, token) {
  const p = token && db.prepare('SELECT id, code, name FROM players WHERE token = ?').get(String(token));
  if (!p) throw new FriendsError(401, 'Chưa đăng ký hoặc mã đăng nhập sai');
  return p;
}

const byCode = (db, code) => {
  const p = db.prepare('SELECT id, code, name, snapshot, updated FROM players WHERE code = ?').get(String(code ?? '').toUpperCase().trim());
  if (!p) throw new FriendsError(404, 'Không tìm thấy mã bạn bè này');
  return p;
};

export function saveSnapshot(db, me, snapshot) {
  const json = JSON.stringify(snapshot);
  if (json.length > MAX_SNAPSHOT) throw new FriendsError(413, 'Ảnh chụp nông trại quá lớn');
  db.prepare('UPDATE players SET snapshot = ?, updated = ?, name = COALESCE(?, name) WHERE id = ?').run(json, Date.now(), cleanName(snapshot?.name) || null, me.id);
}

export function addFriend(db, me, code) {
  const f = byCode(db, code);
  if (f.id === me.id) throw new FriendsError(400, 'Đó là mã của chính bạn');
  db.prepare('INSERT OR IGNORE INTO friends (a, b) VALUES (?, ?), (?, ?)').run(me.id, f.id, f.id, me.id);
  return { code: f.code, name: f.name };
}

const isFriend = (db, a, b) => !!db.prepare('SELECT 1 FROM friends WHERE a = ? AND b = ?').get(a, b);

export function listFriends(db, me, now = Date.now()) {
  return db.prepare('SELECT p.id, p.code, p.name, p.updated FROM friends f JOIN players p ON p.id = f.b WHERE f.a = ? ORDER BY p.name').all(me.id)
    .map((p) => ({ code: p.code, name: p.name, updated: p.updated, helpedToday: !!db.prepare('SELECT 1 FROM helped WHERE from_id = ? AND to_id = ? AND date = ?').get(me.id, p.id, today(now)) }));
}

export function getFarm(db, me, code) {
  const f = byCode(db, code);
  if (f.id !== me.id && !isFriend(db, me.id, f.id)) throw new FriendsError(403, 'Chỉ ghé được nông trại của bạn bè');
  return { code: f.code, name: f.name, updated: f.updated, snapshot: f.snapshot ? JSON.parse(f.snapshot) : null };
}

/** Tưới giúp: mỗi người chỉ giúp 1 bạn 1 lần mỗi ngày (theo ngày thật). */
export function water(db, me, code, tiles, now = Date.now()) {
  const f = byCode(db, code);
  if (!isFriend(db, me.id, f.id)) throw new FriendsError(403, 'Chưa kết bạn');
  const list = Array.isArray(tiles) ? tiles.filter((k) => typeof k === 'string' && /^\d{1,3},\d{1,3}$/.test(k)).slice(0, 400) : [];
  if (!list.length) throw new FriendsError(400, 'Chưa tưới ô nào');
  try {
    db.prepare('INSERT INTO helped (from_id, to_id, date) VALUES (?, ?, ?)').run(me.id, f.id, today(now));
  } catch {
    throw new FriendsError(429, 'Hôm nay bạn đã tưới giúp nông trại này rồi');
  }
  db.prepare('INSERT INTO inbox (to_id, from_id, kind, data, created) VALUES (?, ?, ?, ?, ?)').run(f.id, me.id, 'water', JSON.stringify(list), now);
  return { count: list.length };
}

export function gift(db, me, code, item, qty, now = Date.now()) {
  const f = byCode(db, code);
  if (!isFriend(db, me.id, f.id)) throw new FriendsError(403, 'Chưa kết bạn');
  const id = String(item ?? '');
  const n = Math.floor(Number(qty));
  if (!/^[a-z0-9_]{1,40}$/.test(id)) throw new FriendsError(400, 'Món quà không hợp lệ');
  if (!(n >= 1 && n <= MAX_GIFT_QTY)) throw new FriendsError(400, `Số lượng 1–${MAX_GIFT_QTY}`);
  db.prepare('INSERT INTO inbox (to_id, from_id, kind, data, created) VALUES (?, ?, ?, ?, ?)').run(f.id, me.id, 'gift', JSON.stringify({ item: id, qty: n }), now);
  return { ok: true };
}

/** Lấy thư chưa nhận (tưới giúp, quà) và đánh dấu đã nhận. */
export function takeInbox(db, me) {
  const rows = db.prepare('SELECT i.id, i.kind, i.data, i.created, p.name AS from_name FROM inbox i JOIN players p ON p.id = i.from_id WHERE i.to_id = ? AND i.delivered = 0 ORDER BY i.id').all(me.id);
  if (rows.length) db.prepare(`UPDATE inbox SET delivered = 1 WHERE id IN (${rows.map(() => '?').join(',')})`).run(...rows.map((r) => r.id));
  return rows.map((r) => ({ kind: r.kind, from: r.from_name, data: JSON.parse(r.data), created: r.created }));
}

// ---------------------------------------------------------------- mốc 19: xếp hạng, thả tim, thi đấu, chợ

const ITEM_RE = /^[a-z0-9_]{1,40}$/;
const circle = (db, me) => [me.id, ...db.prepare('SELECT b FROM friends WHERE a = ?').all(me.id).map((r) => r.b)];
const inList = (ids) => ids.map(() => '?').join(',');

/** Thả tim nông trại bạn: 1 lần/ngày mỗi bạn; bạn nhận được thư báo. */
export function like(db, me, code, now = Date.now()) {
  const f = byCode(db, code);
  if (!isFriend(db, me.id, f.id)) throw new FriendsError(403, 'Chưa kết bạn');
  try {
    db.prepare('INSERT INTO likes (from_id, to_id, date) VALUES (?, ?, ?)').run(me.id, f.id, today(now));
  } catch {
    throw new FriendsError(429, 'Hôm nay đã thả tim nông trại này rồi');
  }
  db.prepare('INSERT INTO inbox (to_id, from_id, kind, data, created) VALUES (?, ?, ?, ?, ?)').run(f.id, me.id, 'like', '{}', now);
  return { likes: db.prepare('SELECT COUNT(*) AS n FROM likes WHERE to_id = ?').get(f.id).n };
}

const num = (v, max = 1e6) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0; };

/** Bảng xếp hạng: mình + bạn bè, số liệu lấy từ ảnh chụp nông trại gần nhất. */
export function leaderboard(db, me) {
  const ids = circle(db, me);
  return db.prepare(`SELECT id, code, name, snapshot FROM players WHERE id IN (${inList(ids)})`).all(...ids).map((p) => {
    let sc = {};
    try { sc = JSON.parse(p.snapshot ?? '{}').score ?? {}; } catch { /* ảnh chụp hỏng thì coi như 0 */ }
    return {
      code: p.code, name: p.name, me: p.id === me.id,
      level: num(sc.level, 99), beauty: num(sc.beauty), deepest: num(sc.deepest, 30), fishKinds: num(sc.fishKinds, 99), earned: num(sc.earned, 1e12),
      likes: db.prepare('SELECT COUNT(*) AS n FROM likes WHERE to_id = ?').get(p.id).n,
    };
  });
}

/** Nộp một món dự thi; mỗi cuộc thi giữ điểm cao nhất của mỗi người. */
export function enterContest(db, me, contest, item, q, score, now = Date.now()) {
  if (!/^[a-z0-9_-]{1,40}$/.test(String(contest ?? ''))) throw new FriendsError(400, 'Cuộc thi không hợp lệ');
  if (!ITEM_RE.test(String(item ?? ''))) throw new FriendsError(400, 'Món dự thi không hợp lệ');
  const sc = num(score, 100000);
  const qq = num(q, 3);
  if (!sc) throw new FriendsError(400, 'Món này không có điểm');
  const before = db.prepare('SELECT score FROM contest WHERE contest = ? AND player_id = ?').get(contest, me.id);
  db.prepare(`INSERT INTO contest (contest, player_id, item, q, score, updated) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (contest, player_id) DO UPDATE SET item = excluded.item, q = excluded.q, score = excluded.score, updated = excluded.updated WHERE excluded.score > contest.score`)
    .run(contest, me.id, item, qq, sc, now);
  return { best: Math.max(sc, before?.score ?? 0), improved: !before || sc > before.score };
}

export function contestBoard(db, me, contest) {
  const ids = circle(db, me);
  return db.prepare(`SELECT p.code, p.name, c.item, c.q, c.score, p.id = ? AS me FROM contest c JOIN players p ON p.id = c.player_id
    WHERE c.contest = ? AND c.player_id IN (${inList(ids)}) ORDER BY c.score DESC, c.updated`).all(me.id, String(contest ?? ''), ...ids)
    .map((r) => ({ ...r, me: !!r.me }));
}

export const MAX_LISTINGS = 10;

/** Chợ giữa bạn bè: rao bán (đồ giữ ở chợ), mua (tiền về hòm thư người bán), hủy (đồ trả lại). */
export function marketList(db, me) {
  const ids = circle(db, me);
  return db.prepare(`SELECT m.id, m.item, m.q, m.qty, m.price, m.created, p.name AS seller, m.seller = ? AS mine FROM market m JOIN players p ON p.id = m.seller
    WHERE m.status = 'open' AND m.seller IN (${inList(ids)}) ORDER BY m.created DESC`).all(me.id, ...ids).map((r) => ({ ...r, mine: !!r.mine }));
}

export function marketPost(db, me, item, q, qty, price, now = Date.now()) {
  if (!ITEM_RE.test(String(item ?? ''))) throw new FriendsError(400, 'Món hàng không hợp lệ');
  const n = Math.floor(Number(qty)), pr = Math.floor(Number(price));
  if (!(n >= 1 && n <= 999)) throw new FriendsError(400, 'Số lượng 1–999');
  if (!(pr >= 1 && pr <= 1_000_000)) throw new FriendsError(400, 'Giá 1–1.000.000 xu');
  const open = db.prepare("SELECT COUNT(*) AS n FROM market WHERE seller = ? AND status = 'open'").get(me.id).n;
  if (open >= MAX_LISTINGS) throw new FriendsError(429, `Mỗi người rao tối đa ${MAX_LISTINGS} món`);
  const r = db.prepare('INSERT INTO market (seller, item, q, qty, price, created) VALUES (?, ?, ?, ?, ?, ?)').run(me.id, item, num(q, 3), n, pr, now);
  return { id: Number(r.lastInsertRowid) };
}

const listing = (db, id) => {
  const m = db.prepare('SELECT * FROM market WHERE id = ?').get(Number(id));
  if (!m || m.status !== 'open') throw new FriendsError(404, 'Món này đã bán hoặc đã gỡ');
  return m;
};

export function marketBuy(db, me, id, now = Date.now()) {
  const m = listing(db, id);
  if (m.seller === me.id) throw new FriendsError(400, 'Đây là hàng của bạn');
  if (!isFriend(db, me.id, m.seller)) throw new FriendsError(403, 'Chỉ mua được của bạn bè');
  const r = db.prepare("UPDATE market SET status = 'sold', buyer = ? WHERE id = ? AND status = 'open'").run(me.id, m.id);
  if (!r.changes) throw new FriendsError(409, 'Có người mua trước rồi');
  db.prepare('INSERT INTO inbox (to_id, from_id, kind, data, created) VALUES (?, ?, ?, ?, ?)').run(m.seller, me.id, 'sale', JSON.stringify({ item: m.item, qty: m.qty, price: m.price }), now);
  return { item: m.item, q: m.q, qty: m.qty, price: m.price };
}

export function marketCancel(db, me, id) {
  const m = listing(db, id);
  if (m.seller !== me.id) throw new FriendsError(403, 'Chỉ người rao mới gỡ được');
  db.prepare("UPDATE market SET status = 'cancelled' WHERE id = ?").run(m.id);
  return { item: m.item, q: m.q, qty: m.qty };
}
