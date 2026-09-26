// Luật server bạn bè: người chơi, bạn bè, ảnh chụp nông trại, tưới giúp, quà, xếp hạng, thả tim, thi đấu, chợ.
// `db` là kho dữ liệu trong store.mjs (SQLite trên máy, Postgres trên Vercel) — mọi hàm đều bất đồng bộ.
import { createHash, randomBytes } from 'node:crypto';
import { isDuplicate, openSqlite } from './store.mjs';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ chữ dễ nhầm (0/O, 1/I)
export const MAX_SNAPSHOT = 300_000;
export const MAX_GIFT_QTY = 99;
export const MAX_LISTINGS = 10;
export const MAX_SAVE = 900_000;
export const KEEP_PREV = 3;

/** Kho SQLite (mặc định trong bộ nhớ — dùng cho test). */
export const openDb = (file = ':memory:') => openSqlite(file);

const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
const cleanName = (n) => String(n ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24);
const ITEM_RE = /^[a-z0-9_]{1,40}$/;
const num = (v, max = 1e6) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0; };
const inList = (ids) => ids.map(() => '?').join(',');

export class FriendsError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function register(db, name) {
  const n = cleanName(name);
  if (!n) throw new FriendsError(400, 'Cần tên nông trại');
  const token = randomBytes(24).toString('hex');
  for (;;) {
    const code = Array.from(randomBytes(6), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
    try {
      await db.run('INSERT INTO players (code, token, name) VALUES (?, ?, ?)', [code, token, n]);
      return { code, token, name: n };
    } catch (e) {
      if (!isDuplicate(e)) throw e;
    }
  }
}

export async function auth(db, token) {
  const p = token && (await db.get('SELECT id, code, name FROM players WHERE token = ?', [String(token)]));
  if (!p) throw new FriendsError(401, 'Chưa đăng ký hoặc mã đăng nhập sai');
  return p;
}

const byCode = async (db, code) => {
  const p = await db.get('SELECT id, code, name, snapshot, updated FROM players WHERE code = ?', [String(code ?? '').toUpperCase().trim()]);
  if (!p) throw new FriendsError(404, 'Không tìm thấy mã bạn bè này');
  return p;
};

const isFriend = async (db, a, b) => !!(await db.get('SELECT 1 AS x FROM friends WHERE a = ? AND b = ?', [a, b]));
const needFriend = async (db, me, f) => { if (!(await isFriend(db, me.id, f.id))) throw new FriendsError(403, 'Chưa kết bạn'); };
const circle = async (db, me) => [me.id, ...(await db.all('SELECT b FROM friends WHERE a = ?', [me.id])).map((r) => r.b)];
const mail = (db, to, from, kind, data, now) => db.run('INSERT INTO inbox (to_id, from_id, kind, data, created) VALUES (?, ?, ?, ?, ?)', [to, from, kind, JSON.stringify(data), now]);

export async function saveSnapshot(db, me, snapshot) {
  const json = JSON.stringify(snapshot);
  if (json.length > MAX_SNAPSHOT) throw new FriendsError(413, 'Ảnh chụp nông trại quá lớn');
  await db.run('UPDATE players SET snapshot = ?, updated = ?, name = COALESCE(?, name) WHERE id = ?', [json, Date.now(), cleanName(snapshot?.name) || null, me.id]);
}

export async function addFriend(db, me, code) {
  const f = await byCode(db, code);
  if (f.id === me.id) throw new FriendsError(400, 'Đó là mã của chính bạn');
  if (await db.get('SELECT 1 AS x FROM blocks WHERE (a = ? AND b = ?) OR (a = ? AND b = ?)', [me.id, f.id, f.id, me.id]))
    throw new FriendsError(403, 'Không kết bạn được với mã này');
  await db.run('INSERT INTO friends (a, b) VALUES (?, ?), (?, ?) ON CONFLICT DO NOTHING', [me.id, f.id, f.id, me.id]);
  return { code: f.code, name: f.name };
}

export async function listFriends(db, me, now = Date.now()) {
  const rows = await db.all('SELECT p.id, p.code, p.name, p.updated FROM friends f JOIN players p ON p.id = f.b WHERE f.a = ? ORDER BY p.name', [me.id]);
  const helped = new Set((await db.all('SELECT to_id FROM helped WHERE from_id = ? AND date = ?', [me.id, today(now)])).map((r) => r.to_id));
  return rows.map((p) => ({ code: p.code, name: p.name, updated: p.updated, helpedToday: helped.has(p.id) }));
}

export async function getFarm(db, me, code) {
  const f = await byCode(db, code);
  if (f.id !== me.id && !(await isFriend(db, me.id, f.id))) throw new FriendsError(403, 'Chỉ ghé được nông trại của bạn bè');
  return { code: f.code, name: f.name, updated: f.updated, snapshot: f.snapshot ? JSON.parse(f.snapshot) : null };
}

/** Tưới giúp: mỗi người chỉ giúp 1 bạn 1 lần mỗi ngày (theo ngày thật). */
export async function water(db, me, code, tiles, now = Date.now()) {
  const f = await byCode(db, code);
  await needFriend(db, me, f);
  const list = Array.isArray(tiles) ? tiles.filter((k) => typeof k === 'string' && /^\d{1,3},\d{1,3}$/.test(k)).slice(0, 400) : [];
  if (!list.length) throw new FriendsError(400, 'Chưa tưới ô nào');
  try {
    await db.run('INSERT INTO helped (from_id, to_id, date) VALUES (?, ?, ?)', [me.id, f.id, today(now)]);
  } catch (e) {
    if (!isDuplicate(e)) throw e;
    throw new FriendsError(429, 'Hôm nay bạn đã tưới giúp nông trại này rồi');
  }
  await mail(db, f.id, me.id, 'water', list, now);
  return { count: list.length };
}

export async function gift(db, me, code, item, qty, now = Date.now()) {
  const f = await byCode(db, code);
  await needFriend(db, me, f);
  const id = String(item ?? '');
  const n = Math.floor(Number(qty));
  if (!ITEM_RE.test(id)) throw new FriendsError(400, 'Món quà không hợp lệ');
  if (!(n >= 1 && n <= MAX_GIFT_QTY)) throw new FriendsError(400, `Số lượng 1–${MAX_GIFT_QTY}`);
  await mail(db, f.id, me.id, 'gift', { item: id, qty: n }, now);
  return { ok: true };
}

/** Lấy thư chưa nhận (tưới giúp, quà, tim, bán hàng) và đánh dấu đã nhận. */
export async function takeInbox(db, me) {
  const rows = await db.all('SELECT i.id, i.kind, i.data, i.created, p.name AS from_name FROM inbox i JOIN players p ON p.id = i.from_id WHERE i.to_id = ? AND i.delivered = 0 ORDER BY i.id', [me.id]);
  if (rows.length) await db.run(`UPDATE inbox SET delivered = 1 WHERE id IN (${inList(rows)})`, rows.map((r) => r.id));
  return rows.map((r) => ({ kind: r.kind, from: r.from_name, data: JSON.parse(r.data), created: r.created }));
}

// ---------------------------------------------------------------- mốc 19: xếp hạng, thả tim, thi đấu, chợ

/** Thả tim nông trại bạn: 1 lần/ngày mỗi bạn; bạn nhận được thư báo. */
export async function like(db, me, code, now = Date.now()) {
  const f = await byCode(db, code);
  await needFriend(db, me, f);
  try {
    await db.run('INSERT INTO likes (from_id, to_id, date) VALUES (?, ?, ?)', [me.id, f.id, today(now)]);
  } catch (e) {
    if (!isDuplicate(e)) throw e;
    throw new FriendsError(429, 'Hôm nay đã thả tim nông trại này rồi');
  }
  await mail(db, f.id, me.id, 'like', {}, now);
  return { likes: (await db.get('SELECT COUNT(*) AS n FROM likes WHERE to_id = ?', [f.id])).n };
}

const snapDay = (raw) => { try { return JSON.parse(raw ?? '{}').day ?? 1; } catch { return 1; } };

/** Bảng xếp hạng: mình + bạn bè, số liệu lấy từ ảnh chụp nông trại gần nhất. */
export async function leaderboard(db, me) {
  const ids = await circle(db, me);
  const players = await db.all(`SELECT id, code, name, snapshot FROM players WHERE id IN (${inList(ids)})`, ids);
  const likes = new Map((await db.all(`SELECT to_id, COUNT(*) AS n FROM likes WHERE to_id IN (${inList(ids)}) GROUP BY to_id`, ids)).map((r) => [r.to_id, r.n]));
  return players.map((p) => {
    let sc = {};
    try { sc = JSON.parse(p.snapshot ?? '{}').score ?? {}; } catch { /* ảnh chụp hỏng thì coi như 0 */ }
    return {
      code: p.code, name: p.name, me: p.id === me.id,
      // Kẹp về mức chơi thật có thể đạt (số do máy người chơi tự báo)
      level: num(sc.level, 50), beauty: num(sc.beauty, 3000), deepest: num(sc.deepest, 30), fishKinds: num(sc.fishKinds, 40), earned: num(sc.earned, 60_000 * Math.max(1, num(snapDay(p.snapshot), 1e5))),
      likes: likes.get(p.id) ?? 0,
    };
  });
}

/** Nộp một món dự thi; mỗi cuộc thi giữ điểm cao nhất của mỗi người. */
export async function enterContest(db, me, contest, item, q, score, now = Date.now()) {
  if (!/^[a-z0-9_-]{1,40}$/.test(String(contest ?? ''))) throw new FriendsError(400, 'Cuộc thi không hợp lệ');
  if (!ITEM_RE.test(String(item ?? ''))) throw new FriendsError(400, 'Món dự thi không hợp lệ');
  const sc = num(score, 10_000); // món đắt nhất × kim cương còn dưới mức này
  if (!sc) throw new FriendsError(400, 'Món này không có điểm');
  const before = await db.get('SELECT score FROM contest WHERE contest = ? AND player_id = ?', [contest, me.id]);
  await db.run(`INSERT INTO contest (contest, player_id, item, q, score, updated) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (contest, player_id) DO UPDATE SET item = excluded.item, q = excluded.q, score = excluded.score, updated = excluded.updated WHERE excluded.score > contest.score`,
  [contest, me.id, item, num(q, 3), sc, now]);
  return { best: Math.max(sc, before?.score ?? 0), improved: !before || sc > before.score };
}

export async function contestBoard(db, me, contest) {
  const ids = await circle(db, me);
  const rows = await db.all(`SELECT p.id, p.code, p.name, c.item, c.q, c.score FROM contest c JOIN players p ON p.id = c.player_id
    WHERE c.contest = ? AND c.player_id IN (${inList(ids)}) ORDER BY c.score DESC, c.updated`, [String(contest ?? ''), ...ids]);
  return rows.map(({ id, ...r }) => ({ ...r, me: id === me.id }));
}

/** Chợ giữa bạn bè: rao bán (đồ giữ ở chợ), mua (tiền về hòm thư người bán), hủy (đồ trả lại). */
export const LISTING_DAYS = 7;

/** Hàng rao quá LISTING_DAYS ngày: gỡ và gửi trả người bán qua hòm thư. */
export async function expireListings(db, now = Date.now()) {
  const old = await db.all("SELECT id, seller, item, q, qty FROM market WHERE status = 'open' AND created < ?", [now - LISTING_DAYS * 86_400_000]);
  for (const m of old) {
    if (!(await db.run("UPDATE market SET status = 'expired' WHERE id = ? AND status = 'open'", [m.id]))) continue;
    await mail(db, m.seller, m.seller, 'return', { item: m.item, q: m.q, qty: m.qty }, now);
  }
  return old.length;
}

export async function marketList(db, me, now = Date.now()) {
  await expireListings(db, now);
  const ids = await circle(db, me);
  const rows = await db.all(`SELECT m.id, m.item, m.q, m.qty, m.price, m.created, m.seller AS seller_id, p.name AS seller FROM market m JOIN players p ON p.id = m.seller
    WHERE m.status = 'open' AND m.seller IN (${inList(ids)}) ORDER BY m.created DESC`, ids);
  return rows.map(({ seller_id, ...r }) => ({ ...r, mine: seller_id === me.id }));
}

export async function marketPost(db, me, item, q, qty, price, now = Date.now()) {
  if (!ITEM_RE.test(String(item ?? ''))) throw new FriendsError(400, 'Món hàng không hợp lệ');
  const n = Math.floor(Number(qty)), pr = Math.floor(Number(price));
  if (!(n >= 1 && n <= 999)) throw new FriendsError(400, 'Số lượng 1–999');
  if (!(pr >= 1 && pr <= 1_000_000)) throw new FriendsError(400, 'Giá 1–1.000.000 xu');
  const open = (await db.get("SELECT COUNT(*) AS n FROM market WHERE seller = ? AND status = 'open'", [me.id])).n;
  if (open >= MAX_LISTINGS) throw new FriendsError(429, `Mỗi người rao tối đa ${MAX_LISTINGS} món`);
  const r = await db.get('INSERT INTO market (seller, item, q, qty, price, created) VALUES (?, ?, ?, ?, ?, ?) RETURNING id', [me.id, item, num(q, 3), n, pr, now]);
  return { id: Number(r.id) };
}

const listing = async (db, id) => {
  const m = await db.get('SELECT * FROM market WHERE id = ?', [Number(id)]);
  if (!m || m.status !== 'open') throw new FriendsError(404, 'Món này đã bán hoặc đã gỡ');
  return m;
};

export async function marketBuy(db, me, id, now = Date.now()) {
  const m = await listing(db, id);
  if (m.seller === me.id) throw new FriendsError(400, 'Đây là hàng của bạn');
  if (!(await isFriend(db, me.id, m.seller))) throw new FriendsError(403, 'Chỉ mua được của bạn bè');
  const changed = await db.run("UPDATE market SET status = 'sold', buyer = ? WHERE id = ? AND status = 'open'", [me.id, m.id]);
  if (!changed) throw new FriendsError(409, 'Có người mua trước rồi');
  await mail(db, m.seller, me.id, 'sale', { item: m.item, qty: m.qty, price: m.price }, now);
  return { item: m.item, q: m.q, qty: m.qty, price: m.price };
}

export async function marketCancel(db, me, id) {
  const m = await listing(db, id);
  if (m.seller !== me.id) throw new FriendsError(403, 'Chỉ người rao mới gỡ được');
  const changed = await db.run("UPDATE market SET status = 'cancelled' WHERE id = ? AND status = 'open'", [m.id]);
  if (!changed) throw new FriendsError(409, 'Món này vừa được bán');
  return { item: m.item, q: m.q, qty: m.qty };
}

// ---------------------------------------------------------------- giai đoạn 3: lưu lên mây, mã khôi phục

/**
 * Lưu bản lưu lên mây. `base` = giờ của bản trên mây mà máy này đã biết (0 = chưa có);
 * nếu trên mây đã có bản mới hơn (máy khác vừa lưu) thì từ chối 409 để máy này hỏi người chơi.
 * `force` ghi đè (người chơi đã chọn giữ bản của máy này). Bản cũ được giữ lại tối đa KEEP_PREV bản.
 */
export async function putSave(db, me, data, profile, base, force = false, now = Date.now()) {
  if (typeof data !== 'string' || !data.startsWith('{')) throw new FriendsError(400, 'Bản lưu hỏng');
  if (data.length + (profile?.length ?? 0) > MAX_SAVE) throw new FriendsError(413, 'Bản lưu quá lớn');
  const cur = await db.get('SELECT data, profile, updated FROM saves WHERE player_id = ?', [me.id]);
  if (cur && !force && cur.updated > num(base, 1e15)) throw new FriendsError(409, 'Trên mây có bản mới hơn từ máy khác');
  const updated = Math.max(now, (cur?.updated ?? 0) + 1);
  if (cur) {
    await db.run('INSERT INTO saves_prev (player_id, data, profile, updated) VALUES (?, ?, ?, ?)', [me.id, cur.data, cur.profile, cur.updated]);
    const old = await db.all('SELECT id FROM saves_prev WHERE player_id = ? ORDER BY updated DESC', [me.id]);
    const drop = old.slice(KEEP_PREV).map((r) => r.id);
    if (drop.length) await db.run(`DELETE FROM saves_prev WHERE id IN (${inList(drop)})`, drop);
    await db.run('UPDATE saves SET data = ?, profile = ?, updated = ? WHERE player_id = ?', [data, profile ?? null, updated, me.id]);
  } else await db.run('INSERT INTO saves (player_id, data, profile, updated) VALUES (?, ?, ?, ?)', [me.id, data, profile ?? null, updated]);
  return { updated };
}

/** Bản trên mây (null nếu chưa có) + giờ của các bản cũ còn giữ. */
export async function getSave(db, me) {
  const cur = await db.get('SELECT data, profile, updated FROM saves WHERE player_id = ?', [me.id]);
  const prev = await db.all('SELECT updated FROM saves_prev WHERE player_id = ? ORDER BY updated DESC', [me.id]);
  return cur ? { ...cur, prev: prev.map((r) => r.updated) } : null;
}

/** Lấy lại một bản cũ (theo giờ) làm bản hiện tại. */
export async function restorePrev(db, me, updated, now = Date.now()) {
  const old = await db.get('SELECT data, profile FROM saves_prev WHERE player_id = ? AND updated = ?', [me.id, num(updated, 1e15)]);
  if (!old) throw new FriendsError(404, 'Không có bản cũ này');
  return putSave(db, me, old.data, old.profile, 0, true, now);
}

const RECOVERY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const hashCode = (code) => createHash('sha256').update(String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');

/** Tạo mã khôi phục mới (12 ký tự, chia 3 cụm); mã cũ hết hiệu lực. Chỉ trả mã một lần, server giữ bản băm. */
export async function newRecovery(db, me, now = Date.now()) {
  const raw = Array.from(randomBytes(12), (b) => RECOVERY_CHARS[b % RECOVERY_CHARS.length]).join('');
  await db.run('DELETE FROM recovery WHERE player_id = ?', [me.id]);
  await db.run('INSERT INTO recovery (hash, player_id, created) VALUES (?, ?, ?)', [hashCode(raw), me.id, now]);
  return { recovery: raw.match(/.{4}/g).join('-') };
}

/** Nhập mã khôi phục ở máy khác → lấy lại danh tính (mã bạn bè + đăng nhập). */
export async function recover(db, code) {
  const row = await db.get('SELECT p.code, p.token, p.name FROM recovery r JOIN players p ON p.id = r.player_id WHERE r.hash = ?', [hashCode(code)]);
  if (!row) throw new FriendsError(404, 'Mã khôi phục không đúng');
  return row;
}

// ---------------------------------------------------------------- giai đoạn 3: hủy kết bạn, chặn, chống spam

export async function removeFriend(db, me, code) {
  const f = await byCode(db, code);
  await db.run('DELETE FROM friends WHERE (a = ? AND b = ?) OR (a = ? AND b = ?)', [me.id, f.id, f.id, me.id]);
  // Hàng người kia đang rao không còn hiện với mình (chợ chỉ gồm bạn bè) — không cần xóa
  return { ok: true };
}

/** Chặn: hủy kết bạn và không cho kết lại (từ cả hai phía) cho tới khi bỏ chặn. */
export async function block(db, me, code) {
  const f = await byCode(db, code);
  if (f.id === me.id) throw new FriendsError(400, 'Đó là mã của chính bạn');
  await removeFriend(db, me, code);
  await db.run('INSERT INTO blocks (a, b) VALUES (?, ?) ON CONFLICT DO NOTHING', [me.id, f.id]);
  return { ok: true };
}

export async function unblock(db, me, code) {
  const f = await byCode(db, code);
  await db.run('DELETE FROM blocks WHERE a = ? AND b = ?', [me.id, f.id]);
  return { ok: true };
}

export const listBlocks = async (db, me) => db.all('SELECT p.code, p.name FROM blocks k JOIN players p ON p.id = k.b WHERE k.a = ? ORDER BY p.name', [me.id]);

/** Đếm số lần gọi theo khóa trong một khung thời gian; quá `max` thì từ chối 429. */
export async function rateLimit(db, k, max, windowMs, now = Date.now()) {
  const win = Math.floor(now / windowMs) * windowMs; // mốc bắt đầu khung
  await db.run('INSERT INTO rate (k, win, n) VALUES (?, ?, 1) ON CONFLICT (k, win) DO UPDATE SET n = rate.n + 1', [k, win]);
  const { n } = await db.get('SELECT n FROM rate WHERE k = ? AND win = ?', [k, win]);
  if (Math.random() < 0.01) await db.run('DELETE FROM rate WHERE win < ?', [now - 2 * 3_600_000]); // thỉnh thoảng dọn khung cũ
  if (n > max) throw new FriendsError(429, 'Gửi quá nhiều yêu cầu, đợi một lát rồi thử lại');
}

/** Ghi một lỗi JavaScript từ máy người chơi (giữ 500 lỗi gần nhất). */
export async function logError(db, e, now = Date.now()) {
  const clip = (v, n) => String(v ?? '').slice(0, n);
  const msg = clip(e?.msg, 500);
  if (!msg) throw new FriendsError(400, 'Thiếu nội dung lỗi');
  await db.run('INSERT INTO errors (msg, stack, url, ua, created) VALUES (?, ?, ?, ?, ?)', [msg, clip(e?.stack, 3000), clip(e?.url, 300), clip(e?.ua, 300), now]);
  if (Math.random() < 0.05) {
    const keep = await db.get('SELECT id FROM errors ORDER BY id DESC LIMIT 1 OFFSET 499');
    if (keep) await db.run('DELETE FROM errors WHERE id < ?', [keep.id]);
  }
  return { ok: true };
}
