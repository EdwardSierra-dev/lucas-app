import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../entities/vehicle.entity';
import { VehiclesService } from '../vehicles.service';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';

// ---------------------------------------------------------------------------
// Mocked repository. Each test sets the return values it needs. Using a plain
// jest-mock object keeps the test fast and free of a real database, while still
// exercising the service's real control flow (Requirement 4).
// ---------------------------------------------------------------------------
type MockRepo = {
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
};

const USER_ID = '11111111-1111-1111-1111-111111111111';

const validDto: CreateVehicleDto = {
  vehicleType: 'motorcycle',
  model: 'Yamaha MT-07',
  purchaseDate: '2023-01-15',
  soatExpiry: '2024-01-15',
  tecnomecanicaExpiry: '2024-02-15',
};

function buildVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'veh-1',
    userId: USER_ID,
    user: undefined as unknown as Vehicle['user'],
    vehicleType: validDto.vehicleType,
    model: validDto.model,
    purchaseDate: validDto.purchaseDate,
    soatExpiry: validDto.soatExpiry,
    tecnomecanicaExpiry: validDto.tecnomecanicaExpiry,
    kitExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('VehiclesService (Requirement 4)', () => {
  let service: VehiclesService;
  let repo: MockRepo;

  beforeEach(async () => {
    repo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: getRepositoryToken(Vehicle), useValue: repo },
      ],
    }).compile();

    service = moduleRef.get(VehiclesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findForUser', () => {
    it('returns the vehicle when one exists', async () => {
      const vehicle = buildVehicle();
      repo.findOneBy.mockResolvedValue(vehicle);

      await expect(service.findForUser(USER_ID)).resolves.toBe(vehicle);
      expect(repo.findOneBy).toHaveBeenCalledWith({ userId: USER_ID });
    });

    it('returns null when the user has no vehicle', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.findForUser(USER_ID)).resolves.toBeNull();
    });
  });

  describe('createForUser', () => {
    it('throws ConflictException when the user already has a vehicle', async () => {
      repo.findOneBy.mockResolvedValue(buildVehicle());

      await expect(service.createForUser(USER_ID, validDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('creates and saves the vehicle when none exists', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const created = buildVehicle();
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.createForUser(USER_ID, validDto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          vehicleType: validDto.vehicleType,
          model: validDto.model,
          purchaseDate: validDto.purchaseDate,
          soatExpiry: validDto.soatExpiry,
          tecnomecanicaExpiry: validDto.tecnomecanicaExpiry,
          kitExpiry: null,
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it('stores the optional kit expiry date when provided', async () => {
      repo.findOneBy.mockResolvedValue(null);
      repo.create.mockImplementation((v) => v as Vehicle);
      repo.save.mockImplementation((v) => Promise.resolve(v as Vehicle));

      await service.createForUser(USER_ID, {
        ...validDto,
        kitExpiry: '2024-06-01',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ kitExpiry: '2024-06-01' }),
      );
    });
  });

  describe('updateForUser', () => {
    it('throws NotFoundException when the vehicle is missing', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateForUser(USER_ID, { model: 'New model' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('applies the partial update and saves', async () => {
      const existing = buildVehicle({ model: 'Old model' });
      repo.findOneBy.mockResolvedValue(existing);
      repo.save.mockImplementation((v) => Promise.resolve(v as Vehicle));

      const result = await service.updateForUser(USER_ID, { model: 'New model' });

      expect(result.model).toBe('New model');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'New model' }),
      );
    });
  });

  describe('deleteForUser', () => {
    it('removes the vehicle when one exists', async () => {
      repo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(service.deleteForUser(USER_ID)).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledWith({ userId: USER_ID });
    });

    it('throws NotFoundException when there is nothing to delete', async () => {
      repo.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.deleteForUser(USER_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
