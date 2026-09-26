import { describe, expect, it } from 'vitest';
import { newFarm } from '../game/farm';
import { applyInbox, snapshotOf, visitState } from './friends';

describe('thư bạn bè', () => {
  it('tưới giúp ô còn khô, quà vào hòm thư, gộp câu báo theo người', () => {
    const s = newFarm({ x: 0, y: 0 });
    s.tilled['1,1'] = { watered: false };
    s.tilled['2,1'] = { watered: true };
    const lines = applyInbox(s, [
      { kind: 'water', from: 'Minh', data: ['1,1', '2,1', '9,9'], created: 0 },
      { kind: 'gift', from: 'Minh', data: { item: 'strawberry', qty: 3 }, created: 0 },
      { kind: 'gift', from: 'Lạ', data: { item: 'khong_co', qty: 1 }, created: 0 },
    ]);
    expect(s.tilled['1,1'].watered).toBe(true);
    expect(s.mailbox).toEqual([{ item: 'strawberry', qty: 3, from: 'Minh' }]);
    expect(lines[0]).toBe('Minh đã tưới giúp 1 ô và gửi 3 dâu tây (xem hòm thư)');
  });

  it('ghé thăm: thấy đất cát của bạn nhưng túi đồ vẫn là của mình', () => {
    const home = newFarm({ x: 0, y: 0 });
    const friend = newFarm({ x: 0, y: 0 });
    friend.crops['5,5'] = { id: 'carrot', grown: 1 };
    const v = visitState(home, JSON.parse(JSON.stringify(snapshotOf(friend, 'Bạn'))));
    expect(v.crops['5,5'].id).toBe('carrot');
    expect(v.inventory).toBe(home.inventory);
    expect(home.crops['5,5']).toBeUndefined();
    expect(JSON.stringify(snapshotOf(friend, 'x'))).not.toContain('inventory');
  });
});
