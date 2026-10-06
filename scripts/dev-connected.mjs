import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const useSupabase = process.argv.includes('--supabase');
const backendEnv = useSupabase ? '.env.supabase.local' : '.env';
function serviceDirectory(name, legacy, envFile, override) {
  if (process.env[override]) return path.resolve(process.env[override]);
  const bundled = path.join(root, 'services', name);
  if (existsSync(path.join(bundled, envFile)) && existsSync(path.join(bundled, 'node_modules'))) return bundled;
  const previous = path.resolve(root, '..', legacy);
  if (existsSync(path.join(previous, envFile)) && existsSync(path.join(previous, 'node_modules'))) {
    console.log(name + ': using your existing local service folder until services/' + name + ' is configured.');
    return previous;
  }
  return bundled;
}
const server = serviceDirectory('game-server', 'total-city-grind-server', '.env', 'TCG_SERVER_DIR');
const backender = serviceDirectory('backender', 'backender', backendEnv, 'TCG_BACKENDER_DIR');
const jobs = [
  { name: 'Backender', cwd: backender, args: ['--env-file='+backendEnv, 'src/index.js'] },
  { name: 'Game server', cwd: server, args: ['--env-file=.env', '--import', 'tsx', 'src/index.ts'] },
  { name: 'Game', cwd: root, args: ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'] },
];
for (const job of jobs) {
  if (!existsSync(job.cwd) || !existsSync(path.join(job.cwd, job.name === 'Game' ? 'node_modules/vite/bin/vite.js' : job.name === 'Backender' ? backendEnv : '.env'))) {
    console.error(`${job.name}: project, dependencies or .env missing in ${job.cwd}`);
    process.exit(1);
  }
}
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill();
  process.exitCode = code;
}
for (const job of jobs) {
  const child = spawn(process.execPath, job.args, { cwd: job.cwd, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', error => { console.error(`${job.name}: ${error.message}`); stop(1); });
  child.on('exit', code => { if (!stopping) { console.log(`${job.name} stopped; closing this local stack.`); stop(code || 0); } });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
console.log('Starting game + game server + Backender in this terminal. Ctrl+C stops all three.');
