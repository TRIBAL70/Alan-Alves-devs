// Hostinger LiteSpeed loads this entry using require(), so do not use
// top-level await here. The Neon Radar server remains in server/index.mjs.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.join(root, 'dist', 'index.html');

if (!existsSync(frontend)) {
  console.log('[NEON HOSTINGER] Frontend missing; running npm run build...');
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    timeout: 180_000,
  });
  if (result.error || result.status !== 0 || !existsSync(frontend)) {
    console.error('[NEON HOSTINGER] Frontend build failed; inspect runtime logs.', result.error?.message || result.status);
    process.exitCode = 1;
  }
}

if (process.exitCode !== 1) {
  import('./server/index.mjs').catch((error) => {
    console.error('[NEON HOSTINGER] Server startup failed:', error);
    process.exitCode = 1;
  });
}
