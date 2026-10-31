import { env } from '../config/env.js';
import { runDueBilling } from '../services/billing.js';
import { processEmailOutbox, recoverStaleOutbox } from '../services/email.js';
import { runDueQuarterlyReports } from '../services/quarterly-reports.js';

const timers = [];
let started = false;

function intervalFromEnv(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value >= 10000 ? value : fallback;
}

async function guardedTick(name, work, logger) {
  try {
    const result = await work();
    logger.info?.({ job: name, result }, 'Scheduled job completed.');
  } catch (error) {
    logger.error?.({ job: name, err: error }, 'Scheduled job failed.');
  }
}

export async function startScheduler({ logger = console } = {}) {
  if (env.JOBS_ENABLED !== 'true') {
    logger.info?.('JOBS_ENABLED is false; billing, email and quarterly report jobs are not scheduled.');
    return { started: false, reason: 'JOBS_ENABLED_FALSE' };
  }
  if (started) return { started: true, alreadyRunning: true };
  started = true;

  try {
    const recovered = await recoverStaleOutbox();
    if (recovered > 0) logger.warn?.({ recovered }, 'Recovered PROCESSING email outbox rows left by a previous process.');
  } catch (error) {
    logger.error?.({ err: error }, 'Could not recover stale email outbox rows; scheduled work will continue.');
  }

  timers.push(
    setInterval(
      () => guardedTick('billing', () => runDueBilling(), logger),
      intervalFromEnv('BILLING_JOB_INTERVAL_MS', 15 * 60 * 1000)
    )
  );
  timers.push(
    setInterval(
      () => guardedTick('email', () => processEmailOutbox({ logger }), logger),
      intervalFromEnv('EMAIL_JOB_INTERVAL_MS', 60 * 1000)
    )
  );
  timers.push(
    setInterval(
      () => guardedTick('quarterly-reports', () => runDueQuarterlyReports(), logger),
      intervalFromEnv('QUARTERLY_JOB_INTERVAL_MS', 24 * 60 * 60 * 1000)
    )
  );

  return { started: true, timers: timers.length };
}

export function stopScheduler() {
  while (timers.length > 0) clearInterval(timers.pop());
  started = false;
}
