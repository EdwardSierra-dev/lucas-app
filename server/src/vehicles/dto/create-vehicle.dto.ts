import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * DTO for POST /vehicles.
 *
 * Validation (Requirement 4.2, 4.3, 4.4):
 *  - vehicleType, model: required non-empty strings
 *  - purchaseDate, soatExpiry, tecnomecanicaExpiry: required ISO date strings
 *  - kitExpiry: optional ISO date string (road emergency kit renewal date);
 *    an empty/absent value is valid and does not block submission (4.4)
 *
 * Cross-field rules (purchase date not in the future — Req 4.5, Property P8;
 * expiry dates not earlier than the purchase date — Req 4.6, Property P9) are
 * validated separately and covered by the property tests in task 9.3. This DTO
 * only enforces presence and ISO-date formatting; the service persists the
 * provided values.
 */
export class CreateVehicleDto {
  @IsString()
  vehicleType: string;

  @IsString()
  model: string;

  @IsDateString()
  purchaseDate: string;

  @IsDateString()
  soatExpiry: string;

  @IsDateString()
  tecnomecanicaExpiry: string;

  @IsOptional()
  @IsDateString()
  kitExpiry?: string;
}
