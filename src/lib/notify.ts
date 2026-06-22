import nodemailer from 'nodemailer';
import logger from '../logger';

export interface NotifyOptions {
  subject: string;
  body: string;
}

const isConfigured =
  process.env.NOTIFY_SMTP_HOST &&
  process.env.NOTIFY_SMTP_USER &&
  process.env.NOTIFY_SMTP_PASS &&
  process.env.NOTIFY_EMAIL_TO;

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: process.env.NOTIFY_SMTP_HOST,
      port: parseInt(process.env.NOTIFY_SMTP_PORT ?? '587', 10),
      secure: process.env.NOTIFY_SMTP_PORT === '465',
      auth: {
        user: process.env.NOTIFY_SMTP_USER,
        pass: process.env.NOTIFY_SMTP_PASS,
      },
    })
  : null;

export async function notify(opts: NotifyOptions): Promise<void> {
  if (!transporter) {
    logger.warn({ subject: opts.subject }, `[NOTIFY] ${opts.subject}\n${opts.body}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.NOTIFY_EMAIL_FROM ?? process.env.NOTIFY_SMTP_USER,
      to: process.env.NOTIFY_EMAIL_TO,
      subject: opts.subject,
      text: opts.body,
    });
    logger.info({ subject: opts.subject }, 'Notification email sent');
  } catch (err: any) {
    logger.error({ err: err.message, subject: opts.subject }, 'Failed to send notification email');
  }
}
