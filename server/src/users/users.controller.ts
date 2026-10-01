import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

interface AuthenticatedRequest {
  user: JwtPayload;
}

/**
 * Profile endpoints for the authenticated user. All routes are guarded by
 * {@link JwtAuthGuard} and operate on the current user resolved from the
 * access token (`req.user.sub`) — a user can only read/update their own
 * profile. Mirrors the `/vehicles/me` controller shape.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /users/me — the current user's profile (no password hash). */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  findMine(@Req() req: AuthenticatedRequest) {
    return this.usersService.getProfile(req.user.sub);
  }

  /** PATCH /users/me — update the current user's profile (e.g. display name). */
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  update(@Req() req: AuthenticatedRequest, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.sub, dto);
  }
}
