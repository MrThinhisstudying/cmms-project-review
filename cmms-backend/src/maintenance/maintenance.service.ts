import {Injectable, NotFoundException, Inject, forwardRef, ForbiddenException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Device} from 'src/devices/entities/device.entity';
import {User} from 'src/user/user.entity';
import {Department} from 'src/departments/department.entity';
import {MaintenanceLevel, MaintenanceStatus} from './enum/maintenance.enum';
import {Maintenance} from './entities/maintenance.entity';
import {CreateMaintenanceDto} from './dto/create-maintenance.dto';
import {UpdateMaintenanceDto} from './dto/update-maintenance.dto';
import {MaintenanceTicketService} from 'src/maintenance-ticket/maintenance-ticket.service';

@Injectable()
export class MaintenanceService {
    constructor(
        @InjectRepository(Maintenance) private maintenanceRepo: Repository<Maintenance>,
        @InjectRepository(Device) private deviceRepo: Repository<Device>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Department) private deptRepo: Repository<Department>,
        @Inject(forwardRef(() => MaintenanceTicketService)) private ticketService: MaintenanceTicketService,
    ) {}

    private toDateOrNull(input?: string | Date | null): Date | null {
        if (input === null || input === undefined) return null;
        const d = input instanceof Date ? input : new Date(input);
        return isNaN(d.getTime()) ? null : d;
    }

    private levelToMonths(level: MaintenanceLevel | string): number {
        const v = typeof level === 'string' ? level : (level as unknown as string);
        if (v === MaintenanceLevel.THREE_MONTH || v === '3_month') return 3;
        if (v === MaintenanceLevel.SIX_MONTH || v === '6_month') return 6;
        if (v === MaintenanceLevel.NINE_MONTH || v === '9_month') return 9;
        if (v === MaintenanceLevel.TWELVE_MONTH || v === '12_month') return 12;
        return 0;
    }

    private addMonths(date: Date, months: number): Date {
        const d = new Date(date);
        d.setMonth(d.getMonth() + months);
        return d;
    }

    async create(dto: CreateMaintenanceDto) {
        const device = await this.deviceRepo.findOne({where: {device_id: dto.device_id}});
        if (!device) throw new NotFoundException('Device not found');
        let user: User = null;
        if (dto.user_id !== undefined && dto.user_id !== null) {
            user = await this.userRepo.findOne({where: {user_id: dto.user_id}});
            if (!user) throw new NotFoundException('User not found');
        }
        let department: Department = null;
        if (dto.dept_id !== undefined && dto.dept_id !== null) {
            department = await this.deptRepo.findOne({where: {dept_id: dto.dept_id}});
            if (!department) throw new NotFoundException('Department not found');
        }
        const maintenance = this.maintenanceRepo.create({
            ...dto,
            scheduled_date: this.toDateOrNull(dto.scheduled_date),
            expired_date: this.toDateOrNull(dto.expired_date),
            device,
            user,
            department,
        });
        const saved: Maintenance = await this.maintenanceRepo.save(maintenance);
        if (saved.status === MaintenanceStatus.ACTIVE) {
            await this.ticketService.createForMaintenance(saved.maintenance_id);
        }
        return saved;
    }

    async findAll() {
        return await this.maintenanceRepo.find({order: {updated_at: 'DESC'}, relations: ['device', 'user', 'department']});
    }

    async findOne(id: number) {
        const m = await this.maintenanceRepo.findOne({where: {maintenance_id: id}, relations: ['device', 'user', 'department']});
        if (!m) throw new NotFoundException('Maintenance not found');
        return m;
    }

    async findByDevice(deviceId: number) {
        return await this.maintenanceRepo
            .createQueryBuilder('m')
            .leftJoinAndSelect('m.device', 'device')
            .leftJoinAndSelect('m.user', 'user')
            .leftJoinAndSelect('m.department', 'department')
            .where('device.device_id = :deviceId', {deviceId})
            .orderBy('m.scheduled_date', 'DESC')
            .getMany();
    }

    async update(id: number, dto: UpdateMaintenanceDto) {
        const maintenance = await this.maintenanceRepo.findOne({where: {maintenance_id: id}, relations: ['device', 'user', 'department']});
        if (!maintenance) throw new NotFoundException('Maintenance not found');
        if (maintenance.status !== MaintenanceStatus.ACTIVE) {
            throw new ForbiddenException('Cannot modify a non-active maintenance schedule');
        }
        if ('device_id' in dto) {
            if (dto.device_id == null) throw new NotFoundException('Device not found');
            const dev = await this.deviceRepo.findOne({where: {device_id: dto.device_id}});
            if (!dev) throw new NotFoundException('Device not found');
            maintenance.device = dev;
        }
        if ('user_id' in dto) {
            if (dto.user_id == null) maintenance.user = null;
            else {
                const usr = await this.userRepo.findOne({where: {user_id: dto.user_id}});
                if (!usr) throw new NotFoundException('User not found');
                maintenance.user = usr;
            }
        }
        if ('dept_id' in dto) {
            if (dto.dept_id == null) maintenance.department = null;
            else {
                const dep = await this.deptRepo.findOne({where: {dept_id: dto.dept_id}});
                if (!dep) throw new NotFoundException('Department not found');
                maintenance.department = dep;
            }
        }
        if ('scheduled_date' in dto) maintenance.scheduled_date = this.toDateOrNull(dto.scheduled_date ?? null);
        if ('expired_date' in dto) maintenance.expired_date = this.toDateOrNull(dto.expired_date ?? null);
        if ('status' in dto) maintenance.status = dto.status;
        if ('level' in dto) maintenance.level = dto.level;
        if ('description' in dto) maintenance.description = dto.description;
        const saved: Maintenance = await this.maintenanceRepo.save(maintenance);
        return saved;
    }

    async remove(id: number) {
        const maintenance = await this.maintenanceRepo.findOne({where: {maintenance_id: id}});
        if (!maintenance) throw new NotFoundException('Maintenance not found');
        if (maintenance.status !== MaintenanceStatus.ACTIVE) {
            throw new ForbiddenException('Cannot remove a non-active maintenance schedule');
        }
        const result = await this.maintenanceRepo.delete(id);
        if (result.affected === 0) throw new NotFoundException('Maintenance not found');
        return {success: true};
    }

    async createNextFrom(maintenanceId: number) {
        const current = await this.findOne(maintenanceId);
        const months = this.levelToMonths(current.level);
        if (!months || !current.scheduled_date) return null;
        let nextDate = this.addMonths(current.scheduled_date, months);
        while (nextDate.getTime() <= Date.now()) nextDate = this.addMonths(nextDate, months);
        const next = this.maintenanceRepo.create({
            device: current.device,
            user: current.user ?? null,
            department: current.department ?? null,
            level: current.level,
            status: MaintenanceStatus.ACTIVE,
            scheduled_date: nextDate,
            expired_date: null,
            description: null,
        });
        const saved: Maintenance = await this.maintenanceRepo.save(next);
        if (saved.status === MaintenanceStatus.ACTIVE) {
            await this.ticketService.createForMaintenance(saved.maintenance_id);
        }
        return saved;
    }

    async markCompletedAndSpawnNext(maintenanceId: number) {
        const m = await this.findOne(maintenanceId);
        const originalStatus = m.status;
        if (originalStatus !== MaintenanceStatus.INACTIVE && originalStatus !== MaintenanceStatus.CANCELED) {
            m.status = MaintenanceStatus.INACTIVE;
            await this.maintenanceRepo.save(m);
        }
        if (originalStatus !== MaintenanceStatus.CANCELED) {
            return await this.createNextFrom(maintenanceId);
        }
        return null;
    }
}

