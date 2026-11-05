import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpException,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { basename, extname, join } from 'path';
import * as fs from 'fs';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../user/user.decorator';
import { User } from '../user/user.entity';
import { compressImage } from '../common/utils/image-compression.util';
import { CreateTaskDto, TasksService, UpdateTaskDto } from './tasks.service';
import { ITaskAttachment, ITaskChecklistItem } from './entities/work-task.entity';
import { TaskProjectStatus } from './entities/task-project.entity';

@ApiTags('Work Tasks')
@Controller('tasks')
@UseGuards(JWTAuthGuard)
export class TasksController {
    constructor(private readonly tasksService: TasksService) {}

    // ─────────────── PROJECTS ───────────────
    @Get('projects')
    async getProjects(
        @Query('status') status?: string,
        @Query('dept_id') dept_id?: string,
    ) {
        const data = await this.tasksService.findAllProjects({
            status,
            dept_id: dept_id ? Number(dept_id) : undefined,
        });
        return { message: 'Lấy danh sách dự án thành công', data };
    }

    @Post('projects')
    @HttpCode(HttpStatus.CREATED)
    async createProject(
        @AuthUser() currentUser: User,
        @Body()
        body: {
            name: string;
            description?: string;
            status?: TaskProjectStatus;
            dept_id?: number | null;
            manager_id?: number | null;
            start_date?: string | null;
            end_date?: string | null;
        },
    ) {
        const data = await this.tasksService.createProject(currentUser, body);
        return { message: 'Tạo dự án / chiến dịch thành công', data };
    }

    @Put('projects/:id')
    async updateProject(
        @Param('id') id: string,
        @Body()
        body: Partial<{
            name: string;
            description: string;
            dept_id: number | null;
            manager_id: number | null;
            status: TaskProjectStatus;
            start_date: string | null;
            end_date: string | null;
        }>,
    ) {
        const data = await this.tasksService.updateProject(Number(id), body);
        return { message: 'Cập nhật dự án thành công', data };
    }

    @Delete('projects/:id')
    async deleteProject(@Param('id') id: string) {
        await this.tasksService.deleteProject(Number(id));
        return { message: 'Đã xóa dự án' };
    }

    // ─────────────── PHASE 2: EXECUTIVE DASHBOARD & REMINDERS ───────────────
    @Get('executive-dashboard')
    async getExecutiveDashboard(
        @AuthUser() currentUser: User,
        @Query('dept_id') dept_id?: string,
        @Query('project_id') project_id?: string,
        @Query('month') month?: string,
    ) {
        const data = await this.tasksService.getExecutiveDashboard(currentUser, {
            dept_id: dept_id ? Number(dept_id) : undefined,
            project_id: project_id ? Number(project_id) : undefined,
            month,
        });
        return { message: 'Lấy dữ liệu Dashboard Lãnh đạo thành công', data };
    }

    @Post('reminders/run')
    async runRemindersNow() {
        const data = await this.tasksService.runDeadlineReminders(true);
        return {
            message: `Đã quét ${data.scannedCount} công việc và gửi ${data.notificationsSent} thông báo nhắc việc`,
            data,
        };
    }

    // ─────────────── PHASE 3: KPI EVALUATION REPORT & 360 USER SUMMARY ───────────────
    @Get('kpi-report')
    async getKpiEvaluationReport(
        @AuthUser() currentUser: User,
        @Query('period_type') period_type?: 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL',
        @Query('period_value') period_value?: string,
        @Query('dept_id') dept_id?: string,
    ) {
        const data = await this.tasksService.getKpiEvaluationReport(currentUser, {
            period_type,
            period_value,
            dept_id: dept_id ? Number(dept_id) : undefined,
        });
        return { message: 'Lấy báo cáo đánh giá KPI & thi đua thành công', data };
    }

    @Get('user-summary/:userId')
    async getUserTaskSummary(@Param('userId') userId: string) {
        const data = await this.tasksService.getUserTaskSummary(Number(userId));
        return { message: 'Lấy tổng hợp KPI công việc nhân sự thành công', data };
    }

    // ─────────────── FILE UPLOAD FOR TASKS ───────────────
    @Post('upload')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req, file, cb) => {
                    const uploadPath = join(process.cwd(), 'uploads', 'tasks');
                    if (!fs.existsSync(uploadPath)) {
                        fs.mkdirSync(uploadPath, { recursive: true });
                    }
                    cb(null, uploadPath);
                },
                filename: (req, file, cb) => {
                    const randomName = Array(24)
                        .fill(null)
                        .map(() => Math.round(Math.random() * 16).toString(16))
                        .join('');
                    cb(null, `${randomName}${extname(file.originalname)}`);
                },
            }),
            limits: { fileSize: 15 * 1024 * 1024 },
        }),
    )
    async uploadTaskAttachment(
        @AuthUser() currentUser: User,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new HttpException('Vui lòng chọn tệp đính kèm', HttpStatus.BAD_REQUEST);
        }

        const filePath = join(process.cwd(), 'uploads', 'tasks', file.filename);
        let finalFilename = file.filename;

        if (file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
            const compressed = await compressImage(filePath, {
                keepPng: false,
                maxWidth: 1600,
                maxHeight: 1600,
                quality: 80,
                skipBelowBytes: 100 * 1024,
            });
            finalFilename = basename(compressed.outputPath);
        }

        let originalName = file.originalname;
        try {
            originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        } catch {
            originalName = file.originalname;
        }

        return {
            message: 'Tải tệp đính kèm thành công',
            data: {
                name: originalName,
                url: `/uploads/tasks/${finalFilename}`,
                size: file.size,
                uploaded_by: currentUser.name || currentUser.email,
                uploaded_at: new Date().toISOString(),
            },
        };
    }

    // ─────────────── TASKS CRUD & WORKFLOW ───────────────
    @Get('assignment-context')
    async getAssignmentContext(@AuthUser() currentUser: User) {
        const data = await this.tasksService.getAssignmentContext(currentUser);
        return { message: 'Lấy thông tin phân quyền giao việc thành công', data };
    }

    @Get()
    async findAll(
        @AuthUser() currentUser: User,
        @Query('viewMode') viewMode?: string,
        @Query('view_mode') view_mode?: string,
        @Query('status') status?: string,
        @Query('priority') priority?: string,
        @Query('task_type') task_type?: string,
        @Query('dept_id') dept_id?: string,
        @Query('device_group_id') device_group_id?: string,
        @Query('project_id') project_id?: string,
        @Query('assignee_id') assignee_id?: string,
        @Query('assigner_id') assigner_id?: string,
        @Query('search') search?: string,
    ) {
        const data = await this.tasksService.findAllTasks(currentUser, {
            viewMode,
            view_mode,
            status,
            priority,
            task_type,
            dept_id: dept_id ? Number(dept_id) : undefined,
            device_group_id: device_group_id ? Number(device_group_id) : undefined,
            project_id: project_id ? Number(project_id) : undefined,
            assignee_id: assignee_id ? Number(assignee_id) : undefined,
            assigner_id: assigner_id ? Number(assigner_id) : undefined,
            search,
        });
        return { message: 'Lấy danh sách công việc thành công', data };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const data = await this.tasksService.findOneTask(Number(id));
        return { message: 'Lấy chi tiết công việc thành công', data };
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@AuthUser() currentUser: User, @Body() dto: CreateTaskDto) {
        const data = await this.tasksService.createTask(currentUser, dto);
        return { message: 'Giao việc thành công', data };
    }

    @Put(':id')
    async update(
        @AuthUser() currentUser: User,
        @Param('id') id: string,
        @Body() dto: UpdateTaskDto,
    ) {
        const data = await this.tasksService.updateTask(currentUser, Number(id), dto);
        return { message: 'Cập nhật công việc thành công', data };
    }

    @Post(':id/respond')
    @Patch(':id/respond')
    async respondToTask(
        @AuthUser() currentUser: User,
        @Param('id') id: string,
        @Body()
        body: {
            action: 'ACCEPT' | 'REQUEST_CHANGE';
            note?: string;
            reason?: string;
            proposed_deadline?: string;
        },
    ) {
        const data = await this.tasksService.respondToTask(currentUser, Number(id), body);
        return {
            message:
                body.action === 'ACCEPT'
                    ? 'Đã xác nhận tiếp nhận công việc'
                    : 'Đã gửi đề nghị điều chỉnh cho người giao',
            data,
        };
    }

    @Post(':id/resolve-change')
    @Patch(':id/resolve-change')
    async resolveChangeRequest(
        @AuthUser() currentUser: User,
        @Param('id') id: string,
        @Body()
        body: {
            decision?: 'APPROVE_CHANGE' | 'KEEP_ORIGINAL';
            approved?: boolean;
            new_deadline?: string;
            note?: string;
        },
    ) {
        const data = await this.tasksService.resolveChangeRequest(
            currentUser,
            Number(id),
            body,
        );
        return { message: 'Đã phản hồi đề nghị điều chỉnh', data };
    }

    @Post(':id/progress')
    @Patch(':id/progress')
    async updateProgress(
        @AuthUser() currentUser: User,
        @Param('id') id: string,
        @Body()
        body: {
            progress?: number;
            checklist?: ITaskChecklistItem[];
            attachments?: ITaskAttachment[];
            note?: string;
        },
    ) {
        const data = await this.tasksService.updateProgress(
            currentUser,
            Number(id),
            body,
        );
        return { message: 'Đã cập nhật tiến độ công việc', data };
    }

    @Post(':id/submit')
    @Patch(':id/submit')
    async submitForReview(
        @AuthUser() currentUser: User,
        @Param('id') id: string,
        @Body()
        body: {
            completion_note?: string;
            attachments?: ITaskAttachment[];
            evidence_files?: ITaskAttachment[];
        },
    ) {
        const data = await this.tasksService.submitForReview(
            currentUser,
            Number(id),
            body,
        );
        return { message: 'Đã gửi báo cáo hoàn thành chờ nghiệm thu', data };
    }

    @Post(':id/review')
    @Patch(':id/review')
    async reviewTask(
        @AuthUser() currentUser: User,
        @Param('id') id: string,
        @Body()
        body: {
            decision?: 'APPROVE' | 'REJECT';
            action?: 'APPROVE' | 'REJECT';
            review_note?: string;
            kpi_score?: number;
        },
    ) {
        const data = await this.tasksService.reviewTask(
            currentUser,
            Number(id),
            body,
        );
        const isApprove = (body.action || body.decision) === 'APPROVE';
        return {
            message: isApprove
                ? 'Đã phê duyệt nghiệm thu hoàn thành công việc'
                : 'Đã trả lại công việc yêu cầu thực hiện lại',
            data,
        };
    }

    @Post(':id/nudge')
    async nudgeTask(
        @AuthUser() currentUser: User,
        @Param('id') id: string,
        @Body() body: { note?: string },
    ) {
        const res = await this.tasksService.nudgeTask(
            currentUser,
            Number(id),
            body?.note,
        );
        return { message: res.message, data: res.task };
    }

    @Post(':id/comments')
    async addComment(
        @AuthUser() currentUser: User,
        @Param('id') id: string,
        @Body()
        body: { content: string; attachments?: Array<{ name: string; url: string }> },
    ) {
        const data = await this.tasksService.addComment(
            currentUser,
            Number(id),
            body,
        );
        return { message: 'Đã gửi trao đổi', data };
    }

    @Delete(':id')
    async delete(@AuthUser() currentUser: User, @Param('id') id: string) {
        return this.tasksService.deleteTask(currentUser, Number(id));
    }
}
