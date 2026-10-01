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
import { UserExpensesService } from './user-expenses.service';
import { CreateUserExpenseDto } from './dto/create-user-expense.dto';
import { UpdateUserExpenseDto } from './dto/update-user-expense.dto';

interface AuthenticatedRequest {
  user: JwtPayload;
}

/**
 * REST endpoints for a user's configured expense slots (user_expenses).
 * All routes require a valid access token; the acting user is derived from the
 * JWT subject so callers can only ever touch their own slots.
 */
@Controller('user-expenses')
@UseGuards(JwtAuthGuard)
export class UserExpensesController {
  constructor(private readonly userExpensesService: UserExpensesService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.userExpensesService.findAll(req.user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateUserExpenseDto,
  ) {
    return this.userExpensesService.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserExpenseDto,
  ) {
    return this.userExpensesService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.userExpensesService.remove(req.user.sub, id);
  }
}
