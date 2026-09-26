// Deploy lên Vercel từ máy có bộ hình: build → bỏ file thừa của bộ hình (không dùng trong game) → đẩy bản đã build.
// Chạy:  npm run deploy
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
run('npx vercel build --prod');
for (const p of ['.vercel/output/static/Sprout Lands color pallet', '.vercel/output/static/read_me.txt']) rmSync(p, { recursive: true, force: true });
run('npx vercel deploy --prebuilt --prod');
