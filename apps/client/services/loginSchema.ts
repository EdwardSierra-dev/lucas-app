/**
 * Client-side login validation schema (Requirement 1 — auth flow).
 *
 * Login is intentionally lenient compared to registration: the server is the
 * source of truth for credential correctness, so the client only guards
 * against obviously invalid submissions before hitting the Auth_Service:
 *   • email: must look like an email (reuses the registration EMAIL_REGEX)
 *   • password: non-empty (strength is not re-validated on login — Req 1.3
 *     applies to account creation, not sign-in)
 */
import { z } from 'zod';
import { EMAIL_REGEX } from './registrationSchema';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'El correo es obligatorio')
    .regex(EMAIL_REGEX, 'El formato del correo electrónico no es válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/** Shape sent to the Auth_Service for POST /auth/login. */
export interface LoginPayload {
  email: string;
  password: string;
}
