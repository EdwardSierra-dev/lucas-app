import { IsEmail } from 'class-validator';
import { IsStrongPassword } from '../validators/password.validator';

/**
 * DTO for POST /auth/register.
 *
 * Validation:
 *  - email: must be a valid RFC-5321 address (@IsEmail from class-validator)
 *  - password: must pass all criteria enforced by @IsStrongPassword
 *    (Requirements 1.3, 1.4):
 *      • minimum 8 characters
 *      • maximum 128 characters
 *      • at least 1 uppercase letter
 *      • at least 1 digit
 *      • at least 1 special character from !@#$%^&*()_+-=[]{}|;':",.<>?/
 *
 * A 409 Conflict is returned by the AuthService when the email is already
 * registered (Requirement 1.9). That check lives in the service layer, not
 * in this DTO, because it requires a database lookup.
 */
export class RegisterDto {
  @IsEmail({}, { message: 'Email address format is invalid' })
  email: string;

  @IsStrongPassword()
  password: string;
}
