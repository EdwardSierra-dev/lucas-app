import { IsIn, IsString, Length } from 'class-validator';
import type { ExpenseType } from '../entities/category.entity';

/**
 * Payload for creating a custom category.
 * Validation mirrors the `categories` table constraints:
 *  - name: 1–40 chars (table VARCHAR(40))
 *  - emoji: 1–10 chars (table VARCHAR(10))
 *  - type: one of the allowed expense types
 */
export class CreateCategoryDto {
  @IsString()
  @Length(1, 40)
  name: string;

  @IsString()
  @Length(1, 10)
  emoji: string;

  @IsIn(['mandatory', 'optional', 'vehicle', 'loan', 'income'])
  type: ExpenseType;
}
