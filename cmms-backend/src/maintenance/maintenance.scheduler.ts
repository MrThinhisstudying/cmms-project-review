import {Injectable} from '@nestjs/common';
import {Cron} from '@nestjs/schedule';
import {InjectRepository} from '@nestjs/typeorm';
import {In, Repository} from 'typeorm';
import dayjs from 'dayjs';
import {NotificationService} from 'src/notification/notification.service';
import {MaintenanceTicket} from 'src/maintenance-ticket/entities/maintenance-ticket.entity';
import { TicketStatus } from 'src/maintenance-ticket/enum/ticket.enum';

@Injectable()
export class MaintenanceScheduler {
    private static readonly PRE_NOTIFY_DAYS = 5;
    private static readonly OVERDUE_DAYS = 5;
    constructor(
        @InjectRepository(MaintenanceTicket) private readonly ticketRepo: Repository<MaintenanceTicket>,
        private readonly notificationService: NotificationService,
    ) {}
    @Cron('* * * * *')
    async checkDueMaintenances() {
        const now = dayjs();
        const tickets = await this.ticketRepo.find({
            where: { status: In(['open', 'in_progress'] as TicketStatus[]) },
            relations: ['device', 'user', 'department', 'maintenance'],
        });
        for (const t of tickets) {
            if (!t.scheduled_at) continue;
            const slot = dayjs(t.scheduled_at);
            const preWindowStart = slot.subtract(MaintenanceScheduler.PRE_NOTIFY_DAYS, 'day');
            const inPreWindow = now.isAfter(preWindowStart) && now.isBefore(slot);
            const overdueBy = now.diff(slot, 'day');
            let shouldNotify = false;
            let type = '';
            if (inPreWindow) {
                if (!t.last_notified_slot || !dayjs(t.last_notified_slot).isSame(slot)) {
                    shouldNotify = true;
                    type = 'pre';
                }
            } else if (overdueBy >= MaintenanceScheduler.OVERDUE_DAYS) {
                if (!t.last_notified_slot || !dayjs(t.last_notified_slot).isSame(slot)) {
                    shouldNotify = true;
                    type = 'overdue';
                }
            }
            if (!shouldNotify) continue;
            const messageBase = `Phiếu bảo dưỡng cho thiết bị ${t.device?.name ?? ''} (kỳ ${t.maintenance?.level ?? ''})`;
            const message =
                type === 'pre' ? `${messageBase} sắp đến hạn vào ${slot.format('YYYY-MM-DD')}` : `${messageBase} quá hạn ${overdueBy} ngày`;
            if (t.user) await this.notificationService.createForUser(t.user, message);
            else if (t.department) await this.notificationService.createForDepartment(t.department, message);
            t.last_notified_slot = slot.toDate();
            await this.ticketRepo.save(t);
        }
    }
}
