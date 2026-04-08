//  scheduler.js — Poll for new support emails on a fixed interval.
//   Usage:
//   node src/scheduler.js              # default: every 5 minutes
//   node src/scheduler.js --interval 2 # every 2 minutes


import "dotenv/config";
import { runAgent } from "./agent.js";

// Parse --interval flag
const intervalFlagIdx = process.argv.indexOf("--interval");
const intervalMin     = intervalFlagIdx !== -1
  ? Number(process.argv[intervalFlagIdx + 1]) || 5
  : 5;
const intervalMs      = intervalMin * 60 * 1000;

console.log(`Scheduler started — checking every ${intervalMin} min. Press Ctrl+C to stop.\n`);

async function tick() {
  try {
    await runAgent();
  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] Error:`, err.message);
  }
  console.log(`\nNext check in ${intervalMin} min…\n`);
}

// Run immediately, then on interval
await tick();
setInterval(tick, intervalMs);
