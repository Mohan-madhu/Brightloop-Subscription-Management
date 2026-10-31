import prisma from '../config/db.js';
import {
  triggerMultiChannelReminder,
  triggerBatchOverdueReminders,
  getReminderLogs
} from '../services/triggerService.js';

export async function triggerReminder(req, res, next) {
  try {
    const { invoiceId, channels = ['IVR', 'EMAIL', 'SMS'], phone, email } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ success: false, error: { message: 'Invoice ID is required' } });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: { message: 'Invoice not found' } });
    }

    // Role verification: Customers can only trigger reminders for their own invoices
    if (req.user.role === 'CUSTOMER' && invoice.customerId !== req.user.id) {
      return res.status(403).json({ success: false, error: { message: 'Access denied' } });
    }

    const result = await triggerMultiChannelReminder({
      invoiceId,
      channels,
      phone,
      email,
      triggeredBy: `${req.user.role}:${req.user.name}`
    });

    return res.status(200).json({
      success: true,
      message: 'Reminder triggered successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function triggerBatchReminders(req, res, next) {
  try {
    const { daysThreshold = 7, channels = ['IVR', 'EMAIL', 'SMS'] } = req.body;

    const result = await triggerBatchOverdueReminders({
      daysThreshold: parseInt(daysThreshold, 10),
      channels,
      triggeredBy: `${req.user.role}:${req.user.name}`
    });

    return res.status(200).json({
      success: true,
      message: `Batch trigger initiated for ${result.processed} due/overdue invoices`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function getLogs(req, res, next) {
  try {
    const { invoiceId, customerId } = req.query;
    let targetCustomerId = customerId;

    if (req.user.role === 'CUSTOMER') {
      targetCustomerId = req.user.id;
    }

    const logs = await getReminderLogs({
      invoiceId,
      customerId: targetCustomerId
    });

    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (err) {
    next(err);
  }
}
