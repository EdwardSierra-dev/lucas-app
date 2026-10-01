import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import { MetricsResult, MetricsService } from './metrics.service';

interface AuthenticatedRequest {
  user: JwtPayload;
}

/**
 * Metrics endpoints. All routes require a valid access token; aggregation is
 * always scoped to the JWT subject so a caller can only summarise their own
 * expense records.
 */
@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Return aggregated expense totals for the authenticated user, filtered and
   * grouped per the supplied query. Uses POST (not GET) because the filter is a
   * structured body (date range, category id list, type, grouping dimension).
   */
  @Post('expenses')
  @HttpCode(HttpStatus.OK)
  expenses(
    @Req() req: AuthenticatedRequest,
    @Body() dto: MetricsQueryDto,
  ): Promise<MetricsResult> {
    return this.metricsService.aggregate(req.user.sub, dto);
  }
}
