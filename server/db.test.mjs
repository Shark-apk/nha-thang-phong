import { describe, expect, it } from 'vitest';
import {
  addFriend, auth, contestBoard, enterContest, getFarm, gift, leaderboard, like, listFriends, marketBuy, marketCancel, marketList, marketPost, MAX_LISTINGS,
  openDb, register, saveSnapshot, takeInbox, water, putSave, getSave, restorePrev, newRecovery, recover, KEEP_PREV,
  removeFriend, block, unblock, listBlocks, expireListings, LISTING_DAYS,
} from './db.mjs';
import { handle } from './api.mjs';

const setup = async () => {
  const db = await openDb();
  const a = await register(db, 'Nông trại An');
  const b = await register(db, 'Nông trại Bình');
  return { db, a, b, meA: await auth(db, a.token), meB: await auth(db, b.token) };
};
const stranger = async (db) => auth(db, (await register(db, 'Người lạ')).token);

describe('server bạn bè', () => {
  it('đăng ký cho mã 6 ký tự, token đăng nhập; token sai bị từ chối', async () => {
    const { a, db } = await setup();
    expect(a.code).toMatch(/^[A-Z2-9]{6}$/);
    await expect(auth(db, 'sai')).rejects.toThrow();
    await expect(register(db, '   ')).rejects.toThrow();
  });

  it('kết bạn hai chiều bằng mã; chỉ bạn bè mới xem được nông trại', async () => {
    const { db, a, b, meA, meB } = await setup();
    await saveSnapshot(db, meB, { name: 'Nông trại Bình', crops: { '1,1': { id: 'carrot', grown: 2 } } });
    await expect(getFarm(db, meA, b.code)).rejects.toThrow(/bạn bè/);
    expect(await addFriend(db, meA, b.code.toLowerCase())).toMatchObject({ name: 'Nông trại Bình' });
    expect(await addFriend(db, meA, b.code)).toMatchObject({ name: 'Nông trại Bình' }); // kết lại không lỗi
    expect((await listFriends(db, meB)).map((f) => f.code)).toEqual([a.code]);
    expect((await getFarm(db, meA, b.code)).snapshot.crops['1,1'].id).toBe('carrot');
    await expect(addFriend(db, meA, a.code)).rejects.toThrow(/chính bạn/);
  });

  it('tưới giúp 1 lần/ngày; quà vào hòm thư; nhận thư xong thì không nhận lại', async () => {
    const { db, a, b, meA, meB } = await setup();
    await addFriend(db, meA, b.code);
    const day = Date.UTC(2026, 8, 27, 10);
    expect(await water(db, meA, b.code, ['1,1', '2,1', 'bad'], day)).toEqual({ count: 2 });
    await expect(water(db, meA, b.code, ['1,1'], day)).rejects.toThrow(/rồi/);
    expect((await listFriends(db, meA, day))[0].helpedToday).toBe(true);
    expect(await water(db, meA, b.code, ['3,3'], day + 86_400_000)).toEqual({ count: 1 });
    await gift(db, meA, b.code, 'strawberry', 3);
    await expect(gift(db, meA, b.code, 'x"; drop', 1)).rejects.toThrow();
    await expect(gift(db, meA, b.code, 'egg', 1000)).rejects.toThrow();
    const inbox = await takeInbox(db, meB);
    expect(inbox.map((m) => m.kind)).toEqual(['water', 'water', 'gift']);
    expect(inbox[0]).toMatchObject({ from: 'Nông trại An', data: ['1,1', '2,1'] });
    expect(inbox[2].data).toEqual({ item: 'strawberry', qty: 3 });
    expect(await takeInbox(db, meB)).toEqual([]);
    expect(a.code).not.toBe(b.code);
  });

  it('ảnh chụp quá lớn bị từ chối', async () => {
    const { db, meA } = await setup();
    await expect(saveSnapshot(db, meA, { junk: 'x'.repeat(400_000) })).rejects.toThrow();
  });
});

describe('mốc 19: xếp hạng, thả tim, thi đấu, chợ', () => {
  it('bảng xếp hạng gồm mình + bạn, lấy số liệu từ ảnh chụp; thả tim 1 lần/ngày', async () => {
    const { db, a, b, meA, meB } = await setup();
    await addFriend(db, meA, b.code);
    await saveSnapshot(db, meB, { name: 'Nông trại Bình', score: { level: 12, beauty: 40, deepest: 7, fishKinds: 5, earned: 9000 } });
    const day = Date.UTC(2026, 8, 27, 10);
    expect(await like(db, meA, b.code, day)).toEqual({ likes: 1 });
    await expect(like(db, meA, b.code, day)).rejects.toThrow(/rồi/);
    const lb = await leaderboard(db, meA);
    expect(lb).toHaveLength(2);
    expect(lb.find((x) => x.code === b.code)).toMatchObject({ level: 12, beauty: 40, deepest: 7, likes: 1, me: false });
    expect(lb.find((x) => x.code === a.code)).toMatchObject({ level: 0, me: true });
    expect((await takeInbox(db, meB)).map((m) => m.kind)).toEqual(['like']);
  });

  it('thi đấu giữ điểm cao nhất mỗi người; bảng chỉ có bạn bè', async () => {
    const { db, b, meA, meB } = await setup();
    const meC = await stranger(db);
    await addFriend(db, meA, b.code);
    expect(await enterContest(db, meA, 'trung_thu', 'pumpkin', 2, 480)).toEqual({ best: 480, improved: true });
    expect(await enterContest(db, meA, 'trung_thu', 'carrot', 0, 35)).toEqual({ best: 480, improved: false });
    await enterContest(db, meB, 'trung_thu', 'ca_mu', 1, 437);
    await enterContest(db, meC, 'trung_thu', 'ngoc_trai', 0, 1500);
    const board = await contestBoard(db, meA, 'trung_thu');
    expect(board.map((r) => [r.item, r.score, r.me])).toEqual([['pumpkin', 480, true], ['ca_mu', 437, false]]);
    await expect(enterContest(db, meA, 'bad contest!', 'x', 0, 1)).rejects.toThrow();
  });

  it('chợ: rao, bạn mua (tiền về hòm thư người bán), không mua được hàng của mình, hủy trả đồ', async () => {
    const { db, b, meA, meB } = await setup();
    const meC = await stranger(db);
    await addFriend(db, meA, b.code);
    const { id } = await marketPost(db, meA, 'strawberry', 1, 10, 900);
    expect(await marketList(db, meB)).toMatchObject([{ id, item: 'strawberry', qty: 10, price: 900, seller: 'Nông trại An', mine: false }]);
    expect(await marketList(db, meC)).toEqual([]);
    await expect(marketBuy(db, meA, id)).rejects.toThrow(/của bạn/);
    await expect(marketBuy(db, meC, id)).rejects.toThrow(/bạn bè/);
    expect(await marketBuy(db, meB, id)).toEqual({ item: 'strawberry', q: 1, qty: 10, price: 900 });
    await expect(marketBuy(db, meB, id)).rejects.toThrow(/đã bán/);
    expect(await takeInbox(db, meA)).toMatchObject([{ kind: 'sale', from: 'Nông trại Bình', data: { item: 'strawberry', qty: 10, price: 900 } }]);
    const two = await marketPost(db, meA, 'egg', 0, 5, 200);
    await expect(marketCancel(db, meB, two.id)).rejects.toThrow();
    expect(await marketCancel(db, meA, two.id)).toEqual({ item: 'egg', q: 0, qty: 5 });
    await expect(marketPost(db, meA, 'egg', 0, 0, 10)).rejects.toThrow();
    for (let i = 0; i < MAX_LISTINGS; i++) await marketPost(db, meA, 'egg', 0, 1, 10);
    await expect(marketPost(db, meA, 'egg', 0, 1, 10)).rejects.toThrow(/tối đa/);
  });
});

describe('giai đoạn 3: lưu lên mây, mã khôi phục', () => {
  it('lưu, đọc lại; máy khác lưu trước thì 409; ép ghi được; giữ 3 bản cũ và lấy lại được', async () => {
    const { db, meA } = await setup();
    expect(await getSave(db, meA)).toBeNull();
    const t = Date.UTC(2026, 8, 28);
    const a = await putSave(db, meA, '{"day":1}', '{"xp":0}', 0, false, t);
    expect(a.updated).toBe(t);
    expect(await getSave(db, meA)).toMatchObject({ data: '{"day":1}', profile: '{"xp":0}', updated: t, prev: [] });
    // Máy B chưa biết bản của máy A (base = 0) → bị từ chối
    await expect(putSave(db, meA, '{"day":9}', null, 0, false, t + 5)).rejects.toThrow(/mới hơn/);
    // Máy A lưu tiếp với base đúng
    for (let i = 2; i <= 6; i++) {
      const base = (await getSave(db, meA)).updated;
      await putSave(db, meA, `{"day":${i}}`, null, base, false, t + i * 1000);
    }
    const cur = await getSave(db, meA);
    expect(cur.data).toBe('{"day":6}');
    expect(cur.prev).toHaveLength(KEEP_PREV);
    await restorePrev(db, meA, cur.prev[1], t + 99_000);
    expect((await getSave(db, meA)).data).toBe('{"day":4}');
    await putSave(db, meA, '{"day":9}', null, 0, true, t + 100_000);
    expect((await getSave(db, meA)).data).toBe('{"day":9}');
    await expect(putSave(db, meA, 'hỏng', null, 0, true)).rejects.toThrow();
    await expect(putSave(db, meA, '{' + 'x'.repeat(1_000_000), null, 0, true)).rejects.toThrow(/lớn/);
  });

  it('mã khôi phục lấy lại danh tính; tạo mã mới thì mã cũ hết hiệu lực; gõ thường, thiếu gạch vẫn nhận', async () => {
    const { db, a, meA } = await setup();
    const { recovery } = await newRecovery(db, meA);
    expect(recovery).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(await recover(db, recovery.toLowerCase().replaceAll('-', ' '))).toMatchObject({ code: a.code, token: a.token });
    const again = await newRecovery(db, meA);
    await expect(recover(db, recovery)).rejects.toThrow(/không đúng/);
    expect((await recover(db, again.recovery)).code).toBe(a.code);
  });
});

describe('giai đoạn 3: hủy kết bạn, chặn, hết hạn hàng rao, giới hạn gọi', () => {
  it('hủy kết bạn thì hết thấy nhau; chặn thì không kết lại được từ cả hai phía cho tới khi bỏ chặn', async () => {
    const { db, a, b, meA, meB } = await setup();
    await addFriend(db, meA, b.code);
    await marketPost(db, meB, 'egg', 0, 3, 50);
    expect(await marketList(db, meA)).toHaveLength(1);
    await removeFriend(db, meA, b.code);
    expect(await listFriends(db, meB)).toEqual([]);
    expect(await marketList(db, meA)).toEqual([]);
    await block(db, meA, b.code);
    await expect(addFriend(db, meB, a.code)).rejects.toThrow(/Không kết bạn/);
    await expect(addFriend(db, meA, b.code)).rejects.toThrow(/Không kết bạn/);
    expect((await listBlocks(db, meA)).map((x) => x.code)).toEqual([b.code]);
    await unblock(db, meA, b.code);
    expect(await addFriend(db, meB, a.code)).toMatchObject({ code: a.code });
  });

  it(`hàng rao quá ${LISTING_DAYS} ngày tự gỡ và trả về hòm thư người bán`, async () => {
    const { db, meA } = await setup();
    const t = Date.UTC(2026, 8, 1);
    await marketPost(db, meA, 'strawberry', 2, 6, 500, t);
    expect(await expireListings(db, t + 86_400_000)).toBe(0);
    expect(await expireListings(db, t + (LISTING_DAYS + 1) * 86_400_000)).toBe(1);
    expect(await takeInbox(db, meA)).toMatchObject([{ kind: 'return', data: { item: 'strawberry', q: 2, qty: 6 } }]);
    expect(await marketList(db, meA)).toEqual([]);
  });
});

describe('bảng đường dẫn', () => {
  it('đăng ký → /api/me; sai token 401; đường lạ 404; JSON hỏng 400', async () => {
    const db = await openDb();
    const r = await handle(db, 'POST', '/api/register', JSON.stringify({ name: 'Phong' }));
    expect(r.status).toBe(200);
    expect((await handle(db, 'GET', '/api/me', '', `Bearer ${r.data.token}`)).data).toMatchObject({ code: r.data.code, name: 'Phong' });
    expect((await handle(db, 'GET', '/api/me', '', 'Bearer sai')).status).toBe(401);
    expect((await handle(db, 'GET', '/api/nope', '')).status).toBe(404);
    expect((await handle(db, 'POST', '/api/register', '{hỏng')).status).toBe(400);
  });

  it('một IP đăng ký quá 20 lần/giờ thì bị chặn 429; IP khác vẫn được', async () => {
    const db = await openDb();
    for (let i = 0; i < 20; i++) expect((await handle(db, 'POST', '/api/register', '{"name":"x"}', '', '1.2.3.4')).status).toBe(200);
    expect((await handle(db, 'POST', '/api/register', '{"name":"x"}', '', '1.2.3.4')).status).toBe(429);
    expect((await handle(db, 'POST', '/api/register', '{"name":"x"}', '', '5.6.7.8')).status).toBe(200);
  });
});
