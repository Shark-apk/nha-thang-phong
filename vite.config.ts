import { defineConfig } from 'vite';

// Bộ hình Sprout Lands nằm trong assets/ và được phục vụ ở gốc trang (vd. /Characters/...).
// Giấy phép không cho phát tán lại bộ hình: đừng đưa thư mục này lên repo/public công khai.
export default defineConfig({
  publicDir: 'assets',
});
