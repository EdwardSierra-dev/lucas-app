import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

/** User shape returned to clients — never includes the password hash. */
export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /** Remove the password hash before a user leaves the service boundary. */
  private stripPassword(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  /**
   * Find a user by their email address.
   * Selects the password_hash column explicitly because it is excluded by default (select: false).
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  /**
   * Find a user by their UUID.
   */
  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  /**
   * Persist a new user record.
   */
  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  /**
   * Return the current user's profile without the password hash.
   * Throws 404 if the id does not resolve to a user.
   */
  async getProfile(id: string): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.stripPassword(user);
  }

  /**
   * Update the current user's own profile (currently just the display name)
   * and return the refreshed, password-free profile.
   *
   * Only fields present on the DTO are applied, so an absent `displayName`
   * leaves the existing name untouched. A supplied `displayName` is trimmed.
   */
  async updateProfile(id: string, dto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName.trim();
    }

    const saved = await this.usersRepository.save(user);
    return this.stripPassword(saved);
  }
}
