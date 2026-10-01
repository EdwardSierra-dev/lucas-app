import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from './notifications.service';

interface AuthenticatedRequest {
  user: JwtPayload;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  /** List the authenticated user's notifications newest first (optional ?unreadOnly=true). */
  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.listForUser(req.user.sub, {
      unreadOnly: unreadOnly === 'true',
    });
  }

  /** Return the authenticated user's unread notification count (feeds the badge). */
  @Get('unread-count')
  async unreadCount(@Req() req: AuthenticatedRequest) {
    const count = await this.notificationsService.unreadCount(req.user.sub);
    return { count };
  }

  /** Mark all of the authenticated user's notifications as read. */
  @Patch('read-all')
  markAllRead(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.markAllRead(req.user.sub);
  }

  /** Mark a single notification owned by the authenticated user as read. */
  @Patch(':id/read')
  markRead(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markRead(req.user.sub, id);
  }
}
