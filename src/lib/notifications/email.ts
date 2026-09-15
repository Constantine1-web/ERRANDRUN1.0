export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: any }>;
}

/**
 * Resend Implementation Adapter.
 * Replaceable in the future with SendGridProvider, SMTPProvider, etc.
 */
export class ResendProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'updates@errandrun.com';
  }

  async send(payload: EmailPayload) {
    if (!this.apiKey) {
      console.warn('RESEND_API_KEY missing. Skipping real email dispatch.');
      return { success: false, error: 'Provider not configured' };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: `ERRANDRUN <${this.fromEmail}>`,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data };
      }

      return { success: true, messageId: data.id };
    } catch (error) {
      return { success: false, error };
    }
  }
}
