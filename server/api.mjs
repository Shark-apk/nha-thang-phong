// Bảng đường dẫn API bạn bè — dùng chung cho server Node (server/index.mjs) và hàm Vercel (api/index.mjs).
import * as F from './db.mjs';

const CODE = '([A-Za-z0-9]{6})';
const routes = [
  ['POST', '/api/register', (db, _m, body) => F.register(db, body.name)],
  ['POST', '/api/snapshot', async (db, _m, body, me) => { await F.saveSnapshot(db, await me(), body.snapshot); return { ok: true }; }],
  ['GET', '/api/me', (_db, _m, _b, me) => me()],
  ['GET', '/api/friends', async (db, _m, _b, me) => F.listFriends(db, await me())],
  ['POST', '/api/friends', async (db, _m, body, me) => F.addFriend(db, await me(), body.code)],
  ['GET', `/api/farm/${CODE}`, async (db, m, _b, me) => F.getFarm(db, await me(), m[1])],
  ['POST', `/api/farm/${CODE}/water`, async (db, m, body, me) => F.water(db, await me(), m[1], body.tiles)],
  ['POST', `/api/farm/${CODE}/gift`, async (db, m, body, me) => F.gift(db, await me(), m[1], body.item, body.qty)],
  ['POST', `/api/farm/${CODE}/like`, async (db, m, _b, me) => F.like(db, await me(), m[1])],
  ['POST', '/api/inbox', async (db, _m, _b, me) => F.takeInbox(db, await me())],
  ['GET', '/api/leaderboard', async (db, _m, _b, me) => F.leaderboard(db, await me())],
  ['GET', '/api/contest/([a-z0-9_-]{1,40})', async (db, m, _b, me) => F.contestBoard(db, await me(), m[1])],
  ['POST', '/api/contest/([a-z0-9_-]{1,40})', async (db, m, body, me) => F.enterContest(db, await me(), m[1], body.item, body.q, body.score)],
  ['GET', '/api/market', async (db, _m, _b, me) => F.marketList(db, await me())],
  ['POST', '/api/market', async (db, _m, body, me) => F.marketPost(db, await me(), body.item, body.q, body.qty, body.price)],
  ['POST', '/api/market/(\\d+)/buy', async (db, m, _b, me) => F.marketBuy(db, await me(), m[1])],
  ['POST', '/api/market/(\\d+)/cancel', async (db, m, _b, me) => F.marketCancel(db, await me(), m[1])],
  ['GET', '/api/save', async (db, _m, _b, me) => F.getSave(db, await me())],
  ['POST', '/api/save', async (db, _m, body, me) => F.putSave(db, await me(), body.data, body.profile, body.base, !!body.force)],
  ['POST', '/api/save/restore', async (db, _m, body, me) => F.restorePrev(db, await me(), body.updated)],
  ['POST', '/api/recovery', async (db, _m, _b, me) => F.newRecovery(db, await me())],
  ['POST', '/api/recover', (db, _m, body) => F.recover(db, body.code)],
  ['POST', `/api/friends/${CODE}/remove`, async (db, m, _b, me) => F.removeFriend(db, await me(), m[1])],
  ['POST', `/api/friends/${CODE}/block`, async (db, m, _b, me) => F.block(db, await me(), m[1])],
  ['POST', `/api/friends/${CODE}/unblock`, async (db, m, _b, me) => F.unblock(db, await me(), m[1])],
  ['POST', '/api/errors', (db, _m, body) => F.logError(db, body)],
  ['GET', '/api/blocks', async (db, _m, _b, me) => F.listBlocks(db, await me())],
].map(([method, path, fn]) => [method, new RegExp(`^${path}$`), fn]);

export const MAX_BODY = 1_000_000;
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/** Xử lý một yêu cầu; trả về { status, data }. `bodyText` là chuỗi JSON (hoặc rỗng). */
/** Giới hạn theo IP (cả nhóm bạn chung một WiFi dùng chung IP): đăng ký 20 lần/giờ, đoán mã khôi phục 10 lần/giờ, ghi dữ liệu 120 lần/phút. */
const LIMITS = [
  [(m, p) => m === 'POST' && p === '/api/register', 'reg', 20, 3_600_000],
  [(m, p) => m === 'POST' && p === '/api/recover', 'rec', 10, 3_600_000],
  [(m) => m === 'POST', 'post', 120, 60_000],
];

export async function handle(db, method, pathname, bodyText, authorization, ip = '') {
  if (pathname === '/' || pathname === '/api') return { status: 200, data: { ok: true, name: 'nongtrai-friends' } };
  const route = routes.find(([m, re]) => m === method && re.test(pathname));
  if (!route) return { status: 404, data: { error: 'Không có đường dẫn này' } };
  try {
    if ((bodyText?.length ?? 0) > MAX_BODY) throw new F.FriendsError(413, 'Dữ liệu quá lớn');
    let body = {};
    if (method === 'POST' && bodyText) {
      try { body = JSON.parse(bodyText); } catch { throw new F.FriendsError(400, 'JSON hỏng'); }
    }
    if (ip) for (const [match, name, max, win] of LIMITS) if (match(method, pathname)) await F.rateLimit(db, `${name}:${ip}`, max, win);
    const token = String(authorization ?? '').replace(/^Bearer\s+/i, '');
    const me = () => F.auth(db, token);
    return { status: 200, data: await route[2](db, pathname.match(route[1]), body ?? {}, me) };
  } catch (e) {
    if (e instanceof F.FriendsError) return { status: e.status, data: { error: e.message } };
    console.error(e);
    return { status: 500, data: { error: 'Lỗi server' } };
  }
}
