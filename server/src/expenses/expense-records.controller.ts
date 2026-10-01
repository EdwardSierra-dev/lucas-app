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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ExpenseRecordsService } from './expense-records.service';
import { CreateExpenseRecordDto } from './dto/create-expense-record.dto';
import { UpdateExpenseRecordDto } from './dto/update-expense-record.dto';

interface AuthenticatedRequest {
  user: JwtPayload;
}

/**
 * REST endpoints for a user's dated expense records (expense_records).
 *
 * Mounted at `/expenses/records` per the API design. All routes require a
 * valid access token; the acting user is derived from the JWT subject so
 * callers can only ever read/mutate their own records.
 */
@Controller('expenses/records')
@UseGuards(JwtAuthGuard)
export class ExpenseRecordsController {
  constructor(
    private readonly expenseRecordsService: ExpenseRecordsService,
  ) {}

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.expenseRecordsService.findAll(req.user.sub, {
      from,
      to,
      categoryId,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateExpenseRecordDto,
  ) {
    return this.expenseRecordsService.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseRecordDto,
  ) {
    return this.expenseRecordsService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.expenseRecordsService.remove(req.user.sub, id);
  }
}
