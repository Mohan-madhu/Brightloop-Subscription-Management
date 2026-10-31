import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const hasLiveCredentials =
    config.smtp.user &&
    config.smtp.pass &&
    !config.smtp.user.includes('placeholder') &&
    !config.smtp.pass.includes('placeholder');

  if (hasLiveCredentials) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host || 'smtp.gmail.com',
      port: Number(config.smtp.port) || 587,
      secure: Boolean(config.smtp.secure),
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      }
    });
  } else {
    // Local / development transporter with JSON logging
    transporter = nodemailer.createTransport({
      jsonTransport: true
    });
  }

  return transporter;
}

/**
 * Handles sending transactional emails via Gmail SMTP or fallback JSON transporter.
 */
export async function sendEmail({ to, subject, html, text }) {
  const mailTransporter = getTransporter();
  const mailOptions = {
    from: config.smtp.from || 'Brightloop Billing <no-reply@brightloop.local>',
    to,
    subject,
    text,
    html
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    const hasLiveCredentials =
      config.smtp.user &&
      config.smtp.pass &&
      !config.smtp.user.includes('placeholder') &&
      !config.smtp.pass.includes('placeholder');

    console.log(`[Email Service - Realtime] Delivered email to ${to}: ${subject} (MessageID: ${info.messageId})`);

    return {
      success: true,
      simulated: !hasLiveCredentials,
      messageId: info.messageId,
      message: hasLiveCredentials
        ? 'Realtime email sent via Gmail SMTP'
        : 'Realtime email rendered & logged successfully'
    };
  } catch (err) {
    console.error(`[Email Service Error] Failed to send email to ${to}:`, err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

export async function sendActivationEmail(user, token) {
  const activationUrl = `${config.publicUrl}/activate?token=${token}&email=${encodeURIComponent(user.email)}`;
  return sendEmail({
    to: user.email,
    subject: 'Activate Your Brightloop Account',
    text: `Hello ${user.name},\n\nPlease click the link to activate your account:\n${activationUrl}\n\nThank you,\nBrightloop Team`,
    html: `<p>Hello <strong>${user.name}</strong>,</p><p>Please activate your account by clicking the link below:</p><p><a href="${activationUrl}">Activate Account</a></p>`
  });
}

export async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${config.publicUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
  return sendEmail({
    to: user.email,
    subject: 'Reset Your Brightloop Password',
    text: `Hello ${user.name},\n\nPlease click the link to reset your password:\n${resetUrl}\n\nThis token expires in 1 hour.\n\nBrightloop Team`,
    html: `<p>Hello <strong>${user.name}</strong>,</p><p>Click below to reset your password:</p><p><a href="${resetUrl}">Reset Password</a></p>`
  });
}

export async function sendInvoiceEmail(invoice, customer) {
  return sendEmail({
    to: customer.email,
    subject: `Invoice ${invoice.invoiceNumber} from Brightloop Software`,
    text: `Dear ${customer.name},\n\nYour invoice ${invoice.invoiceNumber} for ₹${invoice.totalAmount} has been generated. Due Date: ${new Date(invoice.dueDate).toDateString()}.\n\nOutstanding Balance: ₹${invoice.outstandingAmount}.\n\nThank you for choosing Brightloop!`,
    html: `<h3>Invoice ${invoice.invoiceNumber}</h3><p>Dear ${customer.name},</p><p>Total Amount: <strong>₹${invoice.totalAmount}</strong><br/>Outstanding: <strong>₹${invoice.outstandingAmount}</strong><br/>Due Date: ${new Date(invoice.dueDate).toDateString()}</p>`
  });
}
