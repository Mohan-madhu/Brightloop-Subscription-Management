import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';

const server = app.listen(env.PORT, () => console.log(`API listening on ${env.PORT}`));
async function shutdown() { server.close(() => prisma.$disconnect().finally(() => process.exit(0))); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
