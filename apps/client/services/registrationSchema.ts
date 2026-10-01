/**
 * Client-side registration validation schema (Requirement 1).
 *
 * Mirrors the server password policy enforced by the backend
 * `IsStrongPassword` validator so that the client rejects bad input before
 * it ever reaches the Auth_Service:
 *   • email: local-part@domain.tld — alphanumerics/dot/underscore/hyphen local
 *     part, domain with at least one dot (Req 1.1)
 *   • password: 8–128 chars, ≥1 uppercase, ≥1 digit, ≥1 special char from
 *     the set !@#$%^&*()_+-=[]{}|;':",.<>?/ (Req 1.3)
 *   • confirmPassword: must match password (Req 1.6)
 *   • displayName: optional (schema `users.display_name` is nullable)
 *
 * Each password criterion is validated independently so the form can list
 * every unmet criterion individually (Req 1.4).
 */
import { z } from 'zod';

// Req 1.1 — local part: alphanumeric, dot, underscore, hyphen; domain has a dot.
export const EMAIL_REGEX = /^[A-Za-z0-9._-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

// Must mirror the server set: !@#$%^&*()_+-=[]{}|;':",.<>?/  (Req 1.3)
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()\]_+\-=\[{}|;':",.<>?/]/;

export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
} as const;

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'El correo es obligatorio')
  .regex(EMAIL_REGEX, 'El formato del correo electrónico no es válido');

export const passwordSchema = z
  .string()
  .min(PASSWORD_RULES.minLength, 'La contraseña debe tener al menos 8 caracteres')
  .max(PASSWORD_RULES.maxLength, 'La contraseña no debe superar los 128 caracteres')
  .regex(/[A-Z]/, 'La contraseña debe contener al menos 1 letra mayúscula')
  .regex(/\d/, 'La contraseña debe contener al menos 1 número')
  .regex(SPECIAL_CHAR_REGEX, 'La contraseña debe contener al menos 1 carácter especial');

export const registrationSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
    displayName: z
      .string()
      .trim()
      .max(100, 'El nombre no debe superar los 100 caracteres')
      .optional()
      .or(z.literal('')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    // Req 1.6 — passwords must match; error attached to confirmPassword field.
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegistrationFormValues = z.infer<typeof registrationSchema>;

/** Shape sent to the Auth_Service. displayName omitted when blank. */
export interface RegisterPayload {
  email: string;
  password: string;
  displayName?: string;
}
