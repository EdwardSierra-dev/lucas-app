import { IsEmail } from 'class-validator';

/**
 * DTO for POST /budgets/:id/invitations.
 *
 * Validation (Requirement 5.2):
 *  - inviteeEmail: must be a valid email address. The service additionally
 *    verifies the address maps to a registered user (Requirement 5.3).
 */
export class InviteMemberDto {
  @IsEmail({}, { message: 'Email address format is invalid' })
  inviteeEmail: string;
}
