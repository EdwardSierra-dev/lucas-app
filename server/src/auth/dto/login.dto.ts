import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for POST /auth/login.
 *
 * Only validates shape here; credential verification (and the resulting
 * 401 Unauthorized on mismatch — Requirement 1.x) happens in AuthService.
 */
export class LoginDto {
  @IsEmail({}, { message: 'Email address format is invalid' })
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
