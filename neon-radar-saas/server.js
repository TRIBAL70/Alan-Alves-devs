// Hostinger LiteSpeed requires a synchronous entry point.
// Build artifacts are prepared during npm installation (postinstall).
// Keep the original server in server/index.mjs.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
if (!existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('[NEON HOSTINGER] dist/index.html missing. Frontend must be built during deployment (npm run build).');
}
import('./server/index.mjs').catch(error => {
  console.error('[NEON HOSTINGER] Server startup failed:', error);
  process.exitCode = 1;
});
