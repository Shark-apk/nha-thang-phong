import { describe, expect, it } from 'vitest';
import { addFriend, auth, block, coopTicket, openDb, register } from './db.mjs';
import { verifyTicket } from '../coop/src/ticket.ts';

const SECRET = 'test-secret';

describe('co-op: vé vào phòng', () => {
  it('chủ phòng và bạn bè lấy được vé; người lạ, người bị chặn thì không; máy chủ phòng kiểm được vé', async () => {
    const db = await openDb();
    const a = await register(db, 'Nhà Phong'), b = await register(db, 'Vườn Bình'), c = await register(db, 'Người lạ');
    const [meA, meB, meC] = [await auth(db, a.token), await auth(db, b.token), await auth(db, c.token)];
    await addFriend(db, meA, b.code);
    const now = Date.UTC(2026, 8, 28);
    const host = await coopTicket(db, meA, a.code, SECRET, now);
    expect(host).toMatchObject({ room: a.code, host: true });
    const guest = await coopTicket(db, meB, a.code.toLowerCase(), SECRET, now);
    expect(guest).toMatchObject({ room: a.code, host: false, hostName: 'Nhà Phong' });
    await expect(coopTicket(db, meC, a.code, SECRET, now)).rejects.toThrow(/bạn bè/);
    await expect(coopTicket(db, meB, a.code, '', now)).rejects.toThrow(/Chưa bật/);
    // Máy chủ phòng (Cloudflare) đọc được vé do Vercel ký
    expect(await verifyTicket(SECRET, guest.ticket, a.code, now + 1000)).toMatchObject({ c: b.code, n: 'Vườn Bình', h: false });
    expect(await verifyTicket(SECRET, guest.ticket, b.code, now)).toBeNull(); // sai phòng
    expect(await verifyTicket('khóa khác', guest.ticket, a.code, now)).toBeNull();
    expect(await verifyTicket(SECRET, guest.ticket, a.code, now + 7 * 3_600_000)).toBeNull(); // hết hạn
    expect(await verifyTicket(SECRET, guest.ticket.replace(/.$/, 'x'), a.code, now)).toBeNull();
    await block(db, meA, b.code);
    await expect(coopTicket(db, meB, a.code, SECRET, now)).rejects.toThrow(/bạn bè/);
  });
});
