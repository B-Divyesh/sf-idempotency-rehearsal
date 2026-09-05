import { spawn } from 'node:child_process';

export default function runConsumerCheck() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/consumer-check.mjs'], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Consumer check exited ${code}.`)));
  });
}
