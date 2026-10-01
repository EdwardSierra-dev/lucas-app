import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from './entities/loan.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import {
  loanOutstandingAmount,
  loanRemainingInstallments,
  loanTotalRepayment,
} from './loan.calculations';

/**
 * A loan enriched with the derived values the summary view needs (Req 7.5, 7.9).
 */
export interface LoanWithComputed extends Loan {
  totalRepayment: number;
  remainingInstallments: number;
  outstandingAmount: number;
}

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,
  ) {}

  /**
   * List the user's active loans (installments_paid < total_installments),
   * each enriched with totalRepayment, remainingInstallments and
   * outstandingAmount (Req 7.9).
   */
  async listForUser(userId: string): Promise<LoanWithComputed[]> {
    const loans = await this.loansRepository
      .createQueryBuilder('loan')
      .where('loan.user_id = :userId', { userId })
      .andWhere('loan.installments_paid < loan.total_installments')
      .orderBy('loan.start_date', 'DESC')
      .getMany();

    return loans.map((loan) => this.withComputed(loan));
  }

  /**
   * Create a loan for the user after enforcing source-specific required fields
   * (Property P18). Bank loans require a positive cuota; person loans require
   * capital, interest-per-installment and total installments (Req 7.3/7.6/7.7/7.8).
   */
  async create(
    userId: string,
    dto: CreateLoanDto,
  ): Promise<LoanWithComputed> {
    const invalidFields = this.validateSourceFields(dto);
    if (invalidFields.length > 0) {
      throw new BadRequestException({
        message: 'Invalid loan fields for the selected source',
        invalidFields,
      });
    }

    const installmentsPaid = dto.installmentsPaid ?? 0;
    if (
      dto.totalInstallments !== undefined &&
      installmentsPaid > dto.totalInstallments
    ) {
      throw new BadRequestException({
        message: 'installmentsPaid cannot exceed totalInstallments',
        invalidFields: ['installmentsPaid'],
      });
    }

    const loan = this.loansRepository.create({
      userId,
      source: dto.source,
      installmentAmount: dto.source === 'bank' ? dto.installmentAmount! : null,
      capital: dto.source === 'person' ? dto.capital! : null,
      interestPerInstallment:
        dto.source === 'person' ? dto.interestPerInstallment! : null,
      totalInstallments: dto.totalInstallments ?? null,
      installmentsPaid,
      description: dto.description ?? null,
      startDate: dto.startDate,
    });

    const saved = await this.loansRepository.save(loan);
    return this.withComputed(saved);
  }

  /**
   * Update a loan owned by the user — primarily to register installment
   * payments. Enforces 0 ≤ installmentsPaid ≤ totalInstallments (Property P18/P19).
   */
  async update(
    userId: string,
    loanId: string,
    dto: UpdateLoanDto,
  ): Promise<LoanWithComputed> {
    const loan = await this.findOwned(userId, loanId);

    if (dto.installmentsPaid !== undefined) {
      this.assertWithinTotal(dto.installmentsPaid, loan.totalInstallments);
      loan.installmentsPaid = dto.installmentsPaid;
    }

    const saved = await this.loansRepository.save(loan);
    return this.withComputed(saved);
  }

  /**
   * Register a single installment payment by incrementing installments_paid.
   * Rejects when it would exceed total installments (Property P18/P19).
   */
  async registerInstallment(
    userId: string,
    loanId: string,
  ): Promise<LoanWithComputed> {
    const loan = await this.findOwned(userId, loanId);
    const next = loan.installmentsPaid + 1;
    this.assertWithinTotal(next, loan.totalInstallments);
    loan.installmentsPaid = next;

    const saved = await this.loansRepository.save(loan);
    return this.withComputed(saved);
  }

  /** Delete a loan owned by the user (NotFound when absent or not theirs). */
  async remove(userId: string, loanId: string): Promise<void> {
    const loan = await this.findOwned(userId, loanId);
    await this.loansRepository.remove(loan);
  }

  // --- internal helpers -----------------------------------------------------

  private async findOwned(userId: string, loanId: string): Promise<Loan> {
    const loan = await this.loansRepository.findOne({
      where: { id: loanId, userId },
    });
    if (!loan) {
      throw new NotFoundException('Loan not found');
    }
    return loan;
  }

  private assertWithinTotal(
    installmentsPaid: number,
    totalInstallments: number | null,
  ): void {
    if (installmentsPaid < 0) {
      throw new BadRequestException({
        message: 'installmentsPaid cannot be negative',
        invalidFields: ['installmentsPaid'],
      });
    }
    if (
      totalInstallments !== null &&
      installmentsPaid > totalInstallments
    ) {
      throw new BadRequestException({
        message: 'installmentsPaid cannot exceed totalInstallments',
        invalidFields: ['installmentsPaid'],
      });
    }
  }

  /**
   * Returns the list of field names that are missing/invalid for the loan's
   * source. Empty array means the submission is valid (Property P18).
   */
  private validateSourceFields(dto: CreateLoanDto): string[] {
    const invalid: string[] = [];
    if (dto.source === 'bank') {
      // Bank requires a positive cuota (Req 7.3). Field-shape (Min 0.01) is
      // handled by the DTO; here we only ensure it is present.
      if (dto.installmentAmount === undefined || dto.installmentAmount === null) {
        invalid.push('installmentAmount');
      }
    } else {
      // Person requires capital, interest-per-installment and total installments.
      if (dto.capital === undefined || dto.capital === null) {
        invalid.push('capital');
      }
      if (
        dto.interestPerInstallment === undefined ||
        dto.interestPerInstallment === null
      ) {
        invalid.push('interestPerInstallment');
      }
      if (dto.totalInstallments === undefined || dto.totalInstallments === null) {
        invalid.push('totalInstallments');
      }
    }
    return invalid;
  }

  private withComputed(loan: Loan): LoanWithComputed {
    return Object.assign({}, loan, {
      totalRepayment: loanTotalRepayment(loan),
      remainingInstallments: loanRemainingInstallments(loan),
      outstandingAmount: loanOutstandingAmount(loan),
    });
  }
}
