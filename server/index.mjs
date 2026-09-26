// Server bạn bè cho Nhà Thằng Phong — không cần tài khoản, chỉ mã bạn bè.
// Chạy:  npm run server   (mặc định cổng 8787, dữ liệu ở server/friends.db)
// Mở ra Internet:  cloudflared tunnel --url http://localhost:8787   → dán địa chỉ https://…trycloudflare.com vào game (Bạn bè → Máy chủ)
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import {
  addFriend, auth, contestBoard, enterContest, FriendsError, getFarm, gift, leaderboard, like, listFriends, marketBuy, marketCancel, marketList, marketPost,
  openDb, register, saveSnapshot, takeInbox, water,
} from './db.mjs';

const PORT = Number(process.env.PORT ?? 8787);
const DB_FILE = process.env.FRIENDS_DB ?? fileURLToPath(new URL('./friends.db', import.meta.url));
const db = openDb(DB_FILE);
const MAX_BODY = 400_000;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new FriendsError(413, 'Dữ liệu quá lớn')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new FriendsError(400, 'JSON hỏng')); }
    });
    req.on('error', reject);
  });
}

const routes = [
  ['POST', /^\/api\/register$/, async (_m, body) => register(db, body.name)],
  ['POST', /^\/api\/snapshot$/, async (_m, body, me) => { saveSnapshot(db, me(), body.snapshot); return { ok: true }; }],
  ['GET', /^\/api\/me$/, async (_m, _b, me) => me()],
  ['GET', /^\/api\/friends$/, async (_m, _b, me) => listFriends(db, me())],
  ['POST', /^\/api\/friends$/, async (_m, body, me) => addFriend(db, me(), body.code)],
  ['GET', /^\/api\/farm\/([A-Za-z0-9]{6})$/, async (m, _b, me) => getFarm(db, me(), m[1])],
  ['POST', /^\/api\/farm\/([A-Za-z0-9]{6})\/water$/, async (m, body, me) => water(db, me(), m[1], body.tiles)],
  ['POST', /^\/api\/farm\/([A-Za-z0-9]{6})\/gift$/, async (m, body, me) => gift(db, me(), m[1], body.item, body.qty)],
  ['POST', /^\/api\/inbox$/, async (_m, _b, me) => takeInbox(db, me())],
  ['POST', /^\/api\/farm\/([A-Za-z0-9]{6})\/like$/, async (m, _b, me) => like(db, me(), m[1])],
  ['GET', /^\/api\/leaderboard$/, async (_m, _b, me) => leaderboard(db, me())],
  ['GET', /^\/api\/contest\/([a-z0-9_-]{1,40})$/, async (m, _b, me) => contestBoard(db, me(), m[1])],
  ['POST', /^\/api\/contest\/([a-z0-9_-]{1,40})$/, async (m, body, me) => enterContest(db, me(), m[1], body.item, body.q, body.score)],
  ['GET', /^\/api\/market$/, async (_m, _b, me) => marketList(db, me())],
  ['POST', /^\/api\/market$/, async (_m, body, me) => marketPost(db, me(), body.item, body.q, body.qty, body.price)],
  ['POST', /^\/api\/market\/(\d+)\/buy$/, async (m, _b, me) => marketBuy(db, me(), m[1])],
  ['POST', /^\/api\/market\/(\d+)\/cancel$/, async (m, _b, me) => marketCancel(db, me(), m[1])],
  ['POST', /^\/api\/farm\/([A-Za-z0-9]{6})\/like$/, async (m, _b, me) => like(db, me(), m[1])],
  ['GET', /^\/api\/leaderboard$/, async (_m, _b, me) => leaderboard(db, me())],
  ['GET', /^\/api\/contest\/([a-z0-9_-]{1,40})$/, async (m, _b, me) => contestBoard(db, me(), m[1])],
  ['POST', /^\/api\/contest\/([a-z0-9_-]{1,40})$/, async (m, body, me) => enterContest(db, me(), m[1], body.item, body.q, body.score)],
  ['GET', /^\/api\/market$/, async (_m, _b, me) => marketList(db, me())],
  ['POST', /^\/api\/market$/, async (_m, body, me) => marketPost(db, me(), body.item, body.q, body.qty, body.price)],
  ['POST', /^\/api\/market\/(\d+)\/buy$/, async (m, _b, me) => marketBuy(db, me(), m[1])],
  ['POST', /^\/api\/market\/(\d+)\/cancel$/, async (m, _b, me) => marketCancel(db, me(), m[1])],
];

const server = createServer(async (req, res) => {
  // Game chạy ở trang khác (localhost:5173 hoặc bản web) nên cho phép gọi chéo
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  const url = new URL(req.url ?? '/', 'http://x');
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(data)); };
  if (url.pathname === '/' || url.pathname === '/api') return send(200, { ok: true, name: 'nongtrai-friends' });
  const route = routes.find(([method, re]) => method === req.method && re.test(url.pathname));
  if (!route) return send(404, { error: 'Không có đường dẫn này' });
  try {
    const body = req.method === 'POST' ? await readJson(req) : {};
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    const me = () => auth(db, token);
    send(200, await route[2](url.pathname.match(route[1]), body, me));
  } catch (e) {
    if (e instanceof FriendsError) send(e.status, { error: e.message });
    else { console.error(e); send(500, { error: 'Lỗi server' }); }
  }
});

server.listen(PORT, () => console.log(`Server bạn bè chạy ở http://localhost:${PORT} (dữ liệu: ${DB_FILE})`));
