import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { MailService } from '../../mail/mail.service';

/**
 * Structural stand-in for the User entity. Declared locally so the test does
 * not import the TypeORM entity class (whose decorator-populated fields would
 * otherwise trip strict property-initialization during ts-jest compilation).
 */
interface TestUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
  currency: string;
  vehicleOwner: boolean;
  emailVerified: boolean;
  onboardingDone: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Unit tests for AuthService (Requirements 1.7, 1.8, 1.9 and login/credential rules).
 * UsersService, MailService, JwtService and ConfigService are mocked so the
 * tests exercise only the service logic — no database or real signing.
 */
describe('AuthService — unit tests', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; findById: jest.Mock; create: jest.Mock };
  let mailService: { sendConfirmationEmail: jest.Mock };
  let jwtService: { sign: jest.Mock; signAsync: jest.Mock; verifyAsync: jest.Mock };
  let configService: { get: jest.Mock };

  const buildUser = (overrides: Partial<TestUser> = {}): TestUser =>
    ({
      id: 'user-uuid-1',
      email: 'test@example.com',
      passwordHash: 'hashed',
      displayName: null,
      currency: 'COP',
      vehicleOwner: false,
      emailVerified: false,
      onboardingDone: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as TestUser;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    mailService = {
      sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('verify-token'),
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_SECRET: 'test-access-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
        };
        return values[key];
      }),
    };

    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as never,
      configService as never,
      mailService as unknown as MailService,
    );
  });

  describe('register', () => {
    it('hashes the password, persists the user, sends email and returns a user without the hash', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const created = buildUser();
      usersService.create.mockResolvedValue(created);

      const result = await service.register({
        email: 'test@example.com',
        password: 'StrongPass1!',
      });

      // Password was hashed (not stored verbatim) and verifies with bcrypt
      const createArg = usersService.create.mock.calls[0]?.[0] ?? {};
      expect(createArg.email).toBe('test@example.com');
      expect(createArg.passwordHash).toBeDefined();
      expect(createArg.passwordHash).not.toBe('StrongPass1!');
      expect(await bcrypt.compare('StrongPass1!', createArg.passwordHash as string)).toBe(true);

      // Confirmation email dispatched (Requirement 1.8)
      expect(mailService.sendConfirmationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'verify-token',
      );

      // Returned user never exposes the password hash
      expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
      expect(result.email).toBe('test@example.com');
    });

    it('throws ConflictException when the email is already registered (Requirement 1.9)', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());

      await expect(
        service.register({ email: 'test@example.com', password: 'StrongPass1!' }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(usersService.create).not.toHaveBeenCalled();
      expect(mailService.sendConfirmationEmail).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns access and refresh tokens for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('StrongPass1!', 10);
      usersService.findByEmail.mockResolvedValue(buildUser({ passwordHash }));
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const tokens = await service.login({
        email: 'test@example.com',
        password: 'StrongPass1!',
      });

      expect(tokens.accessToken).toBe('access-token');
      expect(tokens.refreshToken).toBe('refresh-token');
    });

    it('throws UnauthorizedException when the user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'StrongPass1!' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass1!', 10);
      usersService.findByEmail.mockResolvedValue(buildUser({ passwordHash }));

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPass1!' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
