// Server bạn bè cho Nhà Thằng Phong chạy trên máy — không cần tài khoản, chỉ mã bạn bè.
// Chạy:  npm run server   (mặc định cổng 8787, dữ liệu ở server/friends.db)
// Bản trên mạng chạy ở Vercel (api/index.mjs + Neon Postgres), cùng bảng đường dẫn trong server/api.mjs.
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { openSqlite } from './store.mjs';
import { CORS, handle, MAX_BODY } from './api.mjs';

const PORT = Number(process.env.PORT ?? 8787);
const DB_FILE = process.env.FRIENDS_DB ?? fileURLToPath(new URL('./friends.db', import.meta.url));
const db = await openSqlite(DB_FILE);

const readBody = (req) => new Promise((resolve, reject) => {
  let size = 0;
  const chunks = [];
  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BODY) { resolve('x'.repeat(MAX_BODY + 1)); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

const server = createServer(async (req, res) => {
  // Game chạy ở trang khác (localhost:5173 hoặc bản web) nên cho phép gọi chéo
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  const url = new URL(req.url ?? '/', 'http://x');
  const body = req.method === 'POST' ? await readBody(req) : '';
  const { status, data } = await handle(db, req.method ?? 'GET', url.pathname, body, req.headers.authorization, process.env.RATE_LIMIT === '1' ? req.socket.remoteAddress ?? '' : '');
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(data));
});

server.listen(PORT, () => console.log(`Server bạn bè chạy ở http://localhost:${PORT} (dữ liệu: ${DB_FILE})`));
