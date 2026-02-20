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

    // --- HÀM TẠO PHIẾU TỪ APP (ĐÃ FIX NGÀY) ---
    async createFromApp(data: any, user: any) {
        const plans = await this.maintenanceService.findByDevice(data.device_id);
        const activePlan = plans.find((p) => p.status === 'active' || p.status === 'warning' || p.status === 'overdue');

        // Allow template to be null (User Request: Temporarily disable template logic)
        let template = null;
        if (data.template_id) {
             template = await this.templateRepo.findOne({where: {id: data.template_id}});
        }

        // Lấy ngày thực hiện từ Form
        const actualDate = data.execution_date ? new Date(data.execution_date) : new Date();

        // --- AUTO-GENERATE CHECKLIST IF MISSING (QUICK CREATE) ---
        // Only generate if template is available
        if ((!data.checklist_result || data.checklist_result.length === 0) && template && template.checklist_structure) {
            const generatedChecklist: any[] = [];
            const structure: any[] = template.checklist_structure as any[];
            const targetLevel = (data.maintenance_level || '').trim().toLowerCase();

            structure.forEach(group => {
                if (group.items && Array.isArray(group.items)) {
                    group.items.forEach(item => {
                        // Tìm yêu cầu tương ứng với cấp độ (Normalized)
                        const reqs = item.requirements || {};
                        const levelKey = Object.keys(reqs).find(k => k.trim().toLowerCase() === targetLevel);
                        const reqContent = levelKey ? reqs[levelKey] : null;

                        // Chỉ thêm nếu có yêu cầu cho cấp này
                        if (reqContent && reqContent !== '-' && reqContent !== '') {
                            generatedChecklist.push({
                                code: item.code,
                                task: item.task,
                                req: reqContent, // Snapshot yêu cầu tại thời điểm tạo
                                category: group.category,
                                type: item.type,
                                requirements: item.requirements,
                                status: null, // Mặc định chưa làm
                                value: "",
                                note: ""
                            });
                        }
                    });
                }
            });
            data.checklist_result = generatedChecklist;
        }
        // ---------------------------------------------------------

        // --- VALIDATION: CHECK SEQUENTIAL (Không cho làm phiếu mới nếu phiếu cũ chưa xong) ---
        // Tìm phiếu BẤT KỲ của thiết bị này có ngày kế hoạch TRƯỚC ngày này mà chưa DONE
        const overdueTickets = await this.ticketRepo.createQueryBuilder('t')
            .where('t.device_id = :dId', { dId: data.device_id })
            .andWhere('t.status != :done', { done: 'done' })
            .andWhere('t.status != :cancel', { cancel: 'canceled' })
            .andWhere('t.scheduled_at < :date', { date: actualDate })
            .getCount();

        if (overdueTickets > 0) {
             throw new ForbiddenException(`Không thể tạo phiếu mới! Còn ${overdueTickets} phiếu cũ chưa hoàn thành.`);
        }
        // -----------------------------------------------------------------------------------

        const ticket = this.ticketRepo.create({
            device: {device_id: data.device_id} as any,
            user: user,
            maintenance: activePlan || null,
            template: template,
            maintenance_level: data.maintenance_level,
            checklist_result: data.checklist_result,
            arising_issues: data.arising_issues,
            working_hours: data.working_hours,
            execution_team: data.execution_team,
            acceptance_result: data.acceptance_result,
            final_conclusion: data.final_conclusion,

            // --- FIX: Lưu ngày thực tế ---
            execution_date: actualDate,
            completed_at: actualDate, // Lưu completed_at bằng ngày thực hiện luôn
            // ----------------------------

            leader_user: data.leader_user_id ? ({user_id: data.leader_user_id} as any) : null,
            operator_user: data.operator_user_id ? ({user_id: data.operator_user_id} as any) : null,
            status: 'done',
            created_at: new Date(), // Ngày tạo bản ghi (Audit log)
        });

        const saved = await this.ticketRepo.save(ticket);

        if (activePlan) {
            await this.maintenanceService.markCompletedAndSpawnNext(activePlan.maintenance_id, actualDate);
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
            await this.maintenanceService.markCompletedAndSpawnNext(t.maintenance.maintenance_id, new Date());
        }
        return {ticket: saved};
    }

    async remove(id: number) {
        const t = await this.findOne(id);
        await this.ticketRepo.delete(t.ticket_id);
        return {success: true};
    }

    // 1. Lấy tất cả lịch sử
    async findAll() {
        return await this.ticketRepo.find({
            relations: ['device', 'user', 'template', 'leader_user', 'operator_user'],
            order: {created_at: 'DESC'},
        });
    }

    // 2. Lấy lịch sử theo thiết bị
    async findHistoryByDevice(deviceId: number) {
        return await this.ticketRepo.find({
            where: {device: {device_id: deviceId}},
            relations: ['user', 'template', 'leader_user', 'operator_user'],
            order: {created_at: 'DESC'},
        });
    }

    async findAllHistory() {
        return await this.ticketRepo.find({
            relations: ['device', 'user', 'template'],
            order: {created_at: 'DESC'},
        });
    }

    // --- XUẤT PDF (ĐÃ CẬP NHẬT FOOTER CHUẨN) ---
    // --- XUẤT PDF (ĐÃ CẬP NHẬT FOOTER CHUẨN) ---
    async exportPdf(ticketId: number, exportType: 'full' | 'ticket' | 'content' = 'full') {
        const ticket = await this.ticketRepo.findOne({
            where: {ticket_id: ticketId},
            relations: ['device', 'leader_user', 'operator_user', 'template'],
        });

        if (!ticket) throw new NotFoundException('Phiếu không tồn tại');

        const htmlContent = buildPdfTemplate(ticket, exportType);

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, {waitUntil: 'networkidle0'});

        // --- ĐỊNH NGHĨA FOOTER HTML & CSS ---
        // Lưu ý: CSS của Footer hoạt động độc lập, cần khai báo size chữ cụ thể
        const footerHTML = `
            <style>
                .footer-wrapper {
                    font-family: 'Times New Roman', serif;
                    font-size: 10.5px; /* Cỡ chữ chuẩn cho footer */
                    width: 100%;
                    margin-left: 20px;
                    margin-right: 20px;
                    padding-top: 5px;
                    border-top: 1px solid #000; 
                    display: flex;
                    justify-content: space-between;
                    color: #000;
                }
                .bold { font-weight: bold; }
                .right-col { text-align: right; }
            </style>
            
            <div class="footer-wrapper">
                <div style="width: 30%;">
                    <span>${ticket.template?.code || '...'}</span>
                </div>
                <div style="width: 30%; text-align: center;">
                    Lần ban hành/ sửa đổi: <span>${ticket.template?.release_no || '01'}/${ticket.template?.revision_no || '00'}</span>
                </div>
                <div style="width: 40%;" class="right-col">
                    <div><span class="pageNumber"></span>/<span class="totalPages"></span></div>
                </div>
            </div>
        `;

        const buffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: true, // <--- BẮT BUỘC: Bật chế độ Footer

            headerTemplate: '<div></div>', // Header rỗng (để ẩn URL mặc định)
            footerTemplate: footerHTML, // <--- Chèn Footer vào đây

            margin: {
                top: '20px',
                // QUAN TRỌNG: Tăng lề dưới để chứa Footer (70px ~ 2cm)
                // Nếu để 20px như cũ, Footer sẽ bị đè hoặc ẩn mất
                bottom: '70px',
                left: '20px',
                right: '20px',
            },
        });

        await browser.close();

        // (Đoạn lưu file vào ổ cứng nếu bạn cần thì giữ lại, không thì return buffer luôn)
        return buffer;
    }

    async cancel(id: number, reason: string, user?: any) {
        const ticket = await this.ticketRepo.findOne({
            where: {ticket_id: id},
            relations: ['maintenance', 'device'] // Load để xử lý logic revert plan
        });
        if (!ticket) throw new NotFoundException('Phiếu không tồn tại');

        // --- KHÔI PHỤC KẾ HOẠCH BẢO DƯỠNG ---
        if (ticket.maintenance) {
            await this.maintenanceService.revertCompletion(ticket.maintenance.maintenance_id);
        }

        ticket.status = 'canceled';
        ticket.cancel_reason = reason;
        if (user) {
             ticket.cancelled_by = user;
        }
        return await this.ticketRepo.save(ticket);
    }
}

