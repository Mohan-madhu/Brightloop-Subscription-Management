import net from 'node:net';
import tls from 'node:tls';
import { randomBytes } from 'node:crypto';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { moneyString } from './money.js';

const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS ?? 20000);
const MAX_ATTEMPTS = 5;
const CLIENT_NAME = 'brightloop.local';

class SmtpSession {
  constructor(socket) {
    this.responses = [];
    this.waiters = [];
    this.pendingLines = [];
    this.closed = false;
    this.error = null;
    this.attach(socket);
  }

  attach(socket) {
    this.socket = socket;
    this.buffer = '';
    this.onData = (chunk) => {
      this.buffer += chunk.toString('utf8');
      this.processBuffer();
    };
    this.onError = (error) => this.fail(error);
    this.onClose = () => this.fail(new Error('SMTP connection closed unexpectedly.'));
    socket.on('data', this.onData);
    socket.on('error', this.onError);
    socket.on('close', this.onClose);
  }

  detach() {
    this.socket.off('data', this.onData);
    this.socket.off('error', this.onError);
    this.socket.off('close', this.onClose);
  }

  processBuffer() {
    let index = this.buffer.indexOf('\n');
    while (index >= 0) {
      const line = this.buffer.slice(0, index).replace(/\r$/, '');
      this.buffer = this.buffer.slice(index + 1);
      this.pendingLines.push(line);
      if (/^\d{3} /.test(line)) {
        this.responses.push({ code: Number(line.slice(0, 3)), text: this.pendingLines.join('\n') });
        this.pendingLines = [];
        this.flush();
      }
      index = this.buffer.indexOf('\n');
    }
  }

  flush() {
    while (this.responses.length > 0 && this.waiters.length > 0) {
      const response = this.responses.shift();
      const waiter = this.waiters.shift();
      clearTimeout(waiter.timer);
      waiter.resolve(response);
    }
  }

  fail(error) {
    if (this.closed) return;
    this.closed = true;
    this.error = error;
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  }

  read() {
    if (this.responses.length > 0) return Promise.resolve(this.responses.shift());
    if (this.error) return Promise.reject(this.error);
    if (this.closed) return Promise.reject(new Error('SMTP connection is closed.'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = smtpError(`SMTP timed out after ${SMTP_TIMEOUT_MS}ms.`, { permanent: false });
        this.fail(error);
        this.socket.destroy();
        reject(error);
      }, SMTP_TIMEOUT_MS);
      this.waiters.push({ resolve, reject, timer });
    });
  }

  writeRaw(data) {
    return new Promise((resolve, reject) => {
      this.socket.write(data, (error) => (error ? reject(error) : resolve()));
    });
  }

  async command(line) {
    await this.writeRaw(`${line}\r\n`);
    return this.read();
  }

  destroy() {
    this.detach();
    this.socket.destroy();
    this.fail(new Error('SMTP session closed.'));
  }
}

function smtpError(message, { permanent = false, uncertain = false } = {}) {
  const error = new Error(message);
  error.smtp = true;
  error.permanent = permanent;
  error.uncertain = uncertain;
  return error;
}

function expect(response, codes, stage) {
  if (!codes.includes(response.code)) {
    throw smtpError(`${stage} failed with SMTP ${response.code}: ${response.text}`, { permanent: response.code >= 500 });
  }
  return response;
}

function waitForSocket(socket, event) {
  if (event === 'secureConnect' ? socket.encrypted : !socket.connecting) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('SMTP connection timed out.'));
    }, SMTP_TIMEOUT_MS);
    socket.once(event, () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function base64Lines(value) {
  return Buffer.from(String(value), 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
}

function headerText(value, fallback = '') {
  return String(value ?? fallback).replace(/[\r\n]+/g, ' ').trim();
}

function encodeSubject(value) {
  const text = headerText(value, 'Brightloop');
  if (/^[\x20-\x7E]*$/.test(text)) return text;
  return `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;
}

function safeAttachmentName(name) {
  return String(name ?? 'attachment').replace(/[^\w.\-]+/g, '_');
}

export function buildMimeMessage({ from, to, subject, text, html, attachments = [] }) {
  const boundary = `brightloop_${randomBytes(12).toString('hex')}`;
  const altBoundary = `brightloop_alt_${randomBytes(12).toString('hex')}`;
  const recipients = Array.isArray(to) ? to.join(', ') : to;
  const headers = [
    `From: ${headerText(from)}`,
    `To: ${headerText(recipients)}`,
    `Subject: ${encodeSubject(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomBytes(16).toString('hex')}@brightloop.local>`,
    'MIME-Version: 1.0'
  ];

  const alternative = [
    `--${altBoundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(text ?? ''),
    `--${altBoundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(html ?? text ?? ''),
    `--${altBoundary}--`
  ].join('\r\n');

  let body;
  if (attachments.length > 0) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    const parts = [
      `--${boundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      '',
      alternative
    ];
    for (const attachment of attachments) {
      const name = safeAttachmentName(attachment.filename);
      const attachmentBase64 = String(attachment.contentBase64 ?? '').replace(/\s+/g, '');
      parts.push(
        `--${boundary}`,
        `Content-Type: ${attachment.contentType ?? 'application/octet-stream'}; name="${name}"`,
        `Content-Disposition: attachment; filename="${name}"`,
        'Content-Transfer-Encoding: base64',
        '',
        attachmentBase64.replace(/(.{76})/g, '$1\r\n')
      );
    }
    parts.push(`--${boundary}--`);
    body = parts.join('\r\n');
  } else {
    headers.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
    body = alternative;
  }

  const message = `${headers.join('\r\n')}\r\n\r\n${body}\r\n`;
  return message.replace(/^\./gm, '..');
}

function extractAddress(value) {
  const match = /<([^>]+)>/.exec(String(value ?? ''));
  return (match ? match[1] : String(value ?? '')).trim();
}

function smtpAddress(value) {
  const address = extractAddress(value);
  if (!/^[^\s<>@]+@[^\s<>@]+$/.test(address)) {
    throw smtpError(`Invalid email address: ${address || '(empty)'}.`, { permanent: true });
  }
  return address;
}

export async function sendSmtpMail(messageInput) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  if (!host || !from) throw smtpError('SMTP_HOST and SMTP_FROM must be configured.', { permanent: true });
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw smtpError('SMTP_PORT is invalid.', { permanent: true });

  const secure = port === 465;
  const socket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });
  socket.setTimeout(SMTP_TIMEOUT_MS);
  await waitForSocket(socket, secure ? 'secureConnect' : 'connect');
  let session = new SmtpSession(socket);

  try {
    expect(await session.read(), [220], 'Greeting');
    expect(await session.command(`EHLO ${CLIENT_NAME}`), [250], 'EHLO');

    if (!secure) {
      expect(await session.command('STARTTLS'), [220], 'STARTTLS');
      session.detach();
      const upgraded = tls.connect({ socket, host, servername: host });
      await waitForSocket(upgraded, 'secureConnect');
      session = new SmtpSession(upgraded);
      expect(await session.command(`EHLO ${CLIENT_NAME}`), [250], 'EHLO after STARTTLS');
    }

    if (user) {
      if (!pass) throw smtpError('SMTP_PASS is required when SMTP_USER is set.', { permanent: true });
      const auth = expect(await session.command('AUTH LOGIN'), [334], 'AUTH');
      if (auth.code === 334) {
        expect(await session.command(Buffer.from(user, 'utf8').toString('base64')), [334], 'AUTH username');
        expect(await session.command(Buffer.from(pass, 'utf8').toString('base64')), [235], 'AUTH password');
      }
    }

    expect(await session.command(`MAIL FROM:<${smtpAddress(from)}>`), [250], 'MAIL FROM');
    const recipients = Array.isArray(messageInput.to) ? messageInput.to : [messageInput.to];
    for (const recipient of recipients) {
      expect(await session.command(`RCPT TO:<${smtpAddress(recipient)}>`), [250, 251], 'RCPT TO');
    }
    expect(await session.command('DATA'), [354], 'DATA');

    const message = buildMimeMessage({ ...messageInput, from });
    await session.writeRaw(`${message}\r\n.\r\n`);
    try {
      const final = await session.read();
      expect(final, [250], 'Message acceptance');
    } catch (error) {
      if (!error.smtp || /timed out|closed unexpectedly|socket|ECONN/i.test(String(error.message))) {
        error.uncertain = true;
      }
      throw error;
    }
    try {
      await session.command('QUIT');
    } catch {
      // The message was accepted; a failed QUIT does not change delivery state.
    }
    session.detach();
    session.socket.end();
    return { accepted: true };
  } catch (error) {
    session.destroy();
    throw error;
  }
}

export function renderTemplate({ template, data = {} }) {
  if (template === 'invoice') {
    const lineText = (data.lines ?? [])
      .map((line) => `${line.description} x${line.quantity}: INR ${line.lineTotal}`)
      .join('\n');
    const text = [
      `Hello ${data.customerName ?? 'Customer'},`,
      '',
      `Invoice ${data.invoiceNumber} for INR ${data.total} is ready.`,
      `Due date: ${data.dueDate ?? 'as agreed'}.`,
      '',
      lineText,
      '',
      `${data.companyName ?? 'Brightloop'}`
    ].join('\n');
    const html = `<p>Hello ${escapeHtml(data.customerName ?? 'Customer')},</p>
<p>Invoice <strong>${escapeHtml(data.invoiceNumber)}</strong> for <strong>INR ${escapeHtml(data.total)}</strong> is ready.</p>
<p>Due date: ${escapeHtml(data.dueDate ?? 'as agreed')}.</p>
<pre>${escapeHtml(lineText)}</pre>
<p>${escapeHtml(data.companyName ?? 'Brightloop')}</p>`;
    return { text, html };
  }
  if (template === 'activation') {
    const text = `Hello ${data.firstName ?? 'there'},\n\nActivate your Brightloop account: ${data.activationUrl}\nThis link expires at ${data.expiresAt}.\n`;
    return {
      text,
      html: `<p>Hello ${escapeHtml(data.firstName ?? 'there')},</p><p><a href="${escapeHtml(data.activationUrl)}">Activate your Brightloop account</a></p><p>This link expires at ${escapeHtml(data.expiresAt)}.</p>`
    };
  }
  if (template === 'password_reset') {
    const text = `Hello ${data.firstName ?? 'there'},\n\nReset your Brightloop password: ${data.resetUrl}\nThis link expires at ${data.expiresAt}.\n`;
    return {
      text,
      html: `<p>Hello ${escapeHtml(data.firstName ?? 'there')},</p><p><a href="${escapeHtml(data.resetUrl)}">Reset your Brightloop password</a></p><p>This link expires at ${escapeHtml(data.expiresAt)}.</p>`
    };
  }
  if (template === 'quarterly_report') {
    const text = `Brightloop report ${data.periodKey}\n\n${data.summaryText ?? ''}\n\nThe CSV summary is attached.\n`;
    return { text, html: `<p>Brightloop report <strong>${escapeHtml(data.periodKey)}</strong></p><pre>${escapeHtml(data.summaryText ?? '')}</pre><p>The CSV summary is attached.</p>` };
  }
  return {
    text: data.text ?? '',
    html: data.html ?? escapeHtml(data.text ?? '')
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function queueEmail({ to, subject, template, data, attachments = [] }, client = prisma) {
  if (!to) throw new Error('Email recipient is required.');
  const outbox = await client.emailOutbox.create({
    data: {
      to: Array.isArray(to) ? to.join(', ') : String(to),
      subject,
      body: { template, data, attachments }
    }
  });
  await client.messageLog.create({
    data: { outboxId: outbox.id, channel: 'EMAIL', status: 'QUEUED', metadata: { template } }
  });
  return outbox;
}

export async function claimOutboxBatch(limit = 10) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT id FROM "EmailOutbox"
      WHERE status = 'PENDING' AND attempts < ${MAX_ATTEMPTS}
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    `;
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return [];
    await tx.emailOutbox.updateMany({ where: { id: { in: ids } }, data: { status: 'PROCESSING', attempts: { increment: 1 } } });
    return tx.emailOutbox.findMany({ where: { id: { in: ids } }, orderBy: { createdAt: 'asc' } });
  });
}

export async function recoverStaleOutbox() {
  const result = await prisma.emailOutbox.updateMany({ where: { status: 'PROCESSING' }, data: { status: 'PENDING' } });
  return result.count;
}

export async function processEmailOutbox({ limit = 10, logger = console } = {}) {
  if (env.EMAIL_DELIVERY_ENABLED !== 'true') {
    return { enabled: false, processed: 0, message: 'EMAIL_DELIVERY_ENABLED is false; outbox rows were not claimed.' };
  }
  const rows = await claimOutboxBatch(limit);
  const result = { enabled: true, processed: 0, accepted: 0, retried: 0, failed: 0, uncertain: 0, skipped: 0 };
  for (const outbox of rows) {
    const body = outbox.body ?? {};
    const rendered = renderTemplate({ template: body.template, data: body.data ?? {} });
    let accepted = false;
    try {
      if (body.template === 'invoice' && body.data?.invoiceId) {
        const invoice = await prisma.invoice.findUnique({ where: { id: body.data.invoiceId }, select: { id: true, status: true } });
        if (!invoice || invoice.status === 'CANCELLED') {
          await prisma.$transaction(async (tx) => {
            await tx.emailOutbox.updateMany({ where: { id: outbox.id, status: 'PROCESSING' }, data: { status: 'SKIPPED' } });
            await tx.messageLog.create({
              data: {
                outboxId: outbox.id,
                channel: 'EMAIL',
                status: 'SKIPPED',
                metadata: { template: body.template, note: invoice ? 'Invoice was cancelled before the email was sent.' : 'Invoice no longer exists.' }
              }
            });
          });
          result.skipped += 1;
          result.processed += 1;
          continue;
        }
      }

      await sendSmtpMail({
        to: outbox.to.split(',').map((value) => value.trim()).filter(Boolean),
        subject: outbox.subject,
        text: rendered.text,
        html: rendered.html,
        attachments: body.attachments ?? []
      });
      accepted = true;
      await prisma.$transaction(async (tx) => {
        await tx.emailOutbox.updateMany({ where: { id: outbox.id, status: 'PROCESSING' }, data: { status: 'SENT', sentAt: new Date() } });
        await tx.messageLog.create({
          data: { outboxId: outbox.id, channel: 'EMAIL', status: 'ACCEPTED', metadata: { template: body.template, note: 'SMTP accepted the message; delivery to the mailbox is not guaranteed.' } }
        });
        if (body.template === 'invoice' && body.data?.invoiceId) {
          const invoice = await tx.invoice.findUnique({ where: { id: body.data.invoiceId }, select: { id: true, status: true } });
          if (invoice && invoice.status === 'CONFIRMED') {
            await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'SENT' } });
            await tx.invoiceStatusLog.create({ data: { invoiceId: invoice.id, status: 'SENT', note: 'SMTP accepted the invoice email.' } });
          }
        }
      });
      result.accepted += 1;
      result.processed += 1;
    } catch (error) {
      if (accepted) error.uncertain = true;
      const permanent = Boolean(error.permanent) || outbox.attempts >= MAX_ATTEMPTS;
      const status = error.uncertain ? 'UNCERTAIN' : permanent ? 'FAILED' : 'PENDING';
      await prisma.$transaction(async (tx) => {
        await tx.emailOutbox.updateMany({ where: { id: outbox.id, status: 'PROCESSING' }, data: { status } });
        await tx.messageLog.create({
          data: {
            outboxId: outbox.id,
            channel: 'EMAIL',
            status: error.uncertain ? 'UNCERTAIN' : permanent ? 'FAILED' : 'RETRY_SCHEDULED',
            metadata: { message: String(error.message ?? 'Email sending failed.').slice(0, 500) }
          }
        });
      });
      if (status === 'UNCERTAIN') result.uncertain += 1;
      else if (status === 'FAILED') result.failed += 1;
      else result.retried += 1;
      result.processed += 1;
      logger.warn?.({ outboxId: outbox.id, status }, 'Email outbox processing did not complete successfully.');
    }
  }
  return result;
}

export async function queueInvoiceEmail(invoice, client = prisma) {
  const email = invoice.customerSnapshot?.billingEmail ?? invoice.customer?.billingEmail;
  if (!email) return null;
  return queueEmail(
    {
      to: email,
      subject: `Brightloop invoice ${invoice.number} (INR ${moneyString(invoice.total)})`,
      template: 'invoice',
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        customerName: invoice.customerSnapshot?.legalName ?? invoice.customer?.legalName ?? 'Customer',
        total: moneyString(invoice.total),
        dueDate: invoice.dueDate instanceof Date ? invoice.dueDate.toISOString().slice(0, 10) : String(invoice.dueDate).slice(0, 10),
        lines: (invoice.lines ?? []).map((line) => ({
          description: line.description,
          quantity: line.quantity,
          lineTotal: moneyString(line.lineTotal)
        }))
      }
    },
    client
  );
}
