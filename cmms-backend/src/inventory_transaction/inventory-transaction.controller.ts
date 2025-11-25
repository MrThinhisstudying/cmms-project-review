import { Controller, Post, Body, UseGuards, HttpException, HttpStatus, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { ApiTags } from '@nestjs/swagger';
import { InventoryTransactionService } from './inventory-transaction.service';

@ApiTags('inventory-transaction')
@Controller('inventory-transaction')
export class InventoryTransactionController {
  constructor(private readonly svc: InventoryTransactionService) {}

  @Post()
  @UseGuards(JWTAuthGuard)
  async create(@Body() dto: CreateTransactionDto, @CurrentUser() user?: any) {
    try {
      const data = await this.svc.createTransaction(dto, user);
      return { message: 'Transaction created', data };
    } catch (error) {
      throw new HttpException('Create transaction failed', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('item/:id')
  async listForItem(@Param('id', ParseIntPipe) id: number) {
    try {
      const data = await this.svc.listForItem(id);
      return { message: 'Transaction list', data };
    } catch (error) {
      throw new HttpException('List transactions failed', HttpStatus.NOT_FOUND);
    }
  }
}
