import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * DTO for PATCH /vehicles/me.
 *
 * A partial version of {@link CreateVehicleDto}: every field is optional so the
 * client may send only the fields it wants to change. Each supplied field is
 * validated with the same rules as on creation. `@nestjs/mapped-types` is not a
 * dependency of this project, so the partial shape is declared explicitly
 * rather than via `PartialType`.
 */
export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsDateString()
  soatExpiry?: string;

  @IsOptional()
  @IsDateString()
  tecnomecanicaExpiry?: string;

  @IsOptional()
  @IsDateString()
  kitExpiry?: string;
}
