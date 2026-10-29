// Hostinger-compatible entry point for Neon Radar.
// Build the Vite frontend if the hosting platform installed dependencies
// but did not run the package build script.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.join(root, 'dist', 'index.html');

if (!existsSync(frontend)) {
  console.log('[NEON HOSTINGER] dist/index.html missing; building frontend...');
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    timeout: 180_000,
  });
  if (result.error || result.status !== 0 || !existsSync(frontend)) {
    console.error('[NEON HOSTINGER] Frontend build failed. Ensure devDependencies are installed and inspect deployment logs.', result.error?.message || result.status);
    process.exit(1);
  }
}
await import('./server/index.mjs');
