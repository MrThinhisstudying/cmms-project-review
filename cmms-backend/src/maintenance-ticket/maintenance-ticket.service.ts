import {ForbiddenException, Inject, Injectable, NotFoundException, forwardRef} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository, FindOptionsWhere} from 'typeorm';
import dayjs from 'dayjs';
import {MaintenanceTicket} from './entities/maintenance-ticket.entity';
import {MaintenanceService} from 'src/maintenance/maintenance.service';
import {MaintenanceStatus, normalizeMaintenanceLevel, isMatchLevel} from '../maintenance/enum/maintenance.enum';
import {TicketStatus} from './enum/ticket.enum';
import {MaintenanceChecklistTemplate} from 'src/maintenance/entities/maintenance-checklist-template.entity';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import {buildPdfTemplate} from './utils/pdf-template.util';
import {CertificatesService} from '../certificates/certificates.service';
import {CertificateType} from '../certificates/entities/user-certificate.entity';

@Injectable()
export class MaintenanceTicketService {
    constructor(
        @InjectRepository(MaintenanceTicket) private ticketRepo: Repository<MaintenanceTicket>,
        @InjectRepository(MaintenanceChecklistTemplate)
        private templateRepo: Repository<MaintenanceChecklistTemplate>,
        @Inject(forwardRef(() => MaintenanceService)) private maintenanceService: MaintenanceService,
        private certificatesService: CertificatesService,
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
        // Đã bỏ validation chứng chỉ CCCM theo yêu cầu
        // if (user && user.role === 'TECHNICIAN') {
        //     const isValid = await this.certificatesService.validateUserHasValidCertificate(user.user_id, CertificateType.CCCM);
        //     if (!isValid) throw new ForbiddenException(`Nhân viên ${user.name || 'thực hiện'} không có chứng chỉ CCCM hợp lệ hoặc đã hết hạn.`);
        // }

        const plans = await this.maintenanceService.findByDevice(data.device_id);
        let activePlan: any = null;
        if (data.maintenance_id) {
            activePlan = plans.find((p) => p.maintenance_id === Number(data.maintenance_id));
        }
        if (!activePlan && data.maintenance_level) {
            const targetLvl = normalizeMaintenanceLevel(data.maintenance_level);
            activePlan = plans.find((p) => isMatchLevel(p.level, targetLvl) && (p.status === MaintenanceStatus.ACTIVE || p.status === MaintenanceStatus.WARNING || p.status === MaintenanceStatus.OVERDUE));
            if (!activePlan) {
                const uncompleted = plans
                    .filter((p) => isMatchLevel(p.level, targetLvl) && p.status !== MaintenanceStatus.CANCELED && !(p.status === MaintenanceStatus.INACTIVE && p.tickets && p.tickets.length > 0))
                    .sort((a, b) => new Date(a.next_maintenance_date || a.scheduled_date).getTime() - new Date(b.next_maintenance_date || b.scheduled_date).getTime());
                activePlan = uncompleted[0];
            }
        }
        if (!activePlan) {
            activePlan = plans.find((p) => p.status === MaintenanceStatus.ACTIVE || p.status === MaintenanceStatus.WARNING || p.status === MaintenanceStatus.OVERDUE);
        }

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

        // --- PHƯƠNG ÁN A: CẢNH BÁO MỀM & GHI NHẬN AUDIT (Không chặn cứng hệ thống) ---
        // Kiểm tra xem thiết bị có kỳ bảo dưỡng nào trước đó chưa hoàn thành không
        const overdueTickets = await this.ticketRepo.createQueryBuilder('t')
            .where('t.device_id = :dId', { dId: data.device_id })
            .andWhere('t.status != :done', { done: 'done' })
            .andWhere('t.status != :cancel', { cancel: 'canceled' })
            .andWhere('t.scheduled_at < :date', { date: actualDate })
            .getCount();

        let arisingIssues = data.arising_issues || '';
        if (overdueTickets > 0) {
            const warningNote = `[Ghi nhận hệ thống: Thực hiện khi còn ${overdueTickets} kỳ bảo dưỡng trước đó chưa hoàn thành]`;
            arisingIssues = arisingIssues ? `${arisingIssues}\n${warningNote}` : warningNote;
        }
        // -----------------------------------------------------------------------------------

        const ticket = this.ticketRepo.create({
            device: {device_id: data.device_id} as any,
            user: user,
            maintenance: activePlan || null,
            template: template,
            maintenance_level: data.maintenance_level,
            checklist_result: data.checklist_result,
            arising_issues: arisingIssues,
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

    // --- HÀM GHI NHẬN BẢO DƯỠNG HÀNG LOẠT (IMPORT EXCEL) ---
    async batchComplete(items: any[], user: any) {
        const results = [];
        let successCount = 0;
        let failedCount = 0;

        // Đảm bảo sắp xếp các lượt bảo dưỡng theo thứ tự ngày tăng dần (Chronological order)
        // Để khi 1 xe có nhiều kỳ bảo dưỡng dồn (VD: 3 tuần liên tiếp), hệ thống sẽ kích hoạt và hoàn thành tuần tự
        const sortedItems = [...items].sort((a, b) => {
            const dateA = a.execution_date ? new Date(a.execution_date).getTime() : 0;
            const dateB = b.execution_date ? new Date(b.execution_date).getTime() : 0;
            return dateA - dateB;
        });

        for (const item of sortedItems) {
            try {
                if (!item.device_id) {
                    throw new Error('Thiếu ID thiết bị');
                }

                const actualDate = item.execution_date ? new Date(item.execution_date) : new Date();
                const targetLevel = normalizeMaintenanceLevel(item.maintenance_level);

                const plans = await this.maintenanceService.findByDevice(item.device_id);
                
                // 1. Lọc các kế hoạch khớp chính xác cấp bảo dưỡng targetLevel
                const matchingPlans = plans.filter((p) => isMatchLevel(p.level, targetLevel));

                // 2. Ưu tiên 1: Kế hoạch đang Active / Warning / Overdue của đúng cấp độ này (Chính là kỳ đang cần làm hiện tại)
                let chosenPlan = matchingPlans.find(
                    (p) => (p.status === MaintenanceStatus.ACTIVE || p.status === MaintenanceStatus.WARNING || p.status === MaintenanceStatus.OVERDUE)
                );

                // Ưu tiên 2: Nếu chưa có kế hoạch nào của cấp độ này Active,
                // lấy kế hoạch chưa làm có ngày dự kiến gần actualDate nhất
                if (!chosenPlan) {
                    const uncompleted = matchingPlans
                        .filter((p) => p.status !== MaintenanceStatus.CANCELED && !(p.status === MaintenanceStatus.INACTIVE && p.tickets && p.tickets.length > 0))
                        .sort((a, b) => {
                            const timeA = new Date(a.next_maintenance_date || a.scheduled_date).getTime();
                            const timeB = new Date(b.next_maintenance_date || b.scheduled_date).getTime();
                            return Math.abs(timeA - actualDate.getTime()) - Math.abs(timeB - actualDate.getTime());
                        });
                    chosenPlan = uncompleted[0];
                }

                // Ưu tiên 3 (Dự phòng hy hữu): Nếu xe không hề có kế hoạch nào của targetLevel,
                // fallback lấy kế hoạch bất kỳ chưa làm
                if (!chosenPlan && matchingPlans.length === 0) {
                    const anyActive = plans.find(
                        (p) => (p.status === MaintenanceStatus.ACTIVE || p.status === MaintenanceStatus.WARNING || p.status === MaintenanceStatus.OVERDUE)
                    );
                    chosenPlan = anyActive || plans.find((p) => p.status !== MaintenanceStatus.CANCELED && !(p.status === MaintenanceStatus.INACTIVE && p.tickets && p.tickets.length > 0));
                }

                const finalLevel = targetLevel || chosenPlan?.level || 'Tuần';

                const ticket = this.ticketRepo.create({
                    device: {device_id: item.device_id} as any,
                    user: user,
                    maintenance: chosenPlan || null,
                    template: null,
                    maintenance_level: finalLevel,
                    checklist_result: [],
                    arising_issues: item.arising_issues || null,
                    working_hours: item.working_hours || 0,
                    execution_team: [],
                    acceptance_result: [],
                    final_conclusion: true,
                    execution_date: actualDate,
                    completed_at: actualDate,
                    status: 'done',
                    created_at: new Date(),
                });

                const saved = await this.ticketRepo.save(ticket);

                if (chosenPlan) {
                    await this.maintenanceService.markCompletedAndSpawnNext(chosenPlan.maintenance_id, actualDate);
                }

                successCount++;
                results.push({
                    device_id: item.device_id,
                    status: 'success',
                    ticket_id: saved.ticket_id,
                    level: finalLevel,
                    execution_date: actualDate,
                    message: `Hoàn thành bảo dưỡng cấp ${finalLevel} thành công`,
                });
            } catch (err: any) {
                failedCount++;
                results.push({
                    device_id: item.device_id,
                    status: 'failed',
                    message: err.message || 'Lỗi khi ghi nhận bảo dưỡng',
                });
            }
        }

        return {
            total: items.length,
            successCount,
            failedCount,
            results,
        };
    }

    async listForAssignee(userId?: number, deptId?: number) {
        const where: FindOptionsWhere<MaintenanceTicket> = {} as FindOptionsWhere<MaintenanceTicket>;
        if (userId) Object.assign(where, {user: {user_id: userId}} as any);
        if (deptId) Object.assign(where, {department: {dept_id: deptId}} as any);
        return await this.ticketRepo.find({where, relations: ['device', 'user', 'template'], order: {updated_at: 'DESC'}});
    }

    async listForUser(user: any) {
        if (user?.role === 'admin' || user?.role === 'manager') {
            return await this.ticketRepo.find({relations: ['device', 'user', 'template'], order: {updated_at: 'DESC'}});
        }
        const where: FindOptionsWhere<MaintenanceTicket> = {} as FindOptionsWhere<MaintenanceTicket>;
        Object.assign(where, {user: {user_id: user.user_id}} as any);
        const deptId = user?.department?.dept_id;
        if (deptId) {
            return await this.ticketRepo.find({
                where: [{user: {user_id: user.user_id}} as any, {department: {dept_id: deptId}} as any],
                relations: ['device', 'user', 'template'],
                order: {updated_at: 'DESC'},
            });
        }
        return await this.ticketRepo.find({where, relations: ['device', 'user', 'template'], order: {updated_at: 'DESC'}});
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
        // Chỉ chặn nếu còn quá sớm (> 5 ngày trước hạn). Nếu đã quá hạn thì cho phép làm bình thường
        if (now.isBefore(earliest)) {
            throw new ForbiddenException('Chưa đến thời gian bắt đầu bảo dưỡng (chỉ được bắt đầu trước tối đa 5 ngày)');
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

