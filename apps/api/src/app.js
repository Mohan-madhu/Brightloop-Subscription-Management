import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { healthRouter } from './modules/health/routes.js';
import { publicRouter } from './modules/public/routes.js';
import { authRouter } from './modules/auth/routes.js';
import { catalogRouter } from './modules/catalog/routes.js';
import { customerRouter } from './modules/customers/routes.js';
import { salesRouter } from './modules/sales/routes.js';
import { invoicesRouter } from './modules/invoices/routes.js';
import { invoicePaymentsRouter, paymentsRouter } from './modules/payments/routes.js';
import { reportsRouter } from './modules/reports/routes.js';
import { jobsRouter } from './modules/jobs/routes.js';
import { razorpayWebhookRouter } from './modules/webhooks/razorpay.routes.js';
import { requireAuth } from './middleware/auth.js';
import { staffRouter } from './modules/staff/routes.js';
import { errorHandler, notFound } from './middleware/errors.js';

export const app = express();
const logger = pino({ level: process.env.LOG_LEVEL ?? 'info', redact: ['req.headers.authorization', 'req.headers.cookie'] });
app.disable('x-powered-by');
app.use(pinoHttp({ logger }));
app.use(helmet());
const allowedWebOrigins = new Set([env.WEB_ORIGIN, ...env.WEB_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)]);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedWebOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true,
}));
app.use('/api/v1/webhooks', razorpayWebhookRouter);
app.use(express.json({ limit: '100kb' }));
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/public', publicRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/catalog', catalogRouter);
app.use('/api/v1/customers', customerRouter);
app.use('/api/v1/staff', staffRouter);
app.use('/api/v1', salesRouter);
app.use('/api/v1/invoices', requireAuth, invoicesRouter);
app.use('/api/v1/invoices', requireAuth, invoicePaymentsRouter);
app.use('/api/v1/payments', requireAuth, paymentsRouter);
app.use('/api/v1/reports', requireAuth, reportsRouter);
app.use('/api/v1/jobs', requireAuth, jobsRouter);
app.use(notFound);
app.use(errorHandler);
