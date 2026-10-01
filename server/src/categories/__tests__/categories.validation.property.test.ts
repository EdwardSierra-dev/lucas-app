/**
 * Property-based tests for custom category validation.
 *
 * Feature: lucas-app-v1
 *  - Property 4: Valid custom category addition (CreateCategoryDto passes validation)
 *  - Property 5: Invalid custom category is rejected (CreateCategoryDto fails validation)
 *  - Property 6: Duplicate category name rejection (case-insensitive) via CategoriesService
 *
 * Validates: Requirements 2.4, 2.5, 2.6, 3.3
 */

import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import * as fc from 'fast-check';
import { CategoriesService } from '../categories.service';
import { Category, ExpenseType } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';

// ---------------------------------------------------------------------------
// Shared arbitraries / fixtures
// ---------------------------------------------------------------------------
const EXPENSE_TYPES: ExpenseType[] = [
  'mandatory',
  'optional',
  'vehicle',
  'loan',
  'income',
];

const USER_ID = '11111111-1111-1111-1111-111111111111';

// A name of a given length that is NOT purely whitespace, so it only exercises
// the length constraint (and never fails on an unrelated rule).
const nameOfLength = (len: number) =>
  fc
    .array(fc.char(), { minLength: len, maxLength: len })
    .map((chars) => chars.join(''))
    // Replace with a non-whitespace filler to keep an exact length but ensure
    // the string carries visible content.
    .map((s) => (len === 0 ? s : 'x' + s.slice(1)));

const validName = fc.integer({ min: 1, max: 40 }).chain(nameOfLength);
const validEmoji = fc
  .integer({ min: 1, max: 10 })
  .chain((len) =>
    fc.array(fc.constant('x'), { minLength: len, maxLength: len }).map((a) => a.join('')),
  );
const validType = fc.constantFrom(...EXPENSE_TYPES);

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

// A chainable query-builder mock mirroring categories.service.test.ts.
function makeQueryBuilder(result: { one?: Category | null }) {
  const qb: any = {
    where: jest.fn(() => qb),
    orWhere: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    addOrderBy: jest.fn(() => qb),
    getMany: jest.fn(async () => []),
    getOne: jest.fn(async () => result.one ?? null),
  };
  return qb;
}

// ---------------------------------------------------------------------------
// P4: Valid custom category passes CreateCategoryDto validation
// ---------------------------------------------------------------------------
describe('P4: Valid custom category addition', () => {
  it('yields no validation errors for name 1–40, emoji 1–10, valid type', async () => {
    // Validates: Requirements 2.4, 3.3
    await fc.assert(
      fc.asyncProperty(
        validName,
        validEmoji,
        validType,
        async (name, emoji, type) => {
          const dto = plainToInstance(CreateCategoryDto, { name, emoji, type });
          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P5: Invalid custom category is rejected by CreateCategoryDto validation
// ---------------------------------------------------------------------------
describe('P5: Invalid custom category is rejected', () => {
  it('rejects an empty name (length 0) via the Length constraint', async () => {
    // Validates: Requirements 2.5, 2.6
    await fc.assert(
      fc.asyncProperty(validEmoji, validType, async (emoji, type) => {
        const dto = plainToInstance(CreateCategoryDto, { name: '', emoji, type });
        const errors = await validate(dto);
        const nameError = errors.find((e) => e.property === 'name');
        expect(nameError).toBeDefined();
        expect(nameError?.constraints).toHaveProperty('isLength');
      }),
      { numRuns: 100 },
    );
  });

  it('rejects a name longer than 40 chars via the Length constraint', async () => {
    // Validates: Requirements 2.5, 2.6
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 41, max: 200 }).chain(nameOfLength),
        validEmoji,
        validType,
        async (name, emoji, type) => {
          const dto = plainToInstance(CreateCategoryDto, { name, emoji, type });
          const errors = await validate(dto);
          const nameError = errors.find((e) => e.property === 'name');
          expect(nameError).toBeDefined();
          expect(nameError?.constraints).toHaveProperty('isLength');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects a type not in the allowed set via the IsIn constraint', async () => {
    // Validates: Requirements 2.5
    await fc.assert(
      fc.asyncProperty(
        validName,
        validEmoji,
        fc.string().filter((s) => !EXPENSE_TYPES.includes(s as ExpenseType)),
        async (name, emoji, type) => {
          const dto = plainToInstance(CreateCategoryDto, { name, emoji, type });
          const errors = await validate(dto);
          const typeError = errors.find((e) => e.property === 'type');
          expect(typeError).toBeDefined();
          expect(typeError?.constraints).toHaveProperty('isIn');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P6: Duplicate name rejection (case-insensitive) via CategoriesService
// ---------------------------------------------------------------------------
describe('P6: Duplicate category name rejection (case-insensitive)', () => {
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

  // Random case variant of a string: flips the case of each ASCII letter at random.
  const caseVariantOf = (name: string) =>
    fc
      .array(fc.boolean(), { minLength: name.length, maxLength: name.length })
      .map((flips) =>
        name
          .split('')
          .map((ch, i) =>
            flips[i] ? (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase()) : ch,
          )
          .join(''),
      );

  it('rejects with ConflictException when a case-insensitive duplicate exists', async () => {
    // Validates: Requirements 2.6, 3.3
    await fc.assert(
      fc.asyncProperty(
        validName.chain((name) =>
          caseVariantOf(name).map((existing) => ({ name, existing })),
        ),
        validEmoji,
        validType,
        async ({ name, existing }, emoji, type) => {
          const existingCategory = makeCategory({ name: existing });
          (repo.createQueryBuilder as jest.Mock).mockReturnValue(
            makeQueryBuilder({ one: existingCategory }),
          );
          (repo.save as jest.Mock).mockReset();

          const dto: CreateCategoryDto = { name, emoji, type };
          await expect(service.createCustom(USER_ID, dto)).rejects.toBeInstanceOf(
            ConflictException,
          );
          expect(repo.save).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('persists the category when no duplicate exists (getOne returns null)', async () => {
    // Validates: Requirements 2.4, 3.3
    await fc.assert(
      fc.asyncProperty(validName, validEmoji, validType, async (name, emoji, type) => {
        const created = makeCategory({ name, emoji, type, userId: USER_ID });
        (repo.createQueryBuilder as jest.Mock).mockReturnValue(
          makeQueryBuilder({ one: null }),
        );
        (repo.create as jest.Mock).mockReturnValue(created);
        (repo.save as jest.Mock).mockResolvedValue(created);

        const dto: CreateCategoryDto = { name, emoji, type };
        const result = await service.createCustom(USER_ID, dto);

        expect(repo.save).toHaveBeenCalledWith(created);
        expect(result).toBe(created);
      }),
      { numRuns: 100 },
    );
  });
});
