// Hàm Vercel cho API bạn bè: mọi /api/* được vercel.json chuyển về đây. Dữ liệu ở Neon Postgres (biến DATABASE_URL).
import { openPostgres } from '../server/store.mjs';
import { CORS, handle } from '../server/api.mjs';

let dbPromise;
const getDb = () => (dbPromise ??= openPostgres(process.env.DATABASE_URL).catch((e) => { dbPromise = undefined; throw e; }));

async function serve(request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const url = new URL(request.url);
  // vercel.json chuyển /api/<đường dẫn> về hàm này, đường dẫn gốc nằm trong __path
  const sub = url.searchParams.get('__path');
  const pathname = sub !== null ? `/api/${sub}`.replace(/\/$/, '') : url.pathname;
  const body = request.method === 'POST' ? await request.text() : '';
  const { status, data } = await handle(await getDb(), request.method, pathname, body, request.headers.get('authorization'), (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim());
  return Response.json(data, { status, headers: CORS });
}

export const GET = serve;
export const POST = serve;
export const OPTIONS = serve;
