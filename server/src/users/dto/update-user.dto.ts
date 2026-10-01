import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for PATCH /users/me.
 *
 * Lets the authenticated user update their own profile. Currently only the
 * display name is editable (maps to users.display_name VARCHAR(100)); every
 * field is optional so the client may send just what it wants to change.
 *
 * `@nestjs/mapped-types` is not a dependency of this project, so the partial
 * shape is declared explicitly rather than via `PartialType`.
 */
export class UpdateUserDto {
  /**
   * The user's display name. Trimmed on the server; must be 1–100 characters
   * once trimmed (a blank/whitespace-only value is rejected). Omit the field
   * entirely to leave the name unchanged.
   */
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Display name cannot be empty' })
  @MaxLength(100)
  displayName?: string;
}
