import { Controller, Get, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('user/:id')
  async getUserNotifications(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.getUserNotifications(id);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.markAsRead(id);
  }

  @Patch('user/:id/read-all')
  async markAllAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.markAllAsRead(id);
  }
}
