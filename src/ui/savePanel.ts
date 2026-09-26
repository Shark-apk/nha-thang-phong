// Bảng "Bản lưu" (Cài đặt → Bản lưu & khôi phục): tải file về, nạp file, lưu mây, mã khôi phục, lấy lại bản cũ.
import { loadGame, SLOTS } from '../game/save';
import { loadProfile } from '../game/profile';
import { session } from '../game/session';
import { applyBackup, downloadBackup, readBackup } from '../game/backup';
import { call, loadIdentity } from '../net/friends';
import { adoptCloud, fetchCloud, newRecoveryCode, recoverInto } from '../net/cloud';
import { saveSettings, settings } from './settings';
import { useSlot, currentSlot } from '../game/save';

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const when = (t: number) => new Date(t).toLocaleString('vi-VN');

/** Ghi đè xong thì tải lại trang; chặn lần lưu tự động lúc đóng trang ghi đè ngược lại. */
function reloadClean() {
  session.live = null;
  session.profile = loadProfile();
  location.reload();
}

export function openSavePanel() {
  const m = document.createElement('div');
  m.className = 'title cover-modal';
  const box = document.createElement('div');
  box.className = 'panel credits savepanel';
  m.append(box);
  document.body.append(m);
  const close = () => m.remove();

  const render = (note = '') => {
    const slots = Array.from({ length: SLOTS }, (_, n) => ({ n, s: loadGame(n), id: loadIdentity(n) }));
    box.innerHTML = `<h2>Bản lưu & khôi phục</h2>
      <p>Game tự lưu mỗi 2 phút, mỗi lần chuyển cảnh và khi đóng tab. ${settings.cloud ? 'Có mạng thì tự lưu lên mây mỗi 5 phút và mỗi lần ngủ.' : 'Lưu mây đang tắt.'}</p>
      ${note ? `<p class="savepanel__note">${note}</p>` : ''}
      <label class="set__row"><span>Tự lưu lên mây</span><input type="checkbox" data-cloud ${settings.cloud ? 'checked' : ''}></label>
      <div class="savepanel__slots">${slots.map(({ n, s, id }) => `
        <div class="shop__row"><div><b>Ô ${n + 1}: ${s ? `${esc(s.farmName)} · ngày ${s.day}` : 'trống'}</b>
          <span>${id ? `mã bạn bè ${id.code}${s?.cloudAt ? ` · lên mây lúc ${when(s.cloudAt)}` : ' · chưa lên mây'}` : 'chưa có tài khoản (tự tạo khi chơi có mạng)'}</span></div>
          ${id ? `<button class="btn" data-code="${n}">Mã khôi phục</button><button class="btn" data-prev="${n}">Bản cũ</button>` : ''}
        </div>`).join('')}</div>
      <div class="row"><button class="btn" data-export>Tải file sao lưu</button><button class="btn" data-import>Nạp file sao lưu</button></div>
      <h3>Chơi tiếp trên máy này bằng mã khôi phục</h3>
      <div class="row"><input class="field" data-rc placeholder="XXXX-XXXX-XXXX" maxlength="16"><select class="field" data-rslot>${slots.map(({ n, s }) => `<option value="${n}">vào ô ${n + 1}${s ? ' (ghi đè)' : ''}</option>`).join('')}</select><button class="btn btn--primary" data-recover>Khôi phục</button></div>
      <div class="row"><button class="btn btn--primary" data-close>Xong</button></div>`;

    box.querySelector<HTMLButtonElement>('[data-close]')!.onclick = close;
    box.querySelector<HTMLInputElement>('[data-cloud]')!.onchange = (e) => { settings.cloud = (e.target as HTMLInputElement).checked; saveSettings(); render(); };
    box.querySelector<HTMLButtonElement>('[data-export]')!.onclick = () => { downloadBackup(); render('Đã tải file sao lưu. Cất file này ở nơi an toàn — nó chứa cả mã đăng nhập bạn bè.'); };
    box.querySelector<HTMLButtonElement>('[data-import]')!.onclick = () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json,application/json';
      inp.onchange = async () => {
        const f = inp.files?.[0];
        if (!f) return;
        const r = readBackup(await f.text());
        if (!r.ok) return render(r.reason);
        if (!confirm(`Nạp file sẽ thay TOÀN BỘ dữ liệu trên máy này:\n\n${r.summary.join('\n')}\n\nTiếp tục?`)) return;
        applyBackup(r.backup);
        reloadClean();
      };
      inp.click();
    };
    box.querySelectorAll<HTMLButtonElement>('[data-code]').forEach((b) => (b.onclick = async () => {
      const n = Number(b.dataset.code);
      if (!confirm('Tạo mã khôi phục mới? Mã cũ (nếu có) sẽ hết hiệu lực.')) return;
      try {
        const { recovery } = await newRecoveryCode(n);
        render(`Mã khôi phục ô ${n + 1}: <b class="friends__code">${recovery}</b><br>Chụp màn hình hoặc chép lại ngay — mã chỉ hiện một lần. Ai có mã này là vào được nông trại của bạn.`);
      } catch (e) { render((e as Error).message); }
    }));
    box.querySelectorAll<HTMLButtonElement>('[data-prev]').forEach((b) => (b.onclick = async () => {
      const n = Number(b.dataset.prev);
      try {
        const c = await fetchCloud(n);
        if (!c) return render(`Ô ${n + 1} chưa có bản nào trên mây.`);
        const list = [c.updated, ...c.prev];
        const pick = prompt(`Bản trên mây của ô ${n + 1}:\n${list.map((t, i) => `${i + 1}. ${when(t)}${i === 0 ? ' (hiện tại)' : ''}`).join('\n')}\n\nGõ số bản muốn dùng trên máy này:`);
        const i = Number(pick) - 1;
        if (!(i >= 0 && i < list.length)) return;
        if (i > 0) {
          // Đưa bản cũ lên làm bản hiện tại trên mây (bản đang có được cất vào danh sách bản cũ)
          const id = loadIdentity(n)!;
          await call(id.url, '/api/save/restore', { token: id.token, body: { updated: list[i] } });
        }
        const pickCloud = i === 0 ? c : await fetchCloud(n);
        if (!pickCloud) return;
        const prev = currentSlot();
        useSlot(n);
        const s = adoptCloud(pickCloud);
        useSlot(prev);
        if (!s) return render('Bản đó bị hỏng, không dùng được.');
        reloadClean();
      } catch (e) { render((e as Error).message); }
    }));
    box.querySelector<HTMLButtonElement>('[data-recover]')!.onclick = async () => {
      const code = box.querySelector<HTMLInputElement>('[data-rc]')!.value.trim();
      const n = Number(box.querySelector<HTMLSelectElement>('[data-rslot]')!.value);
      if (!code) return render('Nhập mã khôi phục 12 ký tự');
      if (loadGame(n) && !confirm(`Ô ${n + 1} đang có nông trại — ghi đè bằng nông trại từ mã khôi phục?`)) return;
      try {
        const r = await recoverInto(n, code);
        if (!r.farm) return render(`Đã lấy lại tài khoản "${esc(r.name)}" vào ô ${n + 1}, nhưng trên mây chưa có bản lưu nào.`);
        reloadClean();
      } catch (e) { render((e as Error).message); }
    };
  };
  render();
}
