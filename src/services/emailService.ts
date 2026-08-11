import nodemailer from 'nodemailer';

export interface EmailMessage {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  emailType?: string;
}

export interface SendEmailResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  isSimulated?: boolean;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export async function sendTransactionalEmail(message: EmailMessage): Promise<SendEmailResult> {
  const provider = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'BidHive <no-reply@bidhive.np>';
  const isProd = process.env.NODE_ENV === 'production';

  const maskedTo = maskEmail(message.to);

  // Mode 1: Console / Development (simulated)
  if (provider === 'console' || provider === 'development') {
    console.log(`[EMAIL SIMULATION] Provider: ${provider}`);
    console.log(`[EMAIL SIMULATION] To: ${maskedTo} (${message.toName || 'User'})`);
    console.log(`[EMAIL SIMULATION] Subject: ${message.subject}`);
    console.log(`[EMAIL SIMULATION] Type: ${message.emailType || 'GENERAL'}`);
    console.log(`[EMAIL SIMULATION] Text snippet: ${message.textContent.substring(0, 100)}...`);

    return {
      success: true,
      providerMessageId: `console-simulated-${Date.now()}`,
      isSimulated: true,
    };
  }

  // Mode 2: Resend API
  if (provider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      const err = 'RESEND_API_KEY environment variable is required when EMAIL_PROVIDER=resend';
      if (isProd) throw new Error(err);
      return { success: false, error: err };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          html: message.htmlContent,
          text: message.textContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.message || data.error || 'Resend API returned error';
        console.error(`[EMAIL ERROR] Resend failure for ${maskedTo}:`, errorMsg);
        return { success: false, error: String(errorMsg) };
      }

      console.log(`[EMAIL SENT] Resend successfully delivered to ${maskedTo}, ID: ${data.id}`);
      return {
        success: true,
        providerMessageId: data.id,
        isSimulated: false,
      };
    } catch (err: any) {
      console.error(`[EMAIL ERROR] Resend network exception for ${maskedTo}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // Mode 3: SMTP (via nodemailer)
  if (provider === 'smtp') {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      const err = 'SMTP host, user, and password environment variables are required when EMAIL_PROVIDER=smtp';
      if (isProd) throw new Error(err);
      return { success: false, error: err };
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });

      const info = await transporter.sendMail({
        from,
        to: message.toName ? `"${message.toName}" <${message.to}>` : message.to,
        subject: message.subject,
        text: message.textContent,
        html: message.htmlContent,
      });

      console.log(`[EMAIL SENT] SMTP successfully delivered to ${maskedTo}, ID: ${info.messageId}`);
      return {
        success: true,
        providerMessageId: info.messageId,
        isSimulated: false,
      };
    } catch (err: any) {
      console.error(`[EMAIL ERROR] SMTP failure for ${maskedTo}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  return {
    success: false,
    error: `Unsupported EMAIL_PROVIDER: ${provider}`,
  };
}
