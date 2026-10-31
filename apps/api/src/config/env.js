import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: new URL('../../.env', import.meta.url), override: true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  AUTH_TOKEN_SECRET: z.string().min(32),
  JOBS_ENABLED: z.enum(['true', 'false']).default('false'),
  EMAIL_DELIVERY_ENABLED: z.enum(['true', 'false']).default('false')
});

export const env = schema.parse(process.env);
