import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Password criteria checked individually so each unmet criterion
 * is reported as a distinct message (Requirements 1.3, 1.4).
 */
const SPECIAL_CHARS = `!@#$%^&*()_+-=[]{}|;':",.<>?/`;

const CRITERIA = [
  {
    key: 'minLength',
    message: 'Password must be at least 8 characters long',
    test: (p: string) => p.length >= 8,
  },
  {
    key: 'maxLength',
    message: 'Password must not exceed 128 characters',
    test: (p: string) => p.length <= 128,
  },
  {
    key: 'uppercase',
    message: 'Password must contain at least 1 uppercase letter',
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    key: 'digit',
    message: 'Password must contain at least 1 digit',
    test: (p: string) => /\d/.test(p),
  },
  {
    key: 'specialChar',
    message: `Password must contain at least 1 special character from: ${SPECIAL_CHARS}`,
    test: (p: string) => /[!@#$%^&*()\]_+\-=\[{}|;':",.<>?/]/.test(p),
  },
] as const;

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Pure function: validates a password string against all criteria and returns
 * the result with a list of unmet-criterion messages. Suitable for direct use
 * in tests and for use by the class-validator constraint.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  for (const criterion of CRITERIA) {
    if (!criterion.test(password)) {
      errors.push(criterion.message);
    }
  }

  return { valid: errors.length === 0, errors };
}

@ValidatorConstraint({ name: 'IsStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: unknown, _args: ValidationArguments): boolean {
    if (typeof password !== 'string') return false;
    return validatePassword(password).valid;
  }

  defaultMessage(_args: ValidationArguments): string {
    // class-validator calls this when validate() returns false; the actual
    // per-criterion messages are injected by the decorator factory below.
    return 'Password does not meet security requirements';
  }
}

/**
 * Custom decorator that validates the password field and produces one
 * validation error message per unmet criterion.
 *
 * Usage:
 *   @IsStrongPassword()
 *   password: string;
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsStrongPassword',
      target: (object as { constructor: Function }).constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          return validatePassword(value).valid;
        },
        defaultMessage(args: ValidationArguments): string {
          const value = args.value;
          if (typeof value !== 'string') {
            return 'password must be a string';
          }
          const result = validatePassword(value);
          // Return all unmet criteria joined; NestJS ValidationPipe
          // will surface these as an array via exceptionFactory.
          return result.errors.join('; ');
        },
      },
    });
  };
}
