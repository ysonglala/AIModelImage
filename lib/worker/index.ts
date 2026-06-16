import { tickOnce } from "./poll";

declare global {
  // eslint-disable-next-line no-var
  var __pollerInterval: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var __pollerRunning: boolean | undefined;
}

const DEFAULT_INTERVAL_MS = Number(process.env.POLLER_INTERVAL_MS || 8000);

export function startPoller(intervalMs: number = DEFAULT_INTERVAL_MS) {
  if (global.__pollerInterval) return; // already running

  const tick = async () => {
    if (global.__pollerRunning) return; // skip overlap
    global.__pollerRunning = true;
    try {
      const stats = await tickOnce();
      if (stats.scanned > 0) {
        console.log(
          `[poller] scanned=${stats.scanned} updated=${stats.updated} success=${stats.succeeded} failed=${stats.failed} errors=${stats.errors.length}`
        );
        for (const e of stats.errors) {
          console.warn(`[poller] err ${e.taskId}: ${e.message}`);
        }
      }
    } catch (err) {
      console.error("[poller] tick failed:", err);
    } finally {
      global.__pollerRunning = false;
    }
  };

  global.__pollerInterval = setInterval(tick, intervalMs);
  // Don't keep the Node process alive just for this timer.
  global.__pollerInterval.unref?.();

  // kick once on boot, but don't block startup
  tick();

  console.log(`[poller] started, interval=${intervalMs}ms`);
}

export function stopPoller() {
  if (global.__pollerInterval) {
    clearInterval(global.__pollerInterval);
    global.__pollerInterval = undefined;
  }
}
