import { describe, expect, it } from 'vitest';
import { newFarm } from './farm';
import { applyPatch, compose, homeBackup, withHome, worldOf, WorldTracker } from './coopWorld';

const farm = (day = 1) => { const s = newFarm({ x: 0, y: 0 }); s.day = day; return s; };

describe('co-op: đồng bộ đất', () => {
  it('chỉ gửi phần đổi; xóa thì gửi null; không đổi thì không gửi', () => {
    const s = farm();
    const t = new WorldTracker(s);
    expect(t.poll(s)).toBeNull();
    s.tilled['3,4'] = { watered: false };
    s.crops['3,4'] = { id: 'carrot', grown: 0 };
    s.money += 500; // của người, không phải đất
    expect(t.poll(s)).toEqual({ r: { tilled: { '3,4': { watered: false } }, crops: { '3,4': { id: 'carrot', grown: 0 } } } });
    s.tilled['3,4'].watered = true;
    delete s.crops['3,4'];
    expect(t.poll(s)).toEqual({ r: { tilled: { '3,4': { watered: true } }, crops: { '3,4': null } } });
    s.animals.push({ kind: 'chicken' } as never);
    expect(t.poll(s)?.w?.animals).toHaveLength(1);
    expect(t.poll(s)).toBeNull();
  });

  it('nhận patch của người khác: áp vào, không gửi ngược lại, nhưng ô mình vừa đổi vẫn được gửi', () => {
    const host = farm(), guest = farm();
    const th = new WorldTracker(host), tg = new WorldTracker(guest);
    guest.tilled['1,1'] = { watered: false };
    const p = tg.poll(guest)!;
    host.tilled['9,9'] = { watered: false }; // chủ phòng cũng vừa cuốc, chưa gửi
    applyPatch(host, p);
    th.absorb(p);
    expect(host.tilled['1,1']).toEqual({ watered: false });
    expect(th.poll(host)).toEqual({ r: { tilled: { '9,9': { watered: false } } } });
  });

  it('khách vào phòng: người của mình + đất và giờ của chủ; lưu game thì lấy lại nông trại của mình', () => {
    const host = farm(30), own = farm(5);
    host.crops['2,2'] = { id: 'pumpkin', grown: 3 };
    own.crops['7,7'] = { id: 'carrot', grown: 1 };
    own.money = 999;
    const home = homeBackup(own);
    const g = compose(own, worldOf(host));
    expect(g.day).toBe(30);
    expect(g.money).toBe(999);
    expect(g.crops).toEqual({ '2,2': { id: 'pumpkin', grown: 3 } });
    g.money += 100; // khách bán hàng trong phòng
    g.crops['2,2'].grown = 4; // cây của chủ lớn lên — không được lọt vào bản lưu của khách
    const saved = withHome(g, home);
    expect(saved.money).toBe(1099);
    expect(saved.day).toBe(5);
    expect(saved.crops).toEqual({ '7,7': { id: 'carrot', grown: 1 } });
    expect(host.crops['2,2'].grown).toBe(3); // compose không dính tham chiếu vào trạng thái chủ
  });
});
