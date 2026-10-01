import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

/**
 * Owns persistence for the single vehicle a user may register.
 *
 * The `vehicles.user_id` column is UNIQUE, so each user has at most one
 * vehicle. All operations are scoped to the authenticated user's id.
 */
@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
  ) {}

  /**
   * Return the user's vehicle, or `null` if they have not registered one.
   */
  async findForUser(userId: string): Promise<Vehicle | null> {
    return this.vehiclesRepository.findOneBy({ userId });
  }

  /**
   * Register the user's vehicle.
   *
   * Throws {@link ConflictException} if the user already has a vehicle, since
   * `user_id` is UNIQUE (one vehicle per user).
   */
  async createForUser(
    userId: string,
    dto: CreateVehicleDto,
  ): Promise<Vehicle> {
    const existing = await this.vehiclesRepository.findOneBy({ userId });
    if (existing) {
      throw new ConflictException('User already has a registered vehicle');
    }

    const vehicle = this.vehiclesRepository.create({
      userId,
      vehicleType: dto.vehicleType,
      model: dto.model,
      purchaseDate: dto.purchaseDate,
      soatExpiry: dto.soatExpiry,
      tecnomecanicaExpiry: dto.tecnomecanicaExpiry,
      kitExpiry: dto.kitExpiry ?? null,
    });

    return this.vehiclesRepository.save(vehicle);
  }

  /**
   * Apply a partial update to the user's vehicle.
   *
   * Throws {@link NotFoundException} if the user has no vehicle to update.
   */
  async updateForUser(
    userId: string,
    dto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOneBy({ userId });
    if (!vehicle) {
      throw new NotFoundException('No vehicle registered for this user');
    }

    Object.assign(vehicle, dto);
    return this.vehiclesRepository.save(vehicle);
  }

  /**
   * Remove the user's vehicle.
   *
   * Throws {@link NotFoundException} if the user has no vehicle to delete.
   */
  async deleteForUser(userId: string): Promise<void> {
    const result = await this.vehiclesRepository.delete({ userId });
    if (!result.affected) {
      throw new NotFoundException('No vehicle registered for this user');
    }
  }
}
