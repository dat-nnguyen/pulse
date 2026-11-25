import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';

// Bonjour keeps the companion reachable when the Mac's Wi-Fi IP changes.
// A supplied URL also supports a hosted companion or a different Mac.
let backendUrl = process.env.VITE_BACKEND_URL?.trim();
if (!backendUrl && process.platform === 'darwin') {
  try {
    const hostname = execFileSync('scutil', ['--get', 'LocalHostName'], { encoding: 'utf8' }).trim();
    if (hostname) backendUrl = `http://${hostname}.local:3030`;
  } catch { /* A cloud-only build can connect to a companion in Sync & Wi-Fi. */ }
}

const backupPath = process.env.PULSE_LIBRARY_RESTORE;
const env = { ...process.env, VITE_BACKEND_URL: backendUrl || '', VITE_PULSE_BUNDLED_RESTORE: backupPath ? '1' : '' };
for (const args of [['run', 'build'], ['exec', '--', 'cap', 'sync', 'ios']]) {
  const result = spawnSync('npm', args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
if (backupPath) copyFileSync(backupPath, new URL('../ios/App/App/public/library-restore.json', import.meta.url));
console.log(backendUrl ? `iOS companion: ${backendUrl}` : 'iOS build uses cloud audio; configure a companion in Sync & Wi-Fi.');
