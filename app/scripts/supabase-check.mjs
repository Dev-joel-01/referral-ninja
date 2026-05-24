import { execFileSync } from 'node:child_process';

function run(command, args) {
  try {
    execFileSync(command, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const dockerInstalled = run('docker', ['--version']);

if (!dockerInstalled) {
  console.error('Supabase local services require Docker Desktop.');
  console.error('Install Docker Desktop and start it, then run: npm run supabase:start');
  process.exit(1);
}

const dockerRunning = run('docker', ['info']);

if (!dockerRunning) {
  console.error('Docker Desktop is installed but not running or is not accessible.');
  console.error('Start Docker Desktop, then run: npm run supabase:start');
  process.exit(1);
}

console.log('Docker is available for local Supabase services.');
