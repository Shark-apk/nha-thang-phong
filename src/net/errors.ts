// Gửi lỗi JavaScript về server (chỉ bản build): mỗi lỗi một lần mỗi phiên, tối đa 5 lỗi, không kèm dữ liệu người chơi.
import { defaultUrl } from './friends';

const sent = new Set<string>();

function report(msg: string, stack?: string) {
  if (!msg || sent.has(msg) || sent.size >= 5) return;
  sent.add(msg);
  const body = JSON.stringify({ msg, stack: stack?.slice(0, 3000), url: location.pathname, ua: navigator.userAgent });
  void fetch(`${defaultUrl()}/api/errors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}

export function watchErrors() {
  if (!import.meta.env.PROD) return;
  window.addEventListener('error', (e) => report(String(e.message), e.error?.stack));
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as Error | undefined;
    // Mất mạng khi gọi server bạn bè là chuyện thường, không phải lỗi game
    if (r?.message?.includes('Không kết nối được')) return;
    report(`Promise: ${r?.message ?? String(e.reason)}`, r?.stack);
  });
}
