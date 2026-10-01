import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const BCRYPT_SALT_ROUNDS = 10;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const EMAIL_VERIFY_TTL = '1d';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** User shape returned to callers (never includes the password hash). */
export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
  /** In-memory store of valid refresh tokens, keyed by userId. */
  private readonly refreshTokens = new Map<string, string>();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Register a new account (Requirements 1.7, 1.8, 1.9).
   *  - Rejects duplicate emails with 409 Conflict.
   *  - Hashes the password with bcrypt (10 rounds).
   *  - Dispatches a confirmation email containing a signed verify token.
   */
  async register(dto: RegisterDto): Promise<SafeUser> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      ...(dto.displayName ? { displayName: dto.displayName } : {}),
    });

    const verifyToken = this.signEmailVerifyToken(user);
    await this.mailService.sendConfirmationEmail(user.email, verifyToken);

    return this.stripPassword(user);
  }

  /**
   * Validate credentials and issue tokens (invalid credentials -> 401).
   */
  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  /**
   * Exchange a valid refresh token for a fresh access token.
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.getRequired('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = this.refreshTokens.get(payload.sub);
    if (!stored || stored !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = await this.signAccessToken({
      sub: payload.sub,
      email: payload.email,
    });
    return { accessToken };
  }

  /**
   * Invalidate the stored refresh token for a user.
   */
  logout(userId: string): void {
    this.refreshTokens.delete(userId);
  }

  /**
   * Verify an email-confirmation token and mark the account verified.
   */
  async verifyEmail(token: string): Promise<{ verified: boolean }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.getRequired('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    await this.usersService.create({ id: user.id, emailVerified: true });
    return { verified: true };
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.signAccessToken(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.getRequired('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TOKEN_TTL,
    });

    this.refreshTokens.set(user.id, refreshToken);
    return { accessToken, refreshToken };
  }

  private signAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.getRequired('JWT_SECRET'),
      expiresIn: ACCESS_TOKEN_TTL,
    });
  }

  private signEmailVerifyToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload, {
      secret: this.getRequired('JWT_SECRET'),
      expiresIn: EMAIL_VERIFY_TTL,
    });
  }

  private getRequired(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} is not configured`);
    }
    return value;
  }

  private stripPassword(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
}
