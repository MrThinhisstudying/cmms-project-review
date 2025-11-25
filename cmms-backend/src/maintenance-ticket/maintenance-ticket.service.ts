import {ForbiddenException, Inject, Injectable, NotFoundException, forwardRef} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository, FindOptionsWhere} from 'typeorm';
import dayjs from 'dayjs';
import {MaintenanceTicket} from './entities/maintenance-ticket.entity';
import {MaintenanceService} from 'src/maintenance/maintenance.service';
import {MaintenanceStatus} from 'src/maintenance/enum/maintenance.enum';
import {TicketStatus} from './enum/ticket.enum';

@Injectable()
export class MaintenanceTicketService {
    constructor(
        @InjectRepository(MaintenanceTicket) private ticketRepo: Repository<MaintenanceTicket>,
        @Inject(forwardRef(() => MaintenanceService)) private maintenanceService: MaintenanceService,
    ) {}

    async createForMaintenance(maintenanceId: number) {
        const m = await this.maintenanceService.findOne(maintenanceId);
        const t = this.ticketRepo.create({
            maintenance: m,
            device: m.device,
            user: m.user ?? null,
            department: m.department ?? null,
            status: 'open',
            scheduled_at: m.scheduled_date ?? null,
            started_at: null,
            completed_at: null,
            description: null,
        });
        return await this.ticketRepo.save(t);
    }

    async listForAssignee(userId?: number, deptId?: number) {
        const where: FindOptionsWhere<MaintenanceTicket> = {} as FindOptionsWhere<MaintenanceTicket>;
        if (userId) Object.assign(where, {user: {user_id: userId}} as any);
        if (deptId) Object.assign(where, {department: {dept_id: deptId}} as any);
        return await this.ticketRepo.find({where, order: {updated_at: 'DESC'}});
    }

    async listForUser(user: any) {
        if (user?.role === 'admin' || user?.role === 'manager') {
            return await this.ticketRepo.find({order: {updated_at: 'DESC'}});
        }
        const where: FindOptionsWhere<MaintenanceTicket> = {} as FindOptionsWhere<MaintenanceTicket>;
        Object.assign(where, {user: {user_id: user.user_id}} as any);
        const deptId = user?.department?.dept_id;
        if (deptId) {
            return await this.ticketRepo.find({
                where: [{user: {user_id: user.user_id}} as any, {department: {dept_id: deptId}} as any],
                order: {updated_at: 'DESC'},
            });
        }
        return await this.ticketRepo.find({where, order: {updated_at: 'DESC'}});
    }

    async findOne(id: number) {
        const t = await this.ticketRepo.findOne({where: {ticket_id: id}});
        if (!t) throw new NotFoundException('Ticket not found');
        return t;
    }

    private ensureTransition(from: TicketStatus, to: TicketStatus) {
        if (from === 'open' && (to === 'in_progress' || to === 'canceled')) return;
        if (from === 'in_progress' && (to === 'done' || to === 'canceled')) return;
        throw new ForbiddenException('Invalid transition');
    }

    private ensureStartWindow(ticket: MaintenanceTicket) {
        if (!ticket.scheduled_at) throw new ForbiddenException('No schedule');
        const now = dayjs();
        const scheduled = dayjs(ticket.scheduled_at);
        const earliest = scheduled.subtract(5, 'day');
        if (!(now.isAfter(earliest) && now.isBefore(scheduled.add(1, 'minute')))) {
            throw new ForbiddenException('Can only start within 5 days before due');
        }
    }

    private async assertCanModify(user: any, ticket: MaintenanceTicket) {
        if (!user) throw new ForbiddenException('Unauthorized');
        if (user.role === 'admin' || user.role === 'manager') return;
        if (ticket.user && ticket.user.user_id === user.user_id) return;
        if (ticket.department && user.department && ticket.department.dept_id === user.department.dept_id) return;
        throw new ForbiddenException('Not allowed');
    }

    async updateStatus(id: number, to: TicketStatus, user?: any) {
        const t = await this.findOne(id);
        await this.assertCanModify(user, t);
        this.ensureTransition(t.status, to);
        if (t.status === 'open' && to === 'in_progress') this.ensureStartWindow(t);
        if (to === 'in_progress' && !t.started_at) t.started_at = new Date();
        if (to !== 'done') t.completed_at = null;
        t.status = to;
        return await this.ticketRepo.save(t);
    }

    async complete(id: number, payload: {description: string}, user?: any) {
        const t = await this.findOne(id);
        await this.assertCanModify(user, t);
        this.ensureTransition(t.status, 'done');
        if (!payload || !payload.description || payload.description.trim().length === 0) {
            throw new ForbiddenException('Completion requires a description');
        }
        t.status = 'done';
        t.completed_at = new Date();
        t.description = payload.description;
        const saved = await this.ticketRepo.save(t);
        const maint = await this.maintenanceService.findOne(t.maintenance.maintenance_id);
        if (maint.status === MaintenanceStatus.ACTIVE) {
            await this.maintenanceService.markCompletedAndSpawnNext(t.maintenance.maintenance_id);
        }
        return {ticket: saved};
    }

    async remove(id: number) {
        const t = await this.findOne(id);
        await this.ticketRepo.delete(t.ticket_id);
        return {success: true};
    }
}
