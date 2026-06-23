import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ActivityLogService } from '../services/activity-log.service';
import { ActivityEntityType } from '../entities/activity-log.entity';

@ApiTags('Activity Log')
@Controller('activity-log')
export class ActivityLogController {
    constructor(private readonly logService: ActivityLogService) {}

    @Get()
    async getRecent(@Query('limit') limit?: number) {
        const logs = await this.logService.findRecent(limit || 30);
        return { data: logs };
    }

    @Get('entity/:type/:id')
    async getByEntity(
        @Param('type') type: string,
        @Param('id') id: number,
        @Query('limit') limit?: number,
    ) {
        const entityType = type.toUpperCase() as ActivityEntityType;
        const logs = await this.logService.findByEntity(entityType, id, limit || 50);
        return { data: logs };
    }

    @Get('user/:userId')
    async getByUser(
        @Param('userId') userId: number,
        @Query('limit') limit?: number,
    ) {
        const logs = await this.logService.findByUser(userId, limit || 30);
        return { data: logs };
    }
}
