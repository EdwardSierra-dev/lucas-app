import { Injectable, Logger } from '@nestjs/common';

/**
 * Stub mail service.
 *
 * In production this would dispatch through SMTP / SendGrid / Supabase Auth.
 * For now it logs the message to the console so the registration flow
 * (Requirement 1.8 — confirmation email within 60s) can be exercised
 * end-to-end without a real mail transport.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  /**
   * Send a registration confirmation email containing a verification link.
   * Returns once the message has been "dispatched" (logged).
   */
  async sendConfirmationEmail(to: string, verifyToken: string): Promise<void> {
    const verifyUrl = `/api/v1/auth/verify-email?token=${verifyToken}`;
    this.logger.log(
      `[MAIL] To: ${to} | Subject: Confirma tu cuenta Lucas | Verify link: ${verifyUrl}`,
    );
  }
}
