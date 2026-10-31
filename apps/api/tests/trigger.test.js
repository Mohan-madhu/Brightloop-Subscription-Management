import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/config/db.js';
import {
  triggerIvrCall,
  triggerSmsReminder,
  triggerEmailReminder,
  triggerWhatsAppReminder,
  triggerMultiChannelReminder,
  triggerBatchOverdueReminders,
  getReminderLogs
} from '../src/services/triggerService.js';

describe('Multi-Channel Reminder & IVR Trigger Engine', () => {
  let testCustomer;
  let testInvoice;

  before(async () => {
    testCustomer = await prisma.user.findFirst({
      where: { role: 'CUSTOMER' }
    });

    testInvoice = await prisma.invoice.findFirst({
      where: { customerId: testCustomer.id },
      include: { customer: true }
    });
  });

  it('triggers automated IVR voice call with spoken script and DTMF keypress options', async () => {
    const res = await triggerIvrCall({
      invoice: testInvoice,
      customer: testCustomer,
      phone: '+91 9988776655',
      triggeredBy: 'TEST_SUITE'
    });

    assert.equal(res.success, true);
    assert.equal(res.channel, 'IVR');
    assert.equal(res.status, 'COMPLETED');
    assert.match(res.callSid, /^CA[0-9a-f]{32}$/);
    assert.match(res.script, /automated interactive voice notification/i);
    assert.match(res.script, /press 1 to receive an instant online payment checkout link/i);
    assert.equal(res.dtmfReceived, '1');
    assert.ok(res.duration >= 30);
    assert.ok(res.logId);
  });

  it('triggers SMS payment reminder with checkout portal shortlink', async () => {
    const res = await triggerSmsReminder({
      invoice: testInvoice,
      customer: testCustomer,
      phone: '+91 9988776655',
      triggeredBy: 'TEST_SUITE'
    });

    assert.equal(res.success, true);
    assert.equal(res.channel, 'SMS');
    assert.equal(res.status, 'DELIVERED');
    assert.match(res.messageId, /^SM[0-9a-f]{32}$/);
    assert.match(res.text, /Brightloop Alert/i);
    assert.match(res.text, /customer\/invoices/i);
    assert.ok(res.logId);
  });

  it('triggers Email payment reminder notice', async () => {
    const res = await triggerEmailReminder({
      invoice: testInvoice,
      customer: testCustomer,
      email: 'test.reminders@brightloop.local',
      triggeredBy: 'TEST_SUITE'
    });

    assert.equal(res.success, true);
    assert.equal(res.channel, 'EMAIL');
    assert.equal(res.status, 'DELIVERED');
    assert.match(res.subject, /Payment Reminder/i);
    assert.ok(res.logId);
  });

  it('triggers realtime WhatsApp payment reminder with direct payment link', async () => {
    const res = await triggerWhatsAppReminder({
      invoice: testInvoice,
      customer: testCustomer,
      phone: '+91 9988776655',
      triggeredBy: 'TEST_SUITE'
    });

    assert.equal(res.success, true);
    assert.equal(res.channel, 'WHATSAPP');
    assert.equal(res.status, 'DELIVERED');
    assert.match(res.messageId, /^WA[0-9a-f]{32}$/);
    assert.match(res.text, /Brightloop Payment Notice/i);
    assert.match(res.directWhatsAppUrl, /api\.whatsapp\.com\/send/i);
    assert.ok(res.logId);
  });

  it('orchestrates concurrent multi-channel dispatch (IVR + SMS + EMAIL + WHATSAPP)', async () => {
    const res = await triggerMultiChannelReminder({
      invoiceId: testInvoice.id,
      channels: ['IVR', 'SMS', 'EMAIL', 'WHATSAPP'],
      phone: '+91 9988776655',
      email: 'test.multi@brightloop.local',
      triggeredBy: 'TEST_SUITE'
    });

    assert.equal(res.success, true);
    assert.equal(res.channelsTriggered.length, 4);
    assert.equal(res.results.ivr.status, 'COMPLETED');
    assert.equal(res.results.sms.status, 'DELIVERED');
    assert.equal(res.results.email.status, 'DELIVERED');
    assert.equal(res.results.whatsapp.status, 'DELIVERED');
  });

  it('runs batch overdue reminder scanner', async () => {
    const res = await triggerBatchOverdueReminders({
      daysThreshold: 30,
      channels: ['IVR', 'SMS'],
      triggeredBy: 'TEST_SUITE'
    });

    assert.ok(typeof res.totalEligible === 'number');
    assert.ok(typeof res.processed === 'number');
    assert.ok(Array.isArray(res.summary));
  });

  it('retrieves persistent reminder audit logs from database', async () => {
    const logs = await getReminderLogs({
      invoiceId: testInvoice.id,
      limit: 10
    });

    assert.ok(Array.isArray(logs));
    assert.ok(logs.length > 0);
    const channels = logs.map((l) => l.channel);
    assert.ok(channels.includes('IVR'));
    assert.ok(channels.includes('SMS'));
  });
});
