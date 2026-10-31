import { Router, raw } from 'express';
import { processRazorpayWebhook } from '../../services/razorpay.js';

export async function razorpayWebhookHandler(req, res, next) {
  try {
    const result = await processRazorpayWebhook({
      rawBody: req.body,
      signature: req.get('x-razorpay-signature'),
      eventId: req.get('x-razorpay-event-id')
    });
    return res.json({ data: result.result, duplicate: result.duplicate });
  } catch (error) {
    return next(error);
  }
}

export const razorpayWebhookRouter = Router();
razorpayWebhookRouter.post('/razorpay', raw({ type: 'application/json', limit: '1mb' }), razorpayWebhookHandler);
