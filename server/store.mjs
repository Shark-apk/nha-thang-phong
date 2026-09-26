// Hai kiểu kho dữ liệu cho server bạn bè, cùng một giao diện bất đồng bộ:
//   all(sql, params) → mảng dòng · get(sql, params) → dòng đầu hoặc undefined · run(sql, params) → số dòng đổi
// Câu SQL viết theo kiểu SQLite với dấu `?`; kho Postgres tự đổi thành $1, $2…
// SQLite (có sẵn trong Node ≥ 22) dùng khi chạy trên máy và khi test; Postgres (Neon) dùng trên Vercel.

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS players (
    id %ID%, code TEXT UNIQUE NOT NULL, token TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    snapshot TEXT, updated BIGINT NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS friends (a BIGINT NOT NULL, b BIGINT NOT NULL, PRIMARY KEY (a, b));
  CREATE TABLE IF NOT EXISTS inbox (
    id %ID%, to_id BIGINT NOT NULL, from_id BIGINT NOT NULL, kind TEXT NOT NULL,
    data TEXT NOT NULL, created BIGINT NOT NULL, delivered INTEGER NOT NULL DEFAULT 0);
  CREATE INDEX IF NOT EXISTS inbox_to ON inbox (to_id, delivered);
  CREATE TABLE IF NOT EXISTS helped (from_id BIGINT NOT NULL, to_id BIGINT NOT NULL, date TEXT NOT NULL, PRIMARY KEY (from_id, to_id, date));
  CREATE TABLE IF NOT EXISTS likes (from_id BIGINT NOT NULL, to_id BIGINT NOT NULL, date TEXT NOT NULL, PRIMARY KEY (from_id, to_id, date));
  CREATE TABLE IF NOT EXISTS contest (
    contest TEXT NOT NULL, player_id BIGINT NOT NULL, item TEXT NOT NULL, q INTEGER NOT NULL, score INTEGER NOT NULL, updated BIGINT NOT NULL,
    PRIMARY KEY (contest, player_id));
  CREATE TABLE IF NOT EXISTS market (
    id %ID%, seller BIGINT NOT NULL, item TEXT NOT NULL, q INTEGER NOT NULL, qty INTEGER NOT NULL, price INTEGER NOT NULL,
    created BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'open', buyer BIGINT);
  CREATE TABLE IF NOT EXISTS saves (player_id BIGINT PRIMARY KEY, data TEXT NOT NULL, profile TEXT, updated BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS saves_prev (id %ID%, player_id BIGINT NOT NULL, data TEXT NOT NULL, profile TEXT, updated BIGINT NOT NULL);
  CREATE INDEX IF NOT EXISTS saves_prev_player ON saves_prev (player_id, updated);
  CREATE TABLE IF NOT EXISTS recovery (hash TEXT PRIMARY KEY, player_id BIGINT NOT NULL UNIQUE, created BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS blocks (a BIGINT NOT NULL, b BIGINT NOT NULL, PRIMARY KEY (a, b));
  CREATE TABLE IF NOT EXISTS errors (id %ID%, msg TEXT NOT NULL, stack TEXT, url TEXT, ua TEXT, created BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS rate (k TEXT NOT NULL, win BIGINT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (k, win));
`;

/** Lỗi trùng khóa (UNIQUE / PRIMARY KEY) ở cả hai loại kho. */
export const isDuplicate = (e) => /UNIQUE|duplicate key/i.test(String(e?.message)) || e?.code === '23505';

export async function openSqlite(file = ':memory:') {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;' + SCHEMA.replaceAll('%ID%', 'INTEGER PRIMARY KEY'));
  const prep = (sql) => db.prepare(sql);
  return {
    all: async (sql, p = []) => prep(sql).all(...p),
    get: async (sql, p = []) => prep(sql).get(...p),
    run: async (sql, p = []) => Number(prep(sql).run(...p).changes),
  };
}

export async function openPostgres(url) {
  const { neon, types } = await import('@neondatabase/serverless');
  types.setTypeParser(20, Number); // BIGINT, COUNT(*) → số thay vì chuỗi
  const sql = neon(url);
  const pg = (q) => { let i = 0; return q.replace(/\?/g, () => `$${++i}`); };
  await sql.query(`SELECT 1`);
  for (const stmt of SCHEMA.replaceAll('%ID%', 'BIGSERIAL PRIMARY KEY').split(';').map((s) => s.trim()).filter(Boolean)) await sql.query(stmt);
  return {
    all: (q, p = []) => sql.query(pg(q), p),
    get: async (q, p = []) => (await sql.query(pg(q), p))[0],
    run: async (q, p = []) => (await sql.query(pg(q), p, { fullResults: true })).rowCount ?? 0,
  };
}
