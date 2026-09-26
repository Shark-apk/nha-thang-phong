import { describe, expect, it } from 'vitest';
import {
  addFriend, auth, contestBoard, enterContest, getFarm, gift, leaderboard, like, listFriends, marketBuy, marketCancel, marketList, marketPost, MAX_LISTINGS,
  openDb, register, saveSnapshot, takeInbox, water,
} from './db.mjs';

const setup = () => {
  const db = openDb();
  const a = register(db, 'Nông trại An');
  const b = register(db, 'Nông trại Bình');
  return { db, a, b, meA: auth(db, a.token), meB: auth(db, b.token) };
};

describe('server bạn bè', () => {
  it('đăng ký cho mã 6 ký tự, token đăng nhập; token sai bị từ chối', () => {
    const { a, db } = setup();
    expect(a.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(() => auth(db, 'sai')).toThrow();
    expect(() => register(db, '   ')).toThrow();
  });

  it('kết bạn hai chiều bằng mã; chỉ bạn bè mới xem được nông trại', () => {
    const { db, a, b, meA, meB } = setup();
    saveSnapshot(db, meB, { name: 'Nông trại Bình', crops: { '1,1': { id: 'carrot', grown: 2 } } });
    expect(() => getFarm(db, meA, b.code)).toThrow(/bạn bè/);
    expect(addFriend(db, meA, b.code.toLowerCase())).toMatchObject({ name: 'Nông trại Bình' });
    expect(listFriends(db, meB).map((f) => f.code)).toEqual([a.code]);
    expect(getFarm(db, meA, b.code).snapshot.crops['1,1'].id).toBe('carrot');
    expect(() => addFriend(db, meA, a.code)).toThrow(/chính bạn/);
  });

  it('tưới giúp 1 lần/ngày; quà vào hòm thư; nhận thư xong thì không nhận lại', () => {
    const { db, a, b, meA, meB } = setup();
    addFriend(db, meA, b.code);
    const day = Date.UTC(2026, 8, 27, 10);
    expect(water(db, meA, b.code, ['1,1', '2,1', 'bad'], day)).toEqual({ count: 2 });
    expect(() => water(db, meA, b.code, ['1,1'], day)).toThrow(/rồi/);
    expect(listFriends(db, meA, day)[0].helpedToday).toBe(true);
    expect(water(db, meA, b.code, ['3,3'], day + 86_400_000)).toEqual({ count: 1 });
    gift(db, meA, b.code, 'strawberry', 3);
    expect(() => gift(db, meA, b.code, 'x"; drop', 1)).toThrow();
    expect(() => gift(db, meA, b.code, 'egg', 1000)).toThrow();
    const inbox = takeInbox(db, meB);
    expect(inbox.map((m) => m.kind)).toEqual(['water', 'water', 'gift']);
    expect(inbox[0]).toMatchObject({ from: 'Nông trại An', data: ['1,1', '2,1'] });
    expect(inbox[2].data).toEqual({ item: 'strawberry', qty: 3 });
    expect(takeInbox(db, meB)).toEqual([]);
    expect(a.code).not.toBe(b.code);
  });

  it('ảnh chụp quá lớn bị từ chối', () => {
    const { db, meA } = setup();
    expect(() => saveSnapshot(db, meA, { junk: 'x'.repeat(400_000) })).toThrow();
  });
});

describe('mốc 19: xếp hạng, thả tim, thi đấu, chợ', () => {
  it('bảng xếp hạng gồm mình + bạn, lấy số liệu từ ảnh chụp; thả tim 1 lần/ngày', () => {
    const { db, a, b, meA, meB } = setup();
    addFriend(db, meA, b.code);
    saveSnapshot(db, meB, { name: 'Nông trại Bình', score: { level: 12, beauty: 40, deepest: 7, fishKinds: 5, earned: 9000 } });
    const day = Date.UTC(2026, 8, 27, 10);
    expect(like(db, meA, b.code, day)).toEqual({ likes: 1 });
    expect(() => like(db, meA, b.code, day)).toThrow(/rồi/);
    const lb = leaderboard(db, meA);
    expect(lb).toHaveLength(2);
    expect(lb.find((x) => x.code === b.code)).toMatchObject({ level: 12, beauty: 40, deepest: 7, likes: 1, me: false });
    expect(lb.find((x) => x.code === a.code)).toMatchObject({ level: 0, me: true });
    expect(takeInbox(db, meB).map((m) => m.kind)).toEqual(['like']);
  });

  it('thi đấu giữ điểm cao nhất mỗi người; bảng chỉ có bạn bè', () => {
    const { db, b, meA, meB } = setup();
    const c = register(db, 'Người lạ');
    const meC = auth(db, c.token);
    addFriend(db, meA, b.code);
    expect(enterContest(db, meA, 'trung_thu', 'pumpkin', 2, 480)).toEqual({ best: 480, improved: true });
    expect(enterContest(db, meA, 'trung_thu', 'carrot', 0, 35)).toEqual({ best: 480, improved: false });
    enterContest(db, meB, 'trung_thu', 'ca_mu', 1, 437);
    enterContest(db, meC, 'trung_thu', 'ngoc_trai', 0, 1500);
    const board = contestBoard(db, meA, 'trung_thu');
    expect(board.map((r) => [r.item, r.score, r.me])).toEqual([['pumpkin', 480, true], ['ca_mu', 437, false]]);
    expect(() => enterContest(db, meA, 'bad contest!', 'x', 0, 1)).toThrow();
  });

  it('chợ: rao, bạn mua (tiền về hòm thư người bán), không mua được hàng của mình, hủy trả đồ', () => {
    const { db, b, meA, meB } = setup();
    const c = register(db, 'Người lạ');
    const meC = auth(db, c.token);
    addFriend(db, meA, b.code);
    const { id } = marketPost(db, meA, 'strawberry', 1, 10, 900);
    expect(marketList(db, meB)).toMatchObject([{ id, item: 'strawberry', qty: 10, price: 900, seller: 'Nông trại An', mine: false }]);
    expect(marketList(db, meC)).toEqual([]);
    expect(() => marketBuy(db, meA, id)).toThrow(/của bạn/);
    expect(() => marketBuy(db, meC, id)).toThrow(/bạn bè/);
    expect(marketBuy(db, meB, id)).toEqual({ item: 'strawberry', q: 1, qty: 10, price: 900 });
    expect(() => marketBuy(db, meB, id)).toThrow(/đã bán/);
    expect(takeInbox(db, meA)).toMatchObject([{ kind: 'sale', from: 'Nông trại Bình', data: { item: 'strawberry', qty: 10, price: 900 } }]);
    const two = marketPost(db, meA, 'egg', 0, 5, 200);
    expect(() => marketCancel(db, meB, two.id)).toThrow();
    expect(marketCancel(db, meA, two.id)).toEqual({ item: 'egg', q: 0, qty: 5 });
    expect(() => marketPost(db, meA, 'egg', 0, 0, 10)).toThrow();
    for (let i = 0; i < MAX_LISTINGS; i++) marketPost(db, meA, 'egg', 0, 1, 10);
    expect(() => marketPost(db, meA, 'egg', 0, 1, 10)).toThrow(/tối đa/);
  });
});
