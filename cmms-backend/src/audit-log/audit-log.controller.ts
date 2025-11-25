import {Controller, Get, Param, Query, ParseIntPipe, Post, Body, UseGuards, ForbiddenException} from '@nestjs/common';
import {ApiOperation, ApiParam, ApiQuery, ApiTags} from '@nestjs/swagger';
import {HistoryQueryDto} from './dto/history.dto';
import {RollbackDto} from './dto/rollback.dto';
import {CurrentUser} from '../auth/current-user.decorator';
import {User} from '../user/user.entity';
import {AuditService} from './audit-log.service';
import {JWTAuthGuard} from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
    constructor(private readonly auditService: AuditService) {}

    @Get(':entity/:id')
    @ApiOperation({summary: 'List history for a specific record'})
    @ApiParam({name: 'entity', example: 'Device'})
    @ApiParam({name: 'id', example: '42'})
    @ApiQuery({name: 'page', required: false})
    @ApiQuery({name: 'limit', required: false})
    list(@Param('entity') entity: string, @Param('id') id: string, @Query() {page = 1, limit = 20}: HistoryQueryDto) {
        return this.auditService.listHistory(entity, id, page, limit);
    }

    @UseGuards(JWTAuthGuard)
    @Get('all')
    @ApiOperation({summary: 'Admin: get all audit logs (optional filters)'})
    getAll(
        @CurrentUser() user: User,
        @Query('actor_user_id') actorUserId?: string,
        @Query('entity') entity?: string,
        @Query('entity_id') entityId?: string,
        @Query('page') page: any = 1,
        @Query('limit') limit: any = 20,
    ) {
        if (user.role !== 'admin') throw new ForbiddenException('Chỉ admin mới xem full log');
        return this.auditService.getAllLogs({actorUserId, entity, entityId}, Number(page), Number(limit));
    }

    @Get('log/:logId')
    @ApiOperation({summary: 'Get a single audit log by id'})
    log(@Param('logId', ParseIntPipe) logId: number) {
        return this.auditService.getLog(logId);
    }

    @UseGuards(JWTAuthGuard)
    @Post('rollback/:logId')
    @ApiOperation({summary: 'Rollback record to BEFORE snapshot (admin only)'})
    async rollbackLog(@Param('logId', ParseIntPipe) logId: number, @Body() body: RollbackDto, @CurrentUser() user: User) {
        if (user.role !== 'admin') throw new ForbiddenException('Chỉ admin được phép rollback');
        return this.auditService.rollbackToLog(logId, body?.reason);
    }

    @UseGuards(JWTAuthGuard)
    @Post('rollback/transaction/:id')
    @ApiOperation({summary: 'Rollback an entire audit transaction (admin only)'})
    async rollbackTransaction(@Param('id', ParseIntPipe) id: number, @Body() body: RollbackDto, @CurrentUser() user: User) {
        if (user.role !== 'admin') throw new ForbiddenException('Chỉ admin được phép rollback');
        return this.auditService.rollbackTransaction(id, body?.reason);
    }
}

