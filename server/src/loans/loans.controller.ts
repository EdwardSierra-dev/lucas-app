import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';

interface AuthenticatedRequest {
  user: JwtPayload;
}

@Controller('loans')
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  /**
   * List the authenticated user's active loans with computed totalRepayment,
   * remainingInstallments and outstandingAmount (Req 7.9).
   */
  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.loansService.listForUser(req.user.sub);
  }

  /** Create a loan record for the authenticated user (Req 7.2–7.8). */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateLoanDto) {
    return this.loansService.create(req.user.sub, dto);
  }

  /**
   * Register an installment payment (increments installments_paid).
   * Matches the design endpoint `PATCH /loans/:id/installment`.
   */
  @Patch(':id/installment')
  registerInstallment(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.loansService.registerInstallment(req.user.sub, id);
  }

  /** Update a loan (e.g. set installmentsPaid directly). */
  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLoanDto,
  ) {
    return this.loansService.update(req.user.sub, id, dto);
  }

  /** Delete a loan owned by the authenticated user. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.loansService.remove(req.user.sub, id);
  }
}
