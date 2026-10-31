import app from './app.js';
import { config } from './config/env.js';
import prisma from './config/db.js';

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(` Brightloop Subscription Management API Server`);
  console.log(` Environment : ${config.nodeEnv}`);
  console.log(` Listening on: http://localhost:${config.port}${config.apiPrefix}`);
  console.log(` Health Check: http://localhost:${config.port}${config.apiPrefix}/health`);
  console.log(`====================================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('HTTP server closed and database disconnected');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('HTTP server closed and database disconnected');
    process.exit(0);
  });
});

export default server;
