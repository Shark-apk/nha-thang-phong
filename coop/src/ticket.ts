// Vé vào phòng co-op: base64url(JSON).HMAC-SHA256 — API bạn bè (Vercel) ký, máy chủ phòng kiểm.

export interface Ticket { c: string; n: string; r: string; h: boolean; e: number }
export const MAX_PLAYERS = 4;

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

/** Kiểm tra vé: đúng chữ ký, chưa hết hạn, đúng phòng. */
export async function verifyTicket(secret: string, ticket: string, room: string, now = Date.now()): Promise<Ticket | null> {
  const [body, sig] = ticket.split('.');
  if (!body || !sig || (await hmac(secret, body)) !== sig) return null;
  try {
    const t = JSON.parse(new TextDecoder().decode(unb64url(body))) as Ticket;
    return t.r === room && t.e > now ? t : null;
  } catch {
    return null;
  }
}
