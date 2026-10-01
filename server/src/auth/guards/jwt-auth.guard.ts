import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guards routes requiring a valid access token.
 * Usage: `@UseGuards(JwtAuthGuard)` on a controller or handler.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
