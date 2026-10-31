'use client';

import { createRazorpayOrder, getInvoice, verifyRazorpayPayment } from './api';

type RazorpaySuccess = { razorpay_payment_id: string; razorpay_order_id: string };
type RazorpayOptions = {
  key: string; amount: number; currency: 'INR'; name: string; description: string;
  order_id: string; handler: (response: RazorpaySuccess) => void | Promise<void>;
  modal: { ondismiss: () => void };
};
declare global { interface Window { Razorpay?: new (options: RazorpayOptions) => { open: () => void; on: (event: 'payment.failed', callback: (event: { error?: { description?: string } }) => void) => void } } }

async function loadCheckout() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-brightloop-razorpay]');
    if (existing) { reject(new Error('Razorpay checkout did not initialize. Refresh and retry.')); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true; script.dataset.brightloopRazorpay = 'true';
    const timeout = window.setTimeout(() => reject(new Error('Razorpay checkout timed out. Check your connection and retry.')), 15000);
    script.onload = () => { window.clearTimeout(timeout); resolve(); };
    script.onerror = () => { window.clearTimeout(timeout); reject(new Error('Razorpay checkout could not be loaded.')); };
    document.head.appendChild(script);
  });
  if (!window.Razorpay) throw new Error('Razorpay checkout did not initialize.');
}
function wait(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

/** Order amount/key come from the server; payment identifiers go back for server verification. */
export async function startRazorpayCheckout(invoiceId: string, update: (state: 'pending' | 'verified' | 'failed' | 'dismissed', message?: string) => void) {
  const order = await createRazorpayOrder(invoiceId);
  if (order.provider !== 'RAZORPAY' || order.currency !== 'INR' || order.invoiceId !== invoiceId) throw new Error('The server returned an invalid payment order.');
  if (!order.keyId.startsWith('rzp_test_')) throw new Error('Razorpay test-mode credentials are unavailable. Checkout was not opened.');
  await loadCheckout();
  return new Promise<void>((resolve, reject) => {
    let finished = false;
    const finish = (error?: Error) => { if (finished) return; finished = true; error ? reject(error) : resolve(); };
    const RazorpayConstructor = window.Razorpay;
    if (!RazorpayConstructor) { finish(new Error('Razorpay checkout is unavailable.')); return; }
    const checkout = new RazorpayConstructor({
      key: order.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      name: 'Brightloop Software',
      description: `Invoice ${order.invoiceNumber}`,
      order_id: order.orderId,
      modal: { ondismiss: () => { update('dismissed', 'Checkout was dismissed. No payment was marked complete.'); finish(); } },
      handler: async response => {
        update('pending', 'Payment submitted. Verifying with Brightloop…');
        try {
          const verification = await verifyRazorpayPayment(response.razorpay_payment_id, response.razorpay_order_id);
          if (!verification.applied && !verification.duplicate) throw new Error('The server has not verified this payment. You can retry.');
          const startingBalance = order.amount;
          for (let attempt = 0; attempt < 5; attempt += 1) {
            const invoice = await getInvoice(invoiceId);
            if (invoice.balance !== startingBalance || invoice.status === 'PAID') {
              update('verified', 'Payment verified by Brightloop. Invoice details have been refreshed.');
              finish();
              return;
            }
            update('pending', `Payment verified. Refreshing invoice status (${attempt + 1}/5)…`);
            await wait(1500);
          }
          update('pending', 'The server verified the payment, but the invoice balance has not refreshed yet. Retry or refresh shortly.');
          finish();
        } catch (error) {
          update('failed', error instanceof Error ? error.message : 'Payment verification failed.');
          finish();
        }
      },
    });
    checkout.on('payment.failed', event => { update('failed', event.error?.description || 'Razorpay reported a failed payment. You can retry.'); finish(); });
    try { checkout.open(); } catch (error) { finish(error instanceof Error ? error : new Error('Could not open Razorpay checkout.')); }
  });
}
