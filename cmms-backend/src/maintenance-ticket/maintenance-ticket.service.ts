import {ForbiddenException, Inject, Injectable, NotFoundException, forwardRef} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository, FindOptionsWhere} from 'typeorm';
import dayjs from 'dayjs';
import {MaintenanceTicket} from './entities/maintenance-ticket.entity';
import {MaintenanceService} from 'src/maintenance/maintenance.service';
import {MaintenanceStatus} from '../maintenance/enum/maintenance.enum';
import {TicketStatus} from './enum/ticket.enum';
import {MaintenanceChecklistTemplate} from 'src/maintenance/entities/maintenance-checklist-template.entity';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import {buildPdfTemplate} from './utils/pdf-template.util';
@Injectable()
export class MaintenanceTicketService {
    constructor(
        @InjectRepository(MaintenanceTicket) private ticketRepo: Repository<MaintenanceTicket>,
        @InjectRepository(MaintenanceChecklistTemplate)
        private templateRepo: Repository<MaintenanceChecklistTemplate>,
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

    // --- THÊM HÀM XỬ LÝ TỪ APP ---
    async createFromApp(data: any, user: any) {
        // data: { device_id, template_id, maintenance_level, checklist_result, arising_issues }

        // 1. Tìm Maintenance Plan hiện tại của xe này (để link vào)
        // (Logic đơn giản: Lấy cái plan ACTIVE gần nhất của device đó)
        const plans = await this.maintenanceService.findByDevice(data.device_id);
        const activePlan = plans.find((p) => p.status === 'active');

        const template = await this.templateRepo.findOne({where: {id: data.template_id}});

        const ticket = this.ticketRepo.create({
            device: {device_id: data.device_id} as any,
            user: user,
            maintenance: activePlan || null,
            template: template,
            maintenance_level: data.maintenance_level,
            checklist_result: data.checklist_result,
            arising_issues: data.arising_issues,

            // --- MAP DỮ LIỆU MỚI VÀO ĐÂY ---
            working_hours: data.working_hours,
            execution_team: data.execution_team,
            acceptance_result: data.acceptance_result,
            final_conclusion: data.final_conclusion,
            // Nếu có ngày thực hiện thì lấy, không thì lấy ngày hiện tại
            execution_date: data.execution_date ? new Date(data.execution_date) : new Date(),
            // -------------------------------
            // --- THÊM MỚI ---
            leader_user_id: data.leader_user_id,
            operator_user_id: data.operator_user_id,
            // ----------------
            status: 'done',
            completed_at: new Date(),
            created_at: new Date(),
        });

        const saved = await this.ticketRepo.save(ticket);

        // 2. Nếu có Plan, cập nhật ngày tiếp theo luôn
        if (activePlan) {
            // Gọi hàm bạn đã viết sẵn bên MaintenanceService để sinh lịch tiếp theo
            await this.maintenanceService.markCompletedAndSpawnNext(activePlan.maintenance_id);
        }

        return saved;
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

    async findAll() {
        return this.ticketRepo.find({
            relations: ['device', 'user', 'template'], // Join để lấy tên xe, tên thợ, tên quy trình
            order: {created_at: 'DESC'},
        });
    }

    // Lấy toàn bộ lịch sử phiếu (kèm thông tin xe, thợ, quy trình)
    async findAllHistory() {
        return await this.ticketRepo.find({
            relations: ['device', 'user', 'template'], // Join bảng để lấy tên
            order: {created_at: 'DESC'}, // Mới nhất lên đầu
        });
    }

    async exportPdf(ticketId: number) {
        // 1. Lấy dữ liệu phiếu đầy đủ
        const ticket = await this.ticketRepo.findOne({
            where: {ticket_id: ticketId},
            relations: ['device', 'leader_user', 'operator_user'],
        });

        if (!ticket) throw new NotFoundException('Phiếu không tồn tại');

        // 2. Tạo HTML từ template
        const htmlContent = buildPdfTemplate(ticket);

        // 3. Khởi động Puppeteer để in
        const browser = await puppeteer.launch({headless: true});
        const page = await browser.newPage();
        await page.setContent(htmlContent);

        // 4. Tạo file PDF
        const buffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {top: '20px', bottom: '20px', left: '20px', right: '20px'},
        });

        await browser.close();

        // 5. (Tùy chọn) Lưu file vào ổ cứng để làm "Kho lưu trữ Offline"
        const fileName = `ticket_${ticketId}_${Date.now()}.pdf`;
        const uploadDir = './uploads/tickets';

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, {recursive: true});
        }
        fs.writeFileSync(path.join(uploadDir, fileName), buffer);

        // Cập nhật đường dẫn vào DB
        ticket.pdf_file_path = `/uploads/tickets/${fileName}`;
        await this.ticketRepo.save(ticket);

        return buffer; // Trả về buffer để Controller gửi xuống Client
    }
}

