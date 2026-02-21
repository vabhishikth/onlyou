/**
 * Kill any process listening on the given port (Windows).
 * Usage: node scripts/kill-port.js 4000
 * Silently succeeds if nothing is listening.
 */
const { execSync } = require('child_process');
const port = process.argv[2] || '4000';

try {
  const output = execSync('netstat -ano', { encoding: 'utf8' });
  const regex = new RegExp(`\\s+0\\.0\\.0\\.0:${port}\\s+.*LISTENING\\s+(\\d+)`);
  const match = output.match(regex);
  if (match) {
    const pid = match[1];
    console.log(`[kill-port] Killing PID ${pid} on port ${port}`);
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    console.log(`[kill-port] Done.`);
  }
} catch (e) {
  // Silently ignore — port may already be free
}
