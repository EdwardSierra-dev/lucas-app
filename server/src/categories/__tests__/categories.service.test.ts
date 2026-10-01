import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriesService } from '../categories.service';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222';

function makeCategory(partial: Partial<Category>): Category {
  return {
    id: partial.id ?? '00000000-0000-0000-0000-000000000000',
    userId: partial.userId ?? null,
    user: null,
    name: partial.name ?? 'Agua',
    emoji: partial.emoji ?? '💧',
    type: partial.type ?? 'mandatory',
    isPredefined: partial.isPredefined ?? false,
    createdAt: partial.createdAt ?? new Date(),
  } as Category;
}

// A chainable query-builder mock. `getMany`/`getOne` resolve from configurable
// per-test values.
function makeQueryBuilder(result: { many?: Category[]; one?: Category | null }) {
  const qb: any = {
    where: jest.fn(() => qb),
    orWhere: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    addOrderBy: jest.fn(() => qb),
    getMany: jest.fn(async () => result.many ?? []),
    getOne: jest.fn(async () => result.one ?? null),
  };
  return qb;
}

describe('CategoriesService (Requirements 2.1–2.10, 3.1–3.10)', () => {
  let service: CategoriesService;
  let repo: jest.Mocked<Repository<Category>>;

  beforeEach(async () => {
    const repoMock: Partial<jest.Mocked<Repository<Category>>> = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: repoMock },
      ],
    }).compile();

    service = module.get(CategoriesService);
    repo = module.get(getRepositoryToken(Category));
  });

  // -------------------------------------------------------------------------
  // listForUser
  // -------------------------------------------------------------------------
  describe('listForUser', () => {
    it('returns predefined categories plus the user custom categories', async () => {
      const predefined = makeCategory({
        id: 'p1',
        userId: null,
        name: 'Agua',
        isPredefined: true,
      });
      const custom = makeCategory({
        id: 'c1',
        userId: USER_ID,
        name: 'Gimnasio',
        isPredefined: false,
      });
      (repo.createQueryBuilder as jest.Mock).mockReturnValue(
        makeQueryBuilder({ many: [predefined, custom] }),
      );

      const result = await service.listForUser(USER_ID);

      expect(result).toEqual([predefined, custom]);
      expect(repo.createQueryBuilder).toHaveBeenCalledWith('category');
    });
  });

  // -------------------------------------------------------------------------
  // createCustom
  // -------------------------------------------------------------------------
  describe('createCustom', () => {
    const dto: CreateCategoryDto = {
      name: 'Gimnasio',
      emoji: '🏋️',
      type: 'optional',
    };

    it('persists a new custom category when no duplicate exists', async () => {
      (repo.createQueryBuilder as jest.Mock).mockReturnValue(
        makeQueryBuilder({ one: null }),
      );
      const created = makeCategory({ ...dto, userId: USER_ID });
      (repo.create as jest.Mock).mockReturnValue(created);
      (repo.save as jest.Mock).mockResolvedValue(created);

      const result = await service.createCustom(USER_ID, dto);

      expect(repo.create).toHaveBeenCalledWith({
        userId: USER_ID,
        name: dto.name,
        emoji: dto.emoji,
        type: dto.type,
        isPredefined: false,
      });
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it('throws ConflictException when a duplicate name exists (Property P6)', async () => {
      const existing = makeCategory({
        id: 'p1',
        userId: null,
        name: 'gimnasio', // case-insensitive match of the DTO name
        isPredefined: true,
      });
      (repo.createQueryBuilder as jest.Mock).mockReturnValue(
        makeQueryBuilder({ one: existing }),
      );

      await expect(service.createCustom(USER_ID, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // deleteCustom
  // -------------------------------------------------------------------------
  describe('deleteCustom', () => {
    it('removes a custom category owned by the user', async () => {
      const owned = makeCategory({
        id: 'c1',
        userId: USER_ID,
        isPredefined: false,
      });
      (repo.findOne as jest.Mock).mockResolvedValue(owned);
      (repo.remove as jest.Mock).mockResolvedValue(owned);

      await expect(service.deleteCustom(USER_ID, 'c1')).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith(owned);
    });

    it('throws NotFoundException when the category does not exist', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteCustom(USER_ID, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when deleting a predefined category', async () => {
      const predefined = makeCategory({
        id: 'p1',
        userId: null,
        isPredefined: true,
      });
      (repo.findOne as jest.Mock).mockResolvedValue(predefined);

      await expect(service.deleteCustom(USER_ID, 'p1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when deleting another user category', async () => {
      const foreign = makeCategory({
        id: 'c2',
        userId: OTHER_USER_ID,
        isPredefined: false,
      });
      (repo.findOne as jest.Mock).mockResolvedValue(foreign);

      await expect(service.deleteCustom(USER_ID, 'c2')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
