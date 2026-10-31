import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:5000/api/v1',
  jwtSecret: process.env.JWT_SECRET || 'brightloop_super_secret_jwt_key_32_chars_min',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_brightloop'
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'Brightloop <billing@brightloop.local>'
  },
  jobs: {
    enableBilling: process.env.ENABLE_AUTOMATED_BILLING_JOB === 'true',
    enableEmail: process.env.ENABLE_AUTOMATED_EMAIL_JOB === 'true'
  }
};
