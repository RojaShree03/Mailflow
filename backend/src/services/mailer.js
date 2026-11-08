
import nodemailer from 'nodemailer';

let transporter;

export function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    MAIL_FROM
  } = process.env;

  // Validate SMTP configuration.
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
    throw new Error(
      'SMTP configuration is incomplete. Check SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM.'
    );
  }

  const port = Number(SMTP_PORT || 587);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be a valid port number');
  }

  // Create and reuse the SMTP transporter.
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000
  });

  return transporter;
}

// Escape HTML characters to prevent HTML injection.
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

// Send one email.
export async function sendOne({ to, subject, body }) {
  if (typeof to !== 'string' || !to.trim()) {
    throw new Error('Recipient email address is required');
  }

  if (typeof subject !== 'string' || !subject.trim()) {
    throw new Error('Email subject is required');
  }

  if (typeof body !== 'string' || !body.trim()) {
    throw new Error('Email body is required');
  }

  const safeBody = escapeHtml(body);

  try {
    const info = await getTransporter().sendMail({
      from: process.env.MAIL_FROM,
      to: to.trim(),
      subject: subject.trim(),
      text: body,
      html: `
        <div style="
          white-space: pre-wrap;
          font-family: Arial, sans-serif;
          line-height: 1.6;
        ">${safeBody}</div>
      `
    });

    return info;
  } catch (error) {
    // Log the error on the server without exposing SMTP credentials.
    console.error('Email sending failed:', error.message);
    throw error;
  }
}
