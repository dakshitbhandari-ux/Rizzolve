import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting Rizzolve Integrated Stack (FastAPI + Vite React)...');

// 1. Start Python Backend
const pythonBin = path.join(rootDir, 'spidyy-ai', 'backend', '.venv', 'bin', 'uvicorn');
const backend = spawn(pythonBin, ['main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'], {
  cwd: path.join(rootDir, 'spidyy-ai', 'backend'),
  stdio: ['inherit', 'pipe', 'pipe'],
});

backend.stdout.on('data', (d) => process.stdout.write(`\x1b[36m[Backend]\x1b[0m ${d}`));
backend.stderr.on('data', (d) => process.stderr.write(`\x1b[36m[Backend]\x1b[0m ${d}`));

// 2. Start Frontend Dev Server
const frontend = spawn('npm', ['--prefix', 'frontend', 'run', 'dev'], {
  cwd: rootDir,
  stdio: ['inherit', 'pipe', 'pipe'],
});

frontend.stdout.on('data', (d) => process.stdout.write(`\x1b[35m[Frontend]\x1b[0m ${d}`));
frontend.stderr.on('data', (d) => process.stderr.write(`\x1b[35m[Frontend]\x1b[0m ${d}`));

const cleanup = () => {
  console.log('\n🛑 Shutting down services...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

