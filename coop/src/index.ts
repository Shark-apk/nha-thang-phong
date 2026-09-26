// Máy chủ co-op (Cloudflare Worker + Durable Object): mỗi nông trại chủ phòng là một phòng giữ kết nối WebSocket của cả nhóm.
// Phòng chỉ chuyển tin — trạng thái thật của nông trại nằm ở máy chủ phòng (host) và được host phát lại.
// Vé vào phòng do API bạn bè (Vercel) cấp, ký HMAC bằng COOP_SECRET chung: phòng không cần hỏi database.

export interface Env {
  ROOMS: DurableObjectNamespace;
  COOP_SECRET: string;
}

import { MAX_PLAYERS, verifyTicket, type Ticket } from './ticket';

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/room\/([A-Z0-9]{6})$/);
    if (url.pathname === '/') return Response.json({ ok: true, name: 'nha-thang-phong-coop' });
    if (!m) return new Response('Không có đường dẫn này', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Cần WebSocket', { status: 426 });
    const t = await verifyTicket(env.COOP_SECRET, url.searchParams.get('t') ?? '', m[1]);
    if (!t) return new Response('Vé vào phòng không hợp lệ hoặc đã hết hạn', { status: 403 });
    const stub = env.ROOMS.get(env.ROOMS.idFromName(m[1]));
    const fwd = new Request(req);
    fwd.headers.set('x-ticket', JSON.stringify(t));
    return stub.fetch(fwd);
  },
};

interface Attach { c: string; n: string; h: boolean }
type Msg = { t: string; to?: string; [k: string]: unknown };

/**
 * Phòng co-op. Luật chuyển tin:
 * - host gửi `snap`/`patch`/`clock`/`night`/`kick` → mọi khách (hoặc riêng `to`)
 * - khách gửi `patch`/`ready`/`want`/`bye` → chỉ host
 * - `pos`, `chat`, `me`, `mob` (quái trong hang, người điều khiển tầng gửi) → mọi người khác; `hit` và tin có `to` → đúng người đó
 * Khách chỉ vào được khi host đang ở trong phòng; host rời thì cả phòng tan.
 */
export class Room implements DurableObject {
  constructor(private state: DurableObjectState) {}

  private sockets() {
    return this.state.getWebSockets().map((ws) => ({ ws, a: ws.deserializeAttachment() as Attach }));
  }

  private send(ws: WebSocket, m: object) {
    try { ws.send(JSON.stringify(m)); } catch { /* đã đóng */ }
  }

  async fetch(req: Request): Promise<Response> {
    const t = JSON.parse(req.headers.get('x-ticket')!) as Ticket;
    const others = this.sockets().filter((x) => x.a.c !== t.c);
    const host = others.find((x) => x.a.h);
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.state.acceptWebSocket(server);
    const fail = (reason: string) => { this.send(server, { t: 'error', reason }); server.close(4000, 'from'); return new Response(null, { status: 101, webSocket: client }); };
    if (!t.h && !host) return fail('Chủ phòng chưa mở phòng co-op');
    if (others.length >= MAX_PLAYERS) return fail(`Phòng đã đủ ${MAX_PLAYERS} người`);
    // Cùng người vào lại (tải lại trang, mạng chập chờn): đóng kết nối cũ
    for (const x of this.sockets()) if (x.a?.c === t.c && x.ws !== server) x.ws.close(4001, 'dup');
    server.serializeAttachment({ c: t.c, n: t.n, h: t.h } satisfies Attach);
    const players = others.map((x) => x.a);
    this.send(server, { t: 'hello', me: t.c, players, host: t.h ? t.c : host!.a.c });
    for (const x of others) this.send(x.ws, { t: 'join', c: t.c, n: t.n, h: t.h });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== 'string' || raw.length > 400_000) return;
    let m: Msg;
    try { m = JSON.parse(raw); } catch { return; }
    const me = ws.deserializeAttachment() as Attach | null;
    if (!me) return;
    const all = this.sockets().filter((x) => x.ws !== ws && x.a);
    const out = { ...m, from: me.c };
    const toHost = ['patch', 'ready', 'want', 'bye'];
    const fromHostOnly = ['snap', 'clock', 'night', 'kick'];
    if (fromHostOnly.includes(m.t) && !me.h) return;
    let targets = all;
    if (m.to) targets = all.filter((x) => x.a.c === m.to);
    else if (!me.h && toHost.includes(m.t)) targets = all.filter((x) => x.a.h);
    if (m.t === 'kick' && m.to) { for (const x of targets) { this.send(x.ws, out); x.ws.close(4002, 'kick'); } return; }
    for (const x of targets) this.send(x.ws, out);
  }

  async webSocketClose(ws: WebSocket) {
    const me = ws.deserializeAttachment() as Attach | null;
    if (!me) return;
    // Bị thay bằng kết nối mới của chính người đó: không báo rời phòng
    if (this.sockets().some((x) => x.ws !== ws && x.a?.c === me.c)) return;
    for (const x of this.sockets()) {
      if (x.ws === ws || !x.a) continue;
      if (me.h) { this.send(x.ws, { t: 'closed', reason: 'Chủ phòng đã rời phòng' }); x.ws.close(4003, 'host left'); }
      else this.send(x.ws, { t: 'leave', c: me.c });
    }
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }
}
