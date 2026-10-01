import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

interface AuthenticatedRequest {
  user: JwtPayload;
}

/**
 * REST surface for the authenticated user's vehicle (Requirement 4).
 *
 * Each user has at most one vehicle (vehicles.user_id is UNIQUE), so the
 * routes operate on "the current user's vehicle" rather than on a vehicle id.
 * All routes require a valid access token.
 */
@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  /** GET /vehicles/me — the current user's vehicle, or `null` if none. */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  findMine(@Req() req: AuthenticatedRequest) {
    return this.vehiclesService.findForUser(req.user.sub);
  }

  /** POST /vehicles — register the current user's vehicle. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.createForUser(req.user.sub, dto);
  }

  /** PATCH /vehicles/me — update the current user's vehicle. */
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  update(@Req() req: AuthenticatedRequest, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.updateForUser(req.user.sub, dto);
  }

  /** DELETE /vehicles/me — remove the current user's vehicle. */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: AuthenticatedRequest): Promise<void> {
    await this.vehiclesService.deleteForUser(req.user.sub);
  }
}
