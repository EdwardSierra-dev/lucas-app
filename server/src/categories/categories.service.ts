import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  /**
   * List the categories visible to a user: predefined categories (user_id IS NULL)
   * plus the user's own custom categories.
   */
  async listForUser(userId: string): Promise<Category[]> {
    return this.categoriesRepository
      .createQueryBuilder('category')
      .where('category.user_id IS NULL')
      .orWhere('category.user_id = :userId', { userId })
      .orderBy('category.is_predefined', 'DESC')
      .addOrderBy('category.created_at', 'ASC')
      .getMany();
  }

  /**
   * Create a custom category owned by the user.
   * Rejects (ConflictException) when a category with the same name already exists
   * for the user or in the predefined set, compared case-insensitively (Property P6).
   */
  async createCustom(
    userId: string,
    dto: CreateCategoryDto,
  ): Promise<Category> {
    const duplicate = await this.categoriesRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name: dto.name })
      .andWhere(
        '(category.user_id IS NULL OR category.user_id = :userId)',
        { userId },
      )
      .getOne();

    if (duplicate) {
      throw new ConflictException(
        `A category named "${dto.name}" already exists`,
      );
    }

    const category = this.categoriesRepository.create({
      userId,
      name: dto.name,
      emoji: dto.emoji,
      type: dto.type,
      isPredefined: false,
    });

    return this.categoriesRepository.save(category);
  }

  /**
   * Delete a custom category owned by the user.
   *  - NotFoundException when the category does not exist.
   *  - ForbiddenException when it is a predefined category or owned by another user.
   */
  async deleteCustom(userId: string, categoryId: string): Promise<void> {
    const category = await this.categoriesRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.isPredefined || category.userId === null) {
      throw new ForbiddenException('Predefined categories cannot be deleted');
    }

    if (category.userId !== userId) {
      throw new ForbiddenException('You can only delete your own categories');
    }

    await this.categoriesRepository.remove(category);
  }
}
