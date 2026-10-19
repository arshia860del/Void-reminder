#!/usr/bin/env node
/**
 * The Void Markt - Cross-Platform Node.js Local Scheduler
 * Triggers `tgcloud run endpoints/tick` every N seconds.
 * 
 * Usage:
 *   node scripts/scheduler.js [intervalSeconds]
 */

import { spawn } from 'child_process';

const intervalSec = parseInt(process.argv[2] || '15', 10);

console.log('\x1b[35m%s\x1b[0m', '==========================================================');
console.log('\x1b[36m%s\x1b[0m', '  THE VOID MARKT — TELEGRAM SERVERLESS TICK DISPATCHER    ');
console.log('\x1b[35m%s\x1b[0m', '==========================================================');
console.log(`Interval: Every ${intervalSec} seconds`);
console.log('Press Ctrl+C to stop.\n');

function runTick() {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\x1b[90m[${now}]\x1b[0m Dispatching queue tick...`);

  const child = spawn('npx', ['tgcloud', 'run', 'endpoints/tick', '{}'], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (err) => {
    console.error(`\x1b[31m[error]\x1b[0m Failed to spawn tgcloud:`, err.message);
  });
}

// Initial run
runTick();

// Periodic timer
setInterval(runTick, intervalSec * 1000);
