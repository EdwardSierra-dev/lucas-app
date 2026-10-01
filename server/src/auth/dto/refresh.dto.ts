import { IsNotEmpty, IsString } from 'class-validator';

/** DTO for POST /auth/refresh. */
export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
