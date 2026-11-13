import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '../config/env.js'

export interface SendInvitationEmailOptions {
  recipientEmail: string
  recipientName?: string | null
  businessName: string
  inviterName: string
  role: string
  invitationUrl: string
  expiresAt: Date
  customMessage?: string | null
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
}

export class EmailService {
  private transporter: Transporter | null = null

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      try {
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        })
      } catch (err: any) {
        console.error('[EMAIL SERVICE] Failed to initialize SMTP transporter:', err)
        this.transporter = null
      }
    }
  }

  /**
   * Checks whether a live SMTP provider is configured.
   */
  isConfigured(): boolean {
    return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && this.transporter)
  }

  /**
   * Sends an employee invitation email.
   * Complies with MAAREE 360 Specification Section 5.
   */
  async sendInvitationEmail(options: SendInvitationEmailOptions): Promise<EmailSendResult> {
    const {
      recipientEmail,
      recipientName,
      businessName,
      inviterName,
      role,
      invitationUrl,
      expiresAt,
      customMessage,
    } = options

    const formattedRole = role.replace(/_/g, ' ')
    const formattedExpiry = new Date(expiresAt).toLocaleDateString('en-KE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const subject = `You've been invited to join ${businessName} on MAAREE 360`

    // Plaintext fallback
    const textContent = `
Hello ${recipientName || 'there'},

${inviterName} has invited you to join ${businessName} on MAAREE 360 as a ${formattedRole}.

${customMessage ? `Personal message from ${inviterName}:\n"${customMessage}"\n\n` : ''}
To accept this invitation and activate your staff account, visit the link below:
${invitationUrl}

This invitation is linked to your email (${recipientEmail}) and expires in 72 hours on ${formattedExpiry}.

• If you are new to MAAREE 360: Open the link above to set your password and join ${businessName} immediately.
• If you already have an account: Sign in with this email address to accept the role.

If you were not expecting this invitation, you can safely ignore this email.

— The MAAREE 360 Team
    `.trim()

    // Professional HTML Email Template
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B; }
    .card { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
    .header { background: #101C35; padding: 32px 24px; text-align: center; }
    .brand-title { color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .brand-subtitle { color: #12A878; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1.5px; margin-top: 4px; }
    .content { padding: 32px 28px; }
    h2 { font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 16px; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px; }
    .highlight-box { background: #F1F5F9; border-left: 4px solid #12A878; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .highlight-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
    .highlight-row:last-child { margin-bottom: 0; }
    .highlight-label { color: #64748B; }
    .highlight-val { color: #0F172A; font-weight: 600; }
    .quote-box { background: #F0FDF4; border: 1px solid #BBF7D0; padding: 14px 16px; border-radius: 8px; font-size: 13px; font-style: italic; color: #166534; margin: 18px 0; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #12A878; color: #FFFFFF !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; letter-spacing: 0.2px; }
    .instructions { font-size: 12px; color: #64748B; line-height: 1.5; margin-top: 24px; padding-top: 20px; border-top: 1px solid #E2E8F0; }
    .instructions li { margin-bottom: 6px; }
    .fallback-url { word-break: break-all; font-family: monospace; font-size: 11px; color: #0284C7; background: #F8FAFC; padding: 8px 12px; border-radius: 6px; border: 1px solid #E2E8F0; }
    .footer { background: #F8FAFC; padding: 20px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #F1F5F9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand-title">MAAREE 360</div>
      <div class="brand-subtitle">Retail &amp; Business Management System</div>
    </div>
    <div class="content">
      <h2>Join the team at ${businessName}</h2>
      <p>Hello <strong>${recipientName || 'there'}</strong>,</p>
      <p>
        <strong>${inviterName}</strong> has invited you to join the team at <strong>${businessName}</strong> on the <strong>MAAREE 360</strong> retail platform.
      </p>

      <div class="highlight-box">
        <div class="highlight-row">
          <span class="highlight-label">Business:</span>
          <span class="highlight-val">${businessName}</span>
        </div>
        <div class="highlight-row">
          <span class="highlight-label">Assigned Role:</span>
          <span class="highlight-val">${formattedRole}</span>
        </div>
        <div class="highlight-row">
          <span class="highlight-label">Target Email:</span>
          <span class="highlight-val">${recipientEmail}</span>
        </div>
        <div class="highlight-row">
          <span class="highlight-label">Expires:</span>
          <span class="highlight-val">${formattedExpiry}</span>
        </div>
      </div>

      ${customMessage ? `<div class="quote-box">"${customMessage}"<br>— <strong>${inviterName}</strong></div>` : ''}

      <div class="btn-container">
        <a href="${invitationUrl}" class="btn" target="_blank">Accept Invitation &amp; Join Team</a>
      </div>

      <div class="instructions">
        <strong>Getting started:</strong>
        <ul>
          <li><strong>New to MAAREE 360?</strong> Click the button above to set your password and join ${businessName} immediately.</li>
          <li><strong>Existing member?</strong> Simply sign in using this email address (${recipientEmail}) to accept your new role.</li>
        </ul>
        <p style="margin-top: 12px; margin-bottom: 6px;">Direct link if button does not open:</p>
        <div class="fallback-url">${invitationUrl}</div>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} MAAREE 360. All rights reserved.<br>
      This email was sent to ${recipientEmail} regarding an invitation to join ${businessName}.
    </div>
  </div>
</body>
</html>
    `.trim()

    // If SMTP provider is configured, send the real email
    if (this.isConfigured() && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: env.SMTP_FROM,
          to: recipientEmail,
          subject,
          text: textContent,
          html: htmlContent,
        })
        console.log(`[EMAIL SERVICE] Invitation email delivered successfully to ${recipientEmail} [ID: ${info.messageId}]`)
        return {
          success: true,
          messageId: info.messageId,
        }
      } catch (err: any) {
        console.error(`[EMAIL SERVICE] Failed to deliver invitation email to ${recipientEmail}:`, err)
        return {
          success: false,
          error: `Email delivery failed: ${err.message || 'SMTP connection error'}`,
        }
      }
    }

    // SMTP provider is not configured
    const errorMsg = 'SMTP email provider is not configured. Configure SMTP_HOST, SMTP_USER, SMTP_PASS in server environment.'
    console.warn(`\n[EMAIL SERVICE - CONFIGURATION NOTICE]`)
    console.warn(`No SMTP server is configured in .env. Email to '${recipientEmail}' was not sent through an SMTP gateway.`)
    console.warn(`Invitation Link: ${invitationUrl}`)
    console.warn(`[END NOTICE]\n`)

    return {
      success: false,
      error: errorMsg,
    }
  }
}

export const emailService = new EmailService()
