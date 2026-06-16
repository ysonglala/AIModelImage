// Next.js will invoke `register` once at server startup (both dev & prod).
// Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.POLLER_DISABLED === "1") return;

  const { startPoller } = await import("./lib/worker");
  startPoller();
}
