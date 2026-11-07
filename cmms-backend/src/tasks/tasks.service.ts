import {Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {In, Repository} from 'typeorm';
import {Cron} from '@nestjs/schedule';
import {MailerService} from '@nestjs-modules/mailer';
import {
    WorkTask,
    WorkTaskPriority,
    WorkTaskStatus,
    WorkTaskType,
    ITaskChecklistItem,
    ITaskAttachment,
    ITaskCollaborator,
} from './entities/work-task.entity';
import {TaskProject, TaskProjectStatus} from './entities/task-project.entity';
import {TaskComment, TaskCommentActionType} from './entities/task-comment.entity';
import {User} from '../user/user.entity';
import {UserRole} from '../user/user-role.enum';
import {Department} from '../departments/department.entity';
import {UserDepartment} from '../departments/entities/user-department.entity';
import {DeviceGroup} from '../device-groups/entities/device-group.entity';
import {UserDeviceGroup} from '../device-groups/entities/user-device-group.entity';
import {NotificationService} from '../notification/notification.service';
import {RepairsGateway} from '../repairs/repairs.gateway';

export type TaskHierarchyTier = 'DIRECTOR' | 'UNIT_LEAD' | 'TEAM_LEAD' | 'STAFF';

export interface ITaskAssignmentContext {
    userId: number;
    hierarchyTier: TaskHierarchyTier;
    hierarchyLabel: string;
    canCreateTask: boolean;
    assignableUserIds: number[];
    myDeptIds: number[];
    managedDeptIds: number[];
    myDeviceGroups: Array<{
        id: number;
        name: string;
        dept_id?: number | null;
        is_lead: boolean;
    }>;
    allDeviceGroups: Array<{
        id: number;
        name: string;
        dept_id?: number | null;
        dept_name?: string | null;
        leader_id?: number | null;
        member_ids: number[];
    }>;
}

export interface CreateTaskDto {
    title: string;
    description?: string;
    task_type?: WorkTaskType;
    priority?: WorkTaskPriority;
    project_id?: number | null;
    parent_id?: number | null;
    assignee_id?: number;
    assignee_ids?: number[];
    dept_id?: number | null;
    device_group_id?: number | null;
    collaborator_ids?: number[];
    collaborators?: ITaskCollaborator[];
    checklist?: ITaskChecklistItem[];
    tags?: string[];
    attachments?: ITaskAttachment[];
    start_date?: string;
    deadline: string;
    kpi_weight?: number;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
    status?: WorkTaskStatus;
    progress?: number;
}

export interface IReminderScanResult {
    scannedCount: number;
    overdueCount: number;
    dueT1Count: number;
    dueT3Count: number;
    stalledNewCount: number;
    notificationsSent: number;
    timestamp: string;
}

export interface IStalledTaskAlert {
    id: number;
    code: string;
    title: string;
    status: WorkTaskStatus;
    priority: WorkTaskPriority;
    progress: number;
    deadline: Date;
    created_at: Date;
    submitted_at?: Date | null;
    alertType: 'OVERDUE' | 'NEW_OVER_24H' | 'PENDING_REVIEW_OVER_24H' | 'CHANGE_REQUESTED';
    alertLabel: string;
    hoursDelayed: number;
    assignee?: {user_id: number; name: string; avatar?: string; position?: string};
    assigner?: {user_id: number; name: string};
    department?: {dept_id: number; name: string};
}

@Injectable()
export class TasksService {
    private readonly logger = new Logger(TasksService.name);

    constructor(
        @InjectRepository(WorkTask)
        private readonly taskRepo: Repository<WorkTask>,
        @InjectRepository(TaskProject)
        private readonly projectRepo: Repository<TaskProject>,
        @InjectRepository(TaskComment)
        private readonly commentRepo: Repository<TaskComment>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Department)
        private readonly deptRepo: Repository<Department>,
        @InjectRepository(UserDepartment)
        private readonly userDeptRepo: Repository<UserDepartment>,
        @InjectRepository(DeviceGroup)
        private readonly deviceGroupRepo: Repository<DeviceGroup>,
        @InjectRepository(UserDeviceGroup)
        private readonly userDeviceGroupRepo: Repository<UserDeviceGroup>,
        private readonly notificationService: NotificationService,
        private readonly gateway: RepairsGateway,
        private readonly mailerService: MailerService,
    ) {}

    // ═══════════════════ PROJECTS ═══════════════════
    async findAllProjects(query?: {status?: string; dept_id?: number}): Promise<TaskProject[]> {
        const projects = await this.projectRepo.find({
            relations: ['department', 'manager'],
            order: {created_at: 'DESC'},
        });
        return projects.filter((p) => {
            if (query?.status && p.status !== query.status) return false;
            if (query?.dept_id && p.dept_id !== Number(query.dept_id)) return false;
            return true;
        });
    }

    async createProject(
        currentUser: User,
        dto: {
            name: string;
            description?: string;
            status?: TaskProjectStatus;
            dept_id?: number | null;
            manager_id?: number | null;
            start_date?: string | null;
            end_date?: string | null;
        },
    ): Promise<TaskProject> {
        const year = new Date().getFullYear();
        const count = await this.projectRepo.count();
        const code = `DA-${year}-${String(count + 1).padStart(3, '0')}`;

        const project = this.projectRepo.create({
            code,
            name: dto.name,
            description: dto.description,
            dept_id: dto.dept_id || undefined,
            manager_id: dto.manager_id || currentUser.user_id,
            start_date: dto.start_date || undefined,
            end_date: dto.end_date || undefined,
            status: dto.status || 'ACTIVE',
        });

        const savedProject = await this.projectRepo.save(project);
        this.gateway.notifyTaskUpdate({action: 'PROJECT_CREATED', actorId: currentUser.user_id});
        return savedProject;
    }

    async updateProject(
        id: number,
        dto: Partial<{
            name: string;
            description: string;
            dept_id: number | null;
            manager_id: number | null;
            status: TaskProjectStatus;
            start_date: string | null;
            end_date: string | null;
        }>,
    ): Promise<TaskProject> {
        const project = await this.projectRepo.findOne({where: {id}});
        if (!project) throw new NotFoundException('Không tìm thấy dự án / chiến dịch');
        Object.assign(project, dto);
        const savedProject = await this.projectRepo.save(project);
        this.gateway.notifyTaskUpdate({action: 'PROJECT_UPDATED'});
        return savedProject;
    }

    async deleteProject(id: number): Promise<void> {
        await this.projectRepo.delete(id);
        this.gateway.notifyTaskUpdate({action: 'PROJECT_DELETED'});
    }

    // ═══════════════════ HELPERS ═══════════════════
    private async generateTaskCode(): Promise<string> {
        const year = new Date().getFullYear();
        const lastTask = await this.taskRepo
            .createQueryBuilder('t')
            .where('t.code LIKE :prefix', {prefix: `CV-${year}-%`})
            .orderBy('t.id', 'DESC')
            .getOne();

        let nextNum = 1;
        if (lastTask && lastTask.code) {
            const parts = lastTask.code.split('-');
            const parsed = parseInt(parts[2], 10);
            if (!isNaN(parsed)) nextNum = parsed + 1;
        }
        return `CV-${year}-${String(nextNum).padStart(4, '0')}`;
    }

    private async buildCollaborators(userIds?: number[], explicitCollaborators?: ITaskCollaborator[]): Promise<ITaskCollaborator[]> {
        if (explicitCollaborators && explicitCollaborators.length > 0) {
            return explicitCollaborators.map((c) => ({
                user_id: Number(c.user_id),
                name: c.name,
                role: c.role || 'COLLABORATOR',
                avatar: c.avatar,
                position: c.position,
            }));
        }
        if (!userIds || userIds.length === 0) return [];
        const uniqueIds = Array.from(new Set(userIds));
        const users = await this.userRepo.find({
            where: {user_id: In(uniqueIds)},
        });
        const activeUsers = users.filter((u) => !u.status || u.status.trim().toLowerCase() === 'active');
        return activeUsers.map((u) => ({
            user_id: u.user_id,
            name: u.name,
            role: 'COLLABORATOR',
            avatar: u.avatar,
            position: u.position || u.role,
        }));
    }

    private async logActivity(
        taskId: number,
        userId: number,
        actionType: TaskCommentActionType,
        content: string,
        attachments: Array<{name: string; url: string}> = [],
    ): Promise<TaskComment> {
        const log = this.commentRepo.create({
            task_id: taskId,
            user_id: userId,
            action_type: actionType,
            type: actionType === 'COMMENT' ? 'COMMENT' : 'SYSTEM_LOG',
            content,
            attachments,
        });
        const saved = await this.commentRepo.save(log);
        this.gateway.notifyTaskUpdate({taskId, action: actionType, actorId: userId});
        return saved;
    }

    private async notifyUsers(
        userIds: number[],
        message: string,
        excludeUserId?: number,
        emailSubject?: string,
        meta?: {
            taskId?: number;
            taskCode?: string;
            actionType?: string;
            title?: string;
        },
    ): Promise<number> {
        const targets = Array.from(new Set(userIds)).filter(
            (id) => id && (excludeUserId === undefined || id !== excludeUserId || userIds.length === 1),
        );
        if (targets.length === 0) return 0;

        const users = await this.userRepo.find({where: {user_id: In(targets)}});
        let sentCount = 0;
        for (const u of users) {
            await this.notificationService.createForUser(u, message);
            sentCount += 1;

            // Bắn realtime Socket.IO đến từng user nhận thông báo
            this.gateway.sendToUser(u.user_id, {
                message,
                taskId: meta?.taskId,
                taskCode: meta?.taskCode,
                actionType: meta?.actionType || 'TASK_NOTIFICATION',
                title: meta?.title || emailSubject || 'Thông báo công việc',
                timestamp: new Date().toISOString(),
            });

            if (emailSubject && u.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                try {
                    await this.mailerService.sendMail({
                        to: u.email,
                        subject: emailSubject,
                        text: message,
                    });
                } catch (err) {
                    this.logger.warn(`Không thể gửi email nhắc việc tới ${u.email}: ${String(err)}`);
                }
            }
        }
        this.gateway.notifyTaskUpdate({
            taskId: meta?.taskId,
            action: meta?.actionType,
        });
        this.gateway.notifyDashboardRefresh();
        return sentCount;
    }

    // ═══════════════════ HIERARCHY & DEVICE GROUP SCOPE ENGINE ═══════════════════
    /**
     * Xác định cấp bậc tổ chức và phạm vi giao việc / hiển thị công việc:
     * 1. DIRECTOR (Ban Giám đốc / Admin / Quản lý NS) -> Toàn quyền xem & giao việc xuống Đội, Tổ, Nhân viên.
     * 2. UNIT_LEAD (Đội trưởng / Đội phó / Trưởng-Phó Phòng) -> Xem & giao việc trong phạm vi Đội/Phòng + các Tổ con + Nhóm thiết bị thuộc Đội.
     * 3. TEAM_LEAD (Tổ trưởng / Tổ phó / Cán bộ / Nhóm trưởng thiết bị) -> Xem & giao việc trong phạm vi Tổ + Nhóm thiết bị phụ trách (xuống Tổ phó & Nhân viên).
     * 4. STAFF (Nhân viên / Kỹ thuật viên / Vận hành viên) -> Xem việc cá nhân + Thấy toàn bộ công việc của các thành viên trong CÙNG Nhóm trang thiết bị (DeviceGroup).
     */
    async getAssignmentContext(currentUser: User): Promise<ITaskAssignmentContext> {
        const [allDepts, allUserDepts, allDeviceGroups, allUserDeviceGroups, allUsers] = await Promise.all([
            this.deptRepo.find(),
            this.userDeptRepo.find({relations: ['department']}),
            this.deviceGroupRepo.find({relations: ['department']}),
            this.userDeviceGroupRepo.find(),
            this.userRepo.find({relations: ['department']}),
        ]);

        const deptMap = new Map<number, Department>();
        allDepts.forEach((d) => deptMap.set(d.dept_id, d));

        const getUserTier = (userId: number, role?: UserRole): TaskHierarchyTier => {
            if (role && [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.HR_MANAGER].includes(role)) {
                return 'DIRECTOR';
            }

            const isUnitManagerInDept = allDepts.some(
                (d) => (d.level === 'DOI' || d.level === 'PHONG_BAN') && (d.manager_id === userId || d.deputy_id === userId),
            );
            const isUnitLeadInUD = allUserDepts.some(
                (ud) =>
                    ud.user_id === userId &&
                    ['LEAD', 'DEPUTY_LEAD'].includes(ud.role_in_dept) &&
                    (ud.department?.level === 'DOI' || ud.department?.level === 'PHONG_BAN'),
            );
            if (role === UserRole.UNIT_HEAD || isUnitManagerInDept || isUnitLeadInUD) {
                return 'UNIT_LEAD';
            }

            const isToManagerInDept = allDepts.some((d) => d.level === 'TO' && (d.manager_id === userId || d.deputy_id === userId));
            const isToLeadInUD = allUserDepts.some(
                (ud) => ud.user_id === userId && ['LEAD', 'DEPUTY_LEAD'].includes(ud.role_in_dept) && ud.department?.level === 'TO',
            );
            const isDeviceGroupLeader =
                allDeviceGroups.some((dg) => dg.leader_id === userId) ||
                allUserDeviceGroups.some((udg) => udg.user_id === userId && udg.is_group_lead);
            if (role === UserRole.TEAM_LEAD || isToManagerInDept || isToLeadInUD || isDeviceGroupLeader) {
                return 'TEAM_LEAD';
            }

            return 'STAFF';
        };

        const myTier = getUserTier(currentUser.user_id, currentUser.role);
        const hierarchyLabels: Record<TaskHierarchyTier, string> = {
            DIRECTOR: 'Ban Giám đốc / Quản trị',
            UNIT_LEAD: 'Ban Chỉ huy Đội / Phòng (Đội trưởng - Đội phó)',
            TEAM_LEAD: 'Cán bộ Tổ / Nhóm trưởng Thiết bị (Tổ trưởng - Tổ phó)',
            STAFF: 'Nhân viên / Kỹ thuật viên',
        };

        // Tập hợp các đơn vị trực tiếp của currentUser
        const myDeptIdSet = new Set<number>();
        const meFull = allUsers.find((u) => u.user_id === currentUser.user_id);
        if (meFull?.department?.dept_id) {
            myDeptIdSet.add(meFull.department.dept_id);
        }
        allUserDepts.filter((ud) => ud.user_id === currentUser.user_id && ud.dept_id).forEach((ud) => myDeptIdSet.add(ud.dept_id));
        allDepts
            .filter((d) => d.manager_id === currentUser.user_id || d.deputy_id === currentUser.user_id)
            .forEach((d) => myDeptIdSet.add(d.dept_id));

        // Tập hợp các đơn vị được quản lý (Nếu là cấp Đội -> bao gồm cả các Tổ con trực thuộc Đội)
        const managedDeptIdSet = new Set<number>(myDeptIdSet);
        if (myTier === 'DIRECTOR') {
            allDepts.forEach((d) => managedDeptIdSet.add(d.dept_id));
        } else if (myTier === 'UNIT_LEAD') {
            allDepts.forEach((d) => {
                if (d.parent_id && myDeptIdSet.has(d.parent_id)) {
                    managedDeptIdSet.add(d.dept_id);
                }
            });
        }

        // Lọc danh sách nhân sự đang hoạt động (loại trừ tài khoản đã khóa/ngưng hoạt động)
        const isUserActive = (u: User) => !u.status || u.status.trim().toLowerCase() === 'active';
        const activeUsers = allUsers.filter(isUserActive);
        const activeUserIdSet = new Set<number>(activeUsers.map((u) => u.user_id));

        // Tập hợp Nhóm trang thiết bị (DeviceGroup) của từng group (chỉ tính thành viên đang hoạt động)
        const groupMembersMap = new Map<number, Set<number>>();
        allDeviceGroups.forEach((dg) => {
            const set = new Set<number>();
            if (dg.leader_id && activeUserIdSet.has(dg.leader_id)) set.add(dg.leader_id);
            groupMembersMap.set(dg.id, set);
        });
        allUserDeviceGroups.forEach((udg) => {
            if (!activeUserIdSet.has(udg.user_id)) return;
            let groupSet = groupMembersMap.get(udg.group_id);
            if (!groupSet) {
                groupSet = new Set<number>();
                groupMembersMap.set(udg.group_id, groupSet);
            }
            groupSet.add(udg.user_id);
        });

        // Các nhóm thiết bị mà currentUser trực tiếp tham gia hoặc thuộc Đội quản lý
        const myDeviceGroupIds = new Set<number>();
        allUserDeviceGroups.filter((udg) => udg.user_id === currentUser.user_id).forEach((udg) => myDeviceGroupIds.add(udg.group_id));
        allDeviceGroups.filter((dg) => dg.leader_id === currentUser.user_id).forEach((dg) => myDeviceGroupIds.add(dg.id));

        if (myTier === 'UNIT_LEAD') {
            allDeviceGroups.filter((dg) => dg.dept_id && managedDeptIdSet.has(dg.dept_id)).forEach((dg) => myDeviceGroupIds.add(dg.id));
        }

        // Xác định danh sách user thuộc từng đơn vị
        const getUserDeptIds = (uId: number): Set<number> => {
            const s = new Set<number>();
            const uObj = allUsers.find((u) => u.user_id === uId);
            if (uObj?.department?.dept_id) s.add(uObj.department.dept_id);
            allUserDepts.filter((ud) => ud.user_id === uId && ud.dept_id).forEach((ud) => s.add(ud.dept_id));
            return s;
        };

        // Xác định danh sách nhân sự được phép nhận việc từ currentUser (Ban Giám đốc -> Đội -> Tổ -> Nhân viên)
        // BẮT BUỘC CHỈ CHỨA TÀI KHOẢN ĐANG HOẠT ĐỘNG (ACTIVE)
        const assignableUserIdSet = new Set<number>();
        if (myTier === 'DIRECTOR') {
            activeUsers.forEach((u) => assignableUserIdSet.add(u.user_id));
        } else if (myTier === 'UNIT_LEAD') {
            // Đội (phó) trưởng: giao xuống Đội phó, Tổ (phó) trưởng và Nhân viên trong Đội + các Tổ trực thuộc + Nhóm thiết bị của Đội
            activeUsers.forEach((u) => {
                const targetTier = getUserTier(u.user_id, u.role);
                if (targetTier === 'DIRECTOR') return; // Không giao ngược lên Ban Giám đốc
                const uDepts = getUserDeptIds(u.user_id);
                const inManagedDept = Array.from(uDepts).some((dId) => managedDeptIdSet.has(dId));
                const inManagedDeviceGroup = Array.from(myDeviceGroupIds).some((gId) => groupMembersMap.get(gId)?.has(u.user_id));
                if (u.user_id === currentUser.user_id || inManagedDept || inManagedDeviceGroup) {
                    assignableUserIdSet.add(u.user_id);
                }
            });
        } else if (myTier === 'TEAM_LEAD') {
            // Tổ (phó) trưởng / Cán bộ / Nhóm trưởng thiết bị: giao xuống Tổ phó và Nhân viên trong Tổ mình hoặc trong Nhóm thiết bị của mình
            activeUsers.forEach((u) => {
                const targetTier = getUserTier(u.user_id, u.role);
                if (targetTier === 'DIRECTOR' || targetTier === 'UNIT_LEAD') return; // Không giao ngược lên Đội trưởng / Ban Giám đốc
                const uDepts = getUserDeptIds(u.user_id);
                const inMyTo = Array.from(uDepts).some((dId) => {
                    const dept = deptMap.get(dId);
                    return managedDeptIdSet.has(dId) && (!dept || dept.level === 'TO');
                });
                const inMyDeviceGroup = Array.from(myDeviceGroupIds).some((gId) => groupMembersMap.get(gId)?.has(u.user_id));
                if (u.user_id === currentUser.user_id || inMyTo || inMyDeviceGroup) {
                    assignableUserIdSet.add(u.user_id);
                }
            });
        } else if (myTier === 'STAFF') {
            // Nhân viên: canCreateTask = false (không tự tạo việc gốc), nhưng khi là người nhận việc chính thì được chia việc con cho đồng đội cùng Tổ / cùng Nhóm thiết bị
            activeUsers.forEach((u) => {
                const uDepts = getUserDeptIds(u.user_id);
                const inSameDept = Array.from(uDepts).some((dId) => myDeptIdSet.has(dId));
                const inSameDeviceGroup = Array.from(myDeviceGroupIds).some((gId) => groupMembersMap.get(gId)?.has(u.user_id));
                if (u.user_id === currentUser.user_id || inSameDept || inSameDeviceGroup) {
                    assignableUserIdSet.add(u.user_id);
                }
            });
        }

        const myDeviceGroups = allDeviceGroups
            .filter((dg) => myDeviceGroupIds.has(dg.id))
            .map((dg) => {
                const isLead =
                    dg.leader_id === currentUser.user_id ||
                    allUserDeviceGroups.some((udg) => udg.group_id === dg.id && udg.user_id === currentUser.user_id && udg.is_group_lead);
                return {
                    id: dg.id,
                    name: dg.name,
                    dept_id: dg.dept_id || null,
                    is_lead: isLead,
                };
            });

        const allDeviceGroupsFormatted = allDeviceGroups.map((dg) => ({
            id: dg.id,
            name: dg.name,
            dept_id: dg.dept_id || null,
            dept_name: dg.department?.name || null,
            leader_id: dg.leader_id || null,
            member_ids: Array.from(groupMembersMap.get(dg.id) || []),
        }));

        return {
            userId: currentUser.user_id,
            hierarchyTier: myTier,
            hierarchyLabel: hierarchyLabels[myTier],
            canCreateTask: myTier !== 'STAFF',
            assignableUserIds: Array.from(assignableUserIdSet),
            myDeptIds: Array.from(myDeptIdSet),
            managedDeptIds: Array.from(managedDeptIdSet),
            myDeviceGroups,
            allDeviceGroups: allDeviceGroupsFormatted,
        };
    }

    private async getAccessibleTasksForUser(currentUser: User): Promise<WorkTask[]> {
        const allTasks = await this.taskRepo.find({
            relations: ['assigner', 'assignee', 'department', 'device_group', 'project', 'parent', 'subtasks', 'subtasks.assignee'],
            order: {created_at: 'DESC'},
        });

        const ctx = await this.getAssignmentContext(currentUser);
        if (ctx.hierarchyTier === 'DIRECTOR') {
            return allTasks;
        }

        const managedDeptSet = new Set<number>(ctx.managedDeptIds);
        const assignableUserSet = new Set<number>(ctx.assignableUserIds);
        const myDeviceGroupIdSet = new Set<number>(ctx.myDeviceGroups.map((dg) => dg.id));

        // Tập hợp toàn bộ đồng đội nằm trong CÙNG Nhóm trang thiết bị (DeviceGroup) với currentUser
        const peerUserIdsInMyDeviceGroups = new Set<number>();
        ctx.allDeviceGroups.forEach((dg) => {
            if (myDeviceGroupIdSet.has(dg.id)) {
                dg.member_ids.forEach((uid) => peerUserIdsInMyDeviceGroups.add(uid));
            }
        });

        return allTasks.filter((t) => {
            // 1. Việc trực tiếp của bản thân (Người giao, Người nhận, hoặc Người phối hợp)
            if (t.assigner_id === currentUser.user_id || t.assignee_id === currentUser.user_id) {
                return true;
            }
            if (Array.isArray(t.collaborators) && t.collaborators.some((c) => c.user_id === currentUser.user_id)) {
                return true;
            }

            // 2. Chia sẻ theo Nhóm Trang thiết bị (DeviceGroup):
            // Các thành viên trong cùng Nhóm trang thiết bị nhìn thấy công việc của nhau
            if (t.device_group_id && myDeviceGroupIdSet.has(t.device_group_id)) {
                return true;
            }
            if (peerUserIdsInMyDeviceGroups.has(t.assignee_id)) {
                return true;
            }
            if (Array.isArray(t.collaborators) && t.collaborators.some((c) => peerUserIdsInMyDeviceGroups.has(c.user_id))) {
                return true;
            }

            // 3. Phân cấp quản lý Đội (UNIT_LEAD) -> Tổ (TEAM_LEAD) -> Nhân viên
            if (ctx.hierarchyTier === 'UNIT_LEAD') {
                if (t.dept_id && managedDeptSet.has(t.dept_id)) return true;
                if (assignableUserSet.has(t.assignee_id) || assignableUserSet.has(t.assigner_id)) {
                    return true;
                }
            } else if (ctx.hierarchyTier === 'TEAM_LEAD') {
                // Tổ trưởng / Tổ phó thấy việc của Tổ mình và các nhân viên cấp dưới trong Tổ
                if (assignableUserSet.has(t.assignee_id)) {
                    return true;
                }
                if (t.dept_id && managedDeptSet.has(t.dept_id) && assignableUserSet.has(t.assigner_id)) {
                    return true;
                }
            }

            return false;
        });
    }

    // ═══════════════════ TASKS QUERY ═══════════════════
    async findAllTasks(
        currentUser: User,
        query: {
            viewMode?: string;
            view_mode?: string;
            status?: string;
            priority?: string;
            task_type?: string;
            dept_id?: number;
            device_group_id?: number;
            project_id?: number;
            assignee_id?: number;
            assigner_id?: number;
            search?: string;
        },
    ): Promise<{
        items: WorkTask[];
        tasks: WorkTask[];
        stats: Record<string, number>;
        assignmentContext: ITaskAssignmentContext;
    }> {
        const [accessibleTasks, assignmentContext] = await Promise.all([
            this.getAccessibleTasksForUser(currentUser),
            this.getAssignmentContext(currentUser),
        ]);

        const now = new Date();
        const isOverdue = (t: WorkTask) => !['COMPLETED', 'CANCELLED'].includes(t.status) && new Date(t.deadline) < now;

        const newCount = accessibleTasks.filter((t) => t.status === 'NEW' || t.status === 'CHANGE_REQUESTED').length;
        const inProgress = accessibleTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'REJECTED').length;
        const pendingReview = accessibleTasks.filter((t) => t.status === 'PENDING_REVIEW').length;
        const completed = accessibleTasks.filter((t) => t.status === 'COMPLETED').length;
        const overdue = accessibleTasks.filter(isOverdue).length;
        const myAssigned = accessibleTasks.filter(
            (t) => t.assignee_id === currentUser.user_id && !['COMPLETED', 'CANCELLED'].includes(t.status),
        ).length;
        const myCreated = accessibleTasks.filter((t) => t.assigner_id === currentUser.user_id).length;
        const waitingMyReview = accessibleTasks.filter(
            (t) => t.assigner_id === currentUser.user_id && (t.status === 'PENDING_REVIEW' || t.status === 'CHANGE_REQUESTED'),
        ).length;

        const stats = {
            total: accessibleTasks.length,
            newCount,
            inProgress,
            inProgressCount: inProgress,
            pendingReview,
            pendingReviewCount: pendingReview,
            completed,
            completedCount: completed,
            overdue,
            overdueCount: overdue,
            myAssigned,
            myAssignedCount: myAssigned,
            myCreated,
            myCreatedCount: myCreated,
            waitingMyReview,
            pendingMyReviewCount: waitingMyReview,
        };

        let filtered = accessibleTasks;
        const effectiveViewMode = query.view_mode || query.viewMode;

        if (effectiveViewMode) {
            switch (effectiveViewMode) {
                case 'MY_ASSIGNED':
                    filtered = filtered.filter((t) => t.assignee_id === currentUser.user_id);
                    break;
                case 'MY_CREATED':
                    filtered = filtered.filter((t) => t.assigner_id === currentUser.user_id);
                    break;
                case 'COLLABORATING':
                case 'MY_COLLABORATING':
                    filtered = filtered.filter(
                        (t) => Array.isArray(t.collaborators) && t.collaborators.some((c) => c.user_id === currentUser.user_id),
                    );
                    break;
                case 'PENDING_MY_REVIEW':
                    filtered = filtered.filter(
                        (t) => t.assigner_id === currentUser.user_id && (t.status === 'PENDING_REVIEW' || t.status === 'CHANGE_REQUESTED'),
                    );
                    break;
                case 'OVERDUE':
                    filtered = filtered.filter(isOverdue);
                    break;
                default:
                    break;
            }
        }

        if (query.status) {
            filtered = filtered.filter((t) => t.status === query.status);
        }
        if (query.priority) {
            filtered = filtered.filter((t) => t.priority === query.priority);
        }
        if (query.task_type) {
            filtered = filtered.filter((t) => t.task_type === query.task_type);
        }
        if (query.dept_id) {
            filtered = filtered.filter((t) => t.dept_id === Number(query.dept_id));
        }
        if (query.device_group_id) {
            const targetGroupId = Number(query.device_group_id);
            const targetGroup = assignmentContext.allDeviceGroups.find((dg) => dg.id === targetGroupId);
            const groupMemberSet = new Set<number>(targetGroup?.member_ids || []);
            filtered = filtered.filter((t) => t.device_group_id === targetGroupId || groupMemberSet.has(t.assignee_id));
        }
        if (query.project_id) {
            filtered = filtered.filter((t) => t.project_id === Number(query.project_id));
        }
        if (query.assignee_id) {
            filtered = filtered.filter((t) => t.assignee_id === Number(query.assignee_id));
        }
        if (query.assigner_id) {
            filtered = filtered.filter((t) => t.assigner_id === Number(query.assigner_id));
        }
        if (query.search && query.search.trim()) {
            const q = query.search.trim().toLowerCase();
            filtered = filtered.filter(
                (t) =>
                    t.title.toLowerCase().includes(q) ||
                    t.code.toLowerCase().includes(q) ||
                    (t.description && t.description.toLowerCase().includes(q)) ||
                    (t.assignee?.name && t.assignee.name.toLowerCase().includes(q)) ||
                    (t.assigner?.name && t.assigner.name.toLowerCase().includes(q)) ||
                    (t.device_group?.name && t.device_group.name.toLowerCase().includes(q)),
            );
        }

        return {items: filtered, tasks: filtered, stats, assignmentContext};
    }

    async findOneTask(id: number): Promise<WorkTask> {
        const task = await this.taskRepo.findOne({
            where: {id},
            relations: [
                'assigner',
                'assignee',
                'department',
                'device_group',
                'project',
                'parent',
                'subtasks',
                'subtasks.assignee',
                'subtasks.assigner',
                'comments',
                'comments.user',
            ],
        });
        if (!task) throw new NotFoundException('Không tìm thấy công việc');
        if (task.change_request_note && !task.change_request_reason) {
            task.change_request_reason = task.change_request_note;
        }
        if (task.comments) {
            task.comments.forEach((c) => {
                if (!c.type) {
                    c.type = c.action_type === 'COMMENT' ? 'COMMENT' : 'SYSTEM_LOG';
                }
            });
            task.comments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        return task;
    }

    // ═══════════════════ STEP 1: CREATE / ASSIGN TASK ═══════════════════
    async createTask(currentUser: User, dto: CreateTaskDto): Promise<WorkTask> {
        const rawIds = Array.isArray(dto.assignee_ids) && dto.assignee_ids.length > 0 ? dto.assignee_ids : dto.assignee_id ? [dto.assignee_id] : [];
        const targetAssigneeIds = Array.from(new Set(rawIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0)));

        if (!dto.title || targetAssigneeIds.length === 0 || !dto.deadline) {
            throw new BadRequestException('Vui lòng nhập đầy đủ Tiêu đề, Người nhận việc và Hạn hoàn thành');
        }

        // Kiểm tra phân cấp quyền giao việc: Ban Giám đốc -> Đội (phó) trưởng -> Tổ (phó) trưởng -> Nhân viên
        const assignCtx = await this.getAssignmentContext(currentUser);

        let isParentAssignee = false;
        if (dto.parent_id) {
            const parentTask = await this.taskRepo.findOne({
                where: {id: Number(dto.parent_id)},
            });
            if (parentTask && parentTask.assignee_id === currentUser.user_id) {
                isParentAssignee = true;
            }
        }

        if (!assignCtx.canCreateTask && !isParentAssignee) {
            throw new ForbiddenException(
                'Chỉ Ban Giám đốc, Đội trưởng/Đội phó, Tổ trưởng/Tổ phó (Cán bộ) hoặc Người chịu trách nhiệm chính của công việc mới có quyền chia việc con',
            );
        }

        for (const targetId of targetAssigneeIds) {
            if (!assignCtx.assignableUserIds.includes(targetId)) {
                throw new ForbiddenException(
                    `Phân cấp giao việc: Nhân sự #${targetId} nằm ngoài phạm vi Đội / Tổ hoặc Nhóm trang thiết bị do bạn phụ trách`,
                );
            }
        }

        const collaborators = await this.buildCollaborators(dto.collaborator_ids, dto.collaborators);

        const createdTasks: WorkTask[] = [];

        for (const targetId of targetAssigneeIds) {
            const assignee = await this.userRepo.findOne({
                where: {user_id: targetId},
                relations: ['department', 'user_departments', 'user_device_groups'],
            });
            if (!assignee) continue;
            if (assignee.status && assignee.status.trim().toLowerCase() !== 'active') {
                throw new BadRequestException(`Tài khoản "${assignee.name || targetId}" đã ngưng hoạt động, không thể phân công công việc`);
            }

            const code = await this.generateTaskCode();

            let deptId = dto.dept_id || null;
            if (!deptId) {
                const primaryUd = assignee.user_departments?.find((ud) => ud.is_primary);
                deptId = primaryUd?.dept_id || assignee.department?.dept_id || null;
            }

            // Tự động gắn Nhóm trang thiết bị (device_group_id) nếu không chọn thủ công nhưng người nhận thuộc 1 nhóm thiết bị
            let deviceGroupId = dto.device_group_id || null;
            if (!deviceGroupId && assignee.user_device_groups?.length) {
                deviceGroupId = assignee.user_device_groups[0].group_id;
            }

            // Clone checklist with unique IDs for this specific assignee
            const clonedChecklist = (dto.checklist || []).map((item, idx) => ({
                id: `chk_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
                title: item.title,
                completed: false,
            }));

            const task = this.taskRepo.create({
                code,
                title: dto.title.trim(),
                description: dto.description || '',
                task_type: dto.task_type || 'DIRECTIVE',
                priority: dto.priority || 'NORMAL',
                status: 'NEW',
                progress: 0,
                project_id: dto.project_id || null,
                parent_id: dto.parent_id || null,
                assigner_id: currentUser.user_id,
                assignee_id: targetId,
                dept_id: deptId,
                device_group_id: deviceGroupId,
                collaborators,
                checklist: clonedChecklist,
                tags: dto.tags || [],
                attachments: dto.attachments || [],
                start_date: dto.start_date ? new Date(dto.start_date) : new Date(),
                deadline: new Date(dto.deadline),
                kpi_weight: dto.kpi_weight !== undefined ? Number(dto.kpi_weight) : 1.0,
            });

            const saved = await this.taskRepo.save(task);
            createdTasks.push(saved);

            const batchNote = targetAssigneeIds.length > 1 ? ` (Đợt giao hàng loạt cho ${targetAssigneeIds.length} nhân sự)` : '';

            await this.logActivity(
                saved.id,
                currentUser.user_id,
                'CREATED',
                `Đã tạo và giao công việc${batchNote} cho ${assignee.name} (Hạn: ${new Date(dto.deadline).toLocaleDateString('vi-VN')})`,
            );

            if (dto.parent_id) {
                await this.logActivity(
                    Number(dto.parent_id),
                    currentUser.user_id,
                    'SUBTASK_CREATED',
                    `Đã chia nhỏ đầu việc con [${saved.code}] "${saved.title}" cho ${assignee.name}`,
                );
            }

            const notifyIds = [targetId, ...collaborators.map((c) => c.user_id)];
            await this.notifyUsers(
                notifyIds,
                `📋 [Giao việc mới - ${saved.code}] ${currentUser.name || 'Lãnh đạo'} đã giao cho bạn công việc: "${saved.title}"`,
                targetId === currentUser.user_id ? undefined : currentUser.user_id,
                `[Giao việc mới] ${saved.code} - ${saved.title}`,
                {
                    taskId: saved.id,
                    taskCode: saved.code,
                    actionType: 'NEW_TASK',
                    title: 'Giao việc mới',
                },
            );

            // Bắn popup realtime xác nhận giao việc cho người giao việc (nếu giao cho người khác)
            if (targetId !== currentUser.user_id) {
                this.gateway.sendToUser(currentUser.user_id, {
                    taskId: saved.id,
                    taskCode: saved.code,
                    actionType: 'TASK_DISPATCHED',
                    title: 'Giao việc thành công',
                    message: `Đã giao thành công công việc [${saved.code}] "${saved.title}" cho ${assignee.name}`,
                    timestamp: new Date().toISOString(),
                });
            }
        }

        if (createdTasks.length === 0) {
            throw new BadRequestException('Không thể khởi tạo công việc cho danh sách nhân sự đã chọn');
        }

        const firstTask = await this.findOneTask(createdTasks[0].id);
        (firstTask as any).batchCount = createdTasks.length;
        return firstTask;
    }

    // ═══════════════════ STEP 2: ACCEPT OR REQUEST CHANGE ═══════════════════
    async respondToTask(
        currentUser: User,
        id: number,
        dto: {
            action: 'ACCEPT' | 'REQUEST_CHANGE';
            note?: string;
            reason?: string;
            proposed_deadline?: string;
        },
    ): Promise<WorkTask> {
        const task = await this.findOneTask(id);

        const isCollaborator = Array.isArray(task.collaborators) && task.collaborators.some((c) => c.user_id === currentUser.user_id);
        const isAssigneeOrAdmin =
            task.assignee_id === currentUser.user_id || isCollaborator || [UserRole.ADMIN, UserRole.DIRECTOR].includes(currentUser.role);
        if (!isAssigneeOrAdmin) {
            throw new ForbiddenException('Chỉ người nhận việc mới có quyền xác nhận tiếp nhận công việc này');
        }

        if (dto.action === 'ACCEPT') {
            task.status = 'IN_PROGRESS';
            task.accepted_at = new Date();
            task.proposed_deadline = null;
            task.change_request_reason = null;
            task.change_request_note = null;
            if (task.progress === 0) task.progress = 5;
            await this.taskRepo.save(task);

            await this.logActivity(
                task.id,
                currentUser.user_id,
                'ACCEPTED',
                dto.note ? `Đã tiếp nhận công việc. Ghi chú: ${dto.note}` : 'Đã xác nhận tiếp nhận và bắt đầu thực hiện công việc.',
            );

            await this.notifyUsers(
                [task.assigner_id],
                `✅ [Tiếp nhận - ${task.code}] ${currentUser.name || task.assignee?.name} đã tiếp nhận công việc "${task.title}"`,
                currentUser.user_id,
                `[Tiếp nhận công việc] ${task.code}`,
                {
                    taskId: task.id,
                    taskCode: task.code,
                    actionType: 'TASK_ACCEPTED',
                    title: 'Tiếp nhận công việc',
                },
            );
        } else {
            const reasonText = (dto.reason || dto.note || '').trim();
            if (!reasonText) {
                throw new BadRequestException('Vui lòng nhập lý do đề nghị điều chỉnh');
            }
            const requesterName = currentUser.name || task.assignee?.name || 'Người nhận việc';
            const oldDeadlineStr = new Date(task.deadline).toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
            const proposedDateStr = dto.proposed_deadline
                ? new Date(dto.proposed_deadline).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                  })
                : 'Chưa chọn hạn cụ thể';

            task.status = 'CHANGE_REQUESTED';
            task.change_request_note = reasonText;
            task.change_request_reason = reasonText;
            task.proposed_deadline = dto.proposed_deadline ? new Date(dto.proposed_deadline) : null;
            await this.taskRepo.save(task);

            await this.logActivity(
                task.id,
                currentUser.user_id,
                'CHANGE_REQUEST',
                `⏳ [${requesterName}] xin gia hạn / điều chỉnh thời hạn (Hạn hiện tại: ${oldDeadlineStr} → Đề xuất mới: ${proposedDateStr}). Lý do: ${reasonText}`,
            );

            await this.notifyUsers(
                [task.assigner_id],
                `⚠️ [Xin gia hạn - ${task.code}] ${requesterName} đề nghị điều chỉnh hạn công việc "${task.title}" (${oldDeadlineStr} → ${proposedDateStr})`,
                currentUser.user_id,
                `[Xin gia hạn] ${task.code}`,
                {
                    taskId: task.id,
                    taskCode: task.code,
                    actionType: 'REQUEST_CHANGE',
                    title: 'Đề nghị gia hạn / Điều chỉnh',
                },
            );
        }

        return this.findOneTask(task.id);
    }

    async resolveChangeRequest(
        currentUser: User,
        id: number,
        dto: {
            decision?: 'APPROVE_CHANGE' | 'KEEP_ORIGINAL';
            approved?: boolean;
            new_deadline?: string;
            note?: string;
        },
    ): Promise<WorkTask> {
        const task = await this.findOneTask(id);
        const isAssignerOrAdmin = task.assigner_id === currentUser.user_id || [UserRole.ADMIN, UserRole.DIRECTOR].includes(currentUser.role);
        if (!isAssignerOrAdmin) {
            throw new ForbiddenException('Chỉ người giao việc mới có quyền phản hồi đề nghị điều chỉnh');
        }

        const isApproved = dto.approved !== undefined ? dto.approved : dto.decision === 'APPROVE_CHANGE';

        const oldDeadlineStr = new Date(task.deadline).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
        const actorName = currentUser.name || task.assigner?.name || 'Người giao việc';

        if (isApproved) {
            if (dto.new_deadline) {
                task.deadline = new Date(dto.new_deadline);
            } else if (task.proposed_deadline) {
                task.deadline = task.proposed_deadline;
            }
            task.status = 'IN_PROGRESS';
            task.accepted_at = task.accepted_at || new Date();
            task.proposed_deadline = null;
            task.change_request_reason = null;
            task.change_request_note = null;
            if (task.progress === 0) task.progress = 5;
            await this.taskRepo.save(task);

            const newDeadlineStr = new Date(task.deadline).toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
            await this.logActivity(
                task.id,
                currentUser.user_id,
                'CHANGE_APPROVED',
                `✅ [${actorName}] ĐÃ CHẤP THUẬN GIA HẠN: Đổi hạn hoàn thành từ ${oldDeadlineStr} sang ${newDeadlineStr}.${
                    dto.note ? ` Chỉ đạo: ${dto.note}` : ''
                }`,
            );

            await this.notifyUsers(
                [task.assignee_id],
                `✅ [Đã duyệt gia hạn - ${task.code}] ${actorName} đã đồng ý gia hạn công việc "${task.title}" sang ${newDeadlineStr}`,
                currentUser.user_id,
            );
        } else {
            // Khi từ chối gia hạn: quay về trạng thái NEW (Mới giao - Chờ nhân viên xác nhận tiếp nhận),
            // KHÔNG tự động chuyển sang IN_PROGRESS thay nhân viên.
            const rejectSummary = `❌ Đã từ chối gia hạn (Giữ hạn gốc ${oldDeadlineStr})${dto.note ? ` — Chỉ đạo: ${dto.note}` : ''}`;
            task.status = 'NEW';
            task.proposed_deadline = null;
            task.change_request_reason = rejectSummary;
            task.change_request_note = rejectSummary;
            await this.taskRepo.save(task);

            await this.logActivity(
                task.id,
                currentUser.user_id,
                'CHANGE_REJECTED',
                `❌ [${actorName}] TỪ CHỐI GIA HẠN — Yêu cầu giữ nguyên thời hạn ban đầu (${oldDeadlineStr}).${
                    dto.note ? ` Chỉ đạo: ${dto.note}.` : ''
                } Nhân sự nhận việc cần bấm "Tiếp nhận công việc" để xác nhận bắt đầu thực hiện.`,
            );

            await this.notifyUsers(
                [task.assignee_id],
                `❌ [Từ chối gia hạn - ${task.code}] ${actorName} yêu cầu giữ nguyên hạn cũ (${oldDeadlineStr}) cho công việc "${task.title}". Vui lòng vào xác nhận tiếp nhận công việc!`,
                currentUser.user_id,
            );
        }

        return this.findOneTask(task.id);
    }

    // ═══════════════════ STEP 3: UPDATE PROGRESS & CHECKLIST ═══════════════════
    async updateProgress(
        currentUser: User,
        id: number,
        dto: {
            progress?: number;
            checklist?: ITaskChecklistItem[];
            attachments?: ITaskAttachment[];
            note?: string;
        },
    ): Promise<WorkTask> {
        const task = await this.findOneTask(id);

        if ((dto.checklist !== undefined || dto.progress !== undefined) && (task.status === 'NEW' || task.status === 'CHANGE_REQUESTED')) {
            throw new BadRequestException('Vui lòng bấm "Tiếp nhận công việc" trước khi cập nhật tiến độ hoặc tích chọn Checklist');
        }

        if (dto.checklist !== undefined) {
            task.checklist = dto.checklist;
            if (dto.progress === undefined && dto.checklist.length > 0) {
                const doneCount = dto.checklist.filter((c) => c.completed).length;
                task.progress = Math.round((doneCount / dto.checklist.length) * 100);
            }
        }
        if (dto.progress !== undefined) {
            task.progress = Math.min(100, Math.max(0, Number(dto.progress)));
        }
        if (dto.attachments !== undefined) {
            task.attachments = dto.attachments;
        }

        await this.taskRepo.save(task);

        if (dto.note) {
            await this.logActivity(task.id, currentUser.user_id, 'PROGRESS_UPDATE', `Cập nhật tiến độ (${task.progress}%): ${dto.note}`);
        } else {
            this.gateway.notifyTaskUpdate({
                taskId: task.id,
                action: 'PROGRESS_UPDATE',
                actorId: currentUser.user_id,
            });
        }

        return this.findOneTask(task.id);
    }

    // ═══════════════════ STEP 4: SUBMIT FOR REVIEW ═══════════════════
    async submitForReview(
        currentUser: User,
        id: number,
        dto: {
            completion_note?: string;
            attachments?: ITaskAttachment[];
            evidence_files?: ITaskAttachment[];
        },
    ): Promise<WorkTask> {
        const task = await this.findOneTask(id);

        const noteText = (dto.completion_note || 'Đã hoàn thành toàn bộ nội dung công việc.').trim();

        task.status = 'PENDING_REVIEW';
        task.progress = 100;
        task.completion_note = noteText;
        task.submitted_at = new Date();

        const incomingFiles = dto.evidence_files || dto.attachments || [];
        if (incomingFiles.length > 0) {
            const existing = Array.isArray(task.attachments) ? task.attachments : [];
            task.attachments = [...existing, ...incomingFiles];
        }

        await this.taskRepo.save(task);

        await this.logActivity(
            task.id,
            currentUser.user_id,
            'SUBMITTED',
            `Báo cáo hoàn thành (100%) và trình duyệt nghiệm thu: ${task.completion_note}`,
            incomingFiles.map((a) => ({name: a.name, url: a.url})),
        );

        if (task.assigner_id !== currentUser.user_id) {
            await this.notifyUsers(
                [task.assigner_id],
                `🚀 [Báo cáo hoàn thành - ${task.code}] ${currentUser.name || task.assignee?.name} đã báo cáo hoàn thành công việc "${
                    task.title
                }". Chờ nghiệm thu.`,
                currentUser.user_id,
                `[Báo cáo hoàn thành] ${task.code} - ${task.title}`,
                {
                    taskId: task.id,
                    taskCode: task.code,
                    actionType: 'SUBMIT_FOR_REVIEW',
                    title: 'Báo cáo hoàn thành',
                },
            );
        }

        // Bắn popup realtime xác nhận nộp báo cáo cho chính người báo cáo
        this.gateway.sendToUser(currentUser.user_id, {
            taskId: task.id,
            taskCode: task.code,
            actionType: 'SUBMIT_FOR_REVIEW',
            title: 'Nộp báo cáo thành công',
            message: `Bạn đã nộp báo cáo hoàn thành công việc [${task.code}] "${task.title}". Đang chờ duyệt nghiệm thu.`,
            timestamp: new Date().toISOString(),
        });

        return this.findOneTask(task.id);
    }

    // ═══════════════════ STEP 5: APPROVE OR REJECT ═══════════════════
    async reviewTask(
        currentUser: User,
        id: number,
        dto: {
            decision?: 'APPROVE' | 'REJECT';
            action?: 'APPROVE' | 'REJECT';
            review_note?: string;
            kpi_score?: number;
        },
    ): Promise<WorkTask> {
        const task = await this.findOneTask(id);
        const isAssignerOrLeader = task.assigner_id === currentUser.user_id || [UserRole.ADMIN, UserRole.DIRECTOR].includes(currentUser.role);
        if (!isAssignerOrLeader) {
            throw new ForbiddenException('Chỉ người giao việc hoặc Ban Giám đốc mới có quyền duyệt nghiệm thu');
        }

        const effectiveDecision = dto.action || dto.decision || 'APPROVE';

        if (effectiveDecision === 'APPROVE') {
            const completedAt = new Date();
            task.status = 'COMPLETED';
            task.progress = 100;
            task.completed_at = completedAt;
            task.review_note = dto.review_note || 'Đồng ý nghiệm thu hoàn thành.';

            const checkDate = task.submitted_at ? new Date(task.submitted_at) : completedAt;
            const isOnTime = checkDate <= new Date(task.deadline);
            const weight = Number(task.kpi_weight) || 1.0;
            task.kpi_score =
                dto.kpi_score !== undefined ? Number(dto.kpi_score) : isOnTime ? Number((weight * 10).toFixed(1)) : Number((weight * 5).toFixed(1));

            await this.taskRepo.save(task);

            await this.logActivity(
                task.id,
                currentUser.user_id,
                'APPROVED',
                `Đã phê duyệt hoàn thành công việc (${isOnTime ? 'Đúng hạn' : 'Trễ hạn'} - Điểm KPI: +${task.kpi_score}). ${
                    dto.review_note ? `Nhận xét: ${dto.review_note}` : ''
                }`,
            );

            if (task.assignee_id !== currentUser.user_id) {
                await this.notifyUsers(
                    [task.assignee_id],
                    `🏆 [Nghiệm thu hoàn tất - ${task.code}] Công việc "${task.title}" đã được nghiệm thu (+${task.kpi_score} điểm KPI)`,
                    currentUser.user_id,
                    `[Nghiệm thu hoàn tất] ${task.code}`,
                    {
                        taskId: task.id,
                        taskCode: task.code,
                        actionType: 'TASK_APPROVED',
                        title: 'Nghiệm thu hoàn tất',
                    },
                );
            }

            // Bắn popup xác nhận cho người duyệt
            this.gateway.sendToUser(currentUser.user_id, {
                taskId: task.id,
                taskCode: task.code,
                actionType: 'TASK_APPROVED',
                title: 'Nghiệm thu thành công',
                message: `Đã nghiệm thu hoàn tất công việc [${task.code}] cho ${task.assignee?.name || 'nhân sự'} (+${task.kpi_score} KPI)`,
                timestamp: new Date().toISOString(),
            });
        } else {
            if (!dto.review_note || !dto.review_note.trim()) {
                throw new BadRequestException('Vui lòng nhập lý do từ chối / trả lại để người nhận khắc phục');
            }
            task.status = 'REJECTED';
            task.progress = 80;
            task.review_note = dto.review_note.trim();
            await this.taskRepo.save(task);

            await this.logActivity(
                task.id,
                currentUser.user_id,
                'REJECTED',
                `Từ chối nghiệm thu & yêu cầu thực hiện lại. Lý do: ${task.review_note}`,
            );

            if (task.assignee_id !== currentUser.user_id) {
                await this.notifyUsers(
                    [task.assignee_id],
                    `🔄 [Yêu cầu làm lại - ${task.code}] Công việc "${task.title}" bị trả lại: ${task.review_note}`,
                    currentUser.user_id,
                    `[Yêu cầu làm lại] ${task.code}`,
                    {
                        taskId: task.id,
                        taskCode: task.code,
                        actionType: 'TASK_REJECTED',
                        title: 'Yêu cầu làm lại công việc',
                    },
                );
            }

            // Bắn popup xác nhận cho người duyệt
            this.gateway.sendToUser(currentUser.user_id, {
                taskId: task.id,
                taskCode: task.code,
                actionType: 'TASK_REJECTED',
                title: 'Đã yêu cầu làm lại',
                message: `Đã trả lại công việc [${task.code}] với lý do: "${task.review_note}"`,
                timestamp: new Date().toISOString(),
            });
        }

        return this.findOneTask(task.id);
    }

    // ═══════════════════ GENERAL UPDATE / COMMENT / DELETE ═══════════════════
    async updateTask(currentUser: User, id: number, dto: UpdateTaskDto): Promise<WorkTask> {
        const task = await this.findOneTask(id);

        if (dto.assignee_id !== undefined && Number(dto.assignee_id) !== task.assignee_id) {
            const assignee = await this.userRepo.findOne({
                where: {user_id: Number(dto.assignee_id)},
            });
            if (!assignee || (assignee.status && assignee.status.trim().toLowerCase() !== 'active')) {
                throw new BadRequestException('Tài khoản đã ngưng hoạt động, không thể bàn giao công việc');
            }
            const assignCtx = await this.getAssignmentContext(currentUser);
            if (!assignCtx.assignableUserIds.includes(Number(dto.assignee_id))) {
                throw new ForbiddenException(
                    'Phân cấp giao việc: Bạn chỉ được phép chuyển giao công việc cho cấp dưới trực thuộc Đội / Tổ hoặc Nhóm thiết bị do mình phụ trách',
                );
            }
            task.assignee_id = Number(dto.assignee_id);
        }

        if (dto.title !== undefined) task.title = dto.title.trim();
        if (dto.description !== undefined) task.description = dto.description;
        if (dto.task_type !== undefined) task.task_type = dto.task_type;
        if (dto.priority !== undefined) task.priority = dto.priority;
        if (dto.status !== undefined) task.status = dto.status;
        if (dto.progress !== undefined) task.progress = Number(dto.progress);
        if (dto.project_id !== undefined) task.project_id = dto.project_id;
        if (dto.dept_id !== undefined) task.dept_id = dto.dept_id;
        if (dto.device_group_id !== undefined) task.device_group_id = dto.device_group_id;
        if (dto.collaborator_ids !== undefined || dto.collaborators !== undefined) {
            task.collaborators = await this.buildCollaborators(dto.collaborator_ids, dto.collaborators);
        }
        if (dto.checklist !== undefined) task.checklist = dto.checklist;
        if (dto.tags !== undefined) task.tags = dto.tags;
        if (dto.attachments !== undefined) task.attachments = dto.attachments;
        if (dto.start_date !== undefined) task.start_date = new Date(dto.start_date);
        if (dto.deadline !== undefined) task.deadline = new Date(dto.deadline);
        if (dto.kpi_weight !== undefined) task.kpi_weight = Number(dto.kpi_weight);

        await this.taskRepo.save(task);
        this.gateway.notifyTaskUpdate({
            taskId: task.id,
            action: 'UPDATED',
            actorId: currentUser.user_id,
        });
        return this.findOneTask(task.id);
    }

    async addComment(currentUser: User, id: number, dto: {content: string; attachments?: Array<{name: string; url: string}>}): Promise<TaskComment> {
        const task = await this.findOneTask(id);
        if (!dto.content || !dto.content.trim()) {
            throw new BadRequestException('Nội dung trao đổi không được để trống');
        }

        const savedComment = await this.logActivity(task.id, currentUser.user_id, 'COMMENT', dto.content.trim(), dto.attachments || []);

        const participantIds = [
            task.assigner_id,
            task.assignee_id,
            ...(Array.isArray(task.collaborators) ? task.collaborators.map((c) => c.user_id) : []),
        ];
        await this.notifyUsers(
            participantIds,
            `💬 [Trao đổi - ${task.code}] ${currentUser.name} đã thêm trao đổi trong "${task.title}": "${dto.content}"`,
            currentUser.user_id,
            `[Trao đổi công việc] ${task.code}`,
            {
                taskId: task.id,
                taskCode: task.code,
                actionType: 'TASK_COMMENT',
                title: 'Trao đổi / Nhật ký mới',
            },
        );

        return savedComment;
    }

    async deleteTask(currentUser: User, id: number): Promise<{message: string}> {
        const task = await this.findOneTask(id);
        const canDelete = task.assigner_id === currentUser.user_id || [UserRole.ADMIN, UserRole.DIRECTOR].includes(currentUser.role);
        if (!canDelete) {
            throw new ForbiddenException('Chỉ người giao việc hoặc Quản trị viên mới có quyền xóa công việc này');
        }
        await this.taskRepo.remove(task);
        this.gateway.notifyTaskUpdate({
            taskId: id,
            action: 'DELETED',
            actorId: currentUser.user_id,
        });
        return {message: 'Đã xóa công việc thành công'};
    }

    // ═══════════════════ PHASE 2: CRONJOB REMINDERS (T-3, T-1, OVERDUE, STALLED) ═══════════════════
    @Cron('0 30 7 * * *')
    async handleMorningTaskReminders(): Promise<void> {
        this.logger.log('Chạy Cronjob buổi sáng (07:30) quét nhắc việc T-3, T-1 và Quá hạn...');
        await this.runDeadlineReminders(false);
    }

    @Cron('0 0 14 * * *')
    async handleAfternoonTaskReminders(): Promise<void> {
        this.logger.log('Chạy Cronjob buổi chiều (14:00) quét nhắc việc khẩn và Quá hạn...');
        await this.runDeadlineReminders(false);
    }

    async runDeadlineReminders(force = false): Promise<IReminderScanResult> {
        const activeTasks = await this.taskRepo.find({
            where: {
                status: In(['NEW', 'CHANGE_REQUESTED', 'IN_PROGRESS', 'REJECTED']),
            },
            relations: ['assignee', 'assigner'],
        });

        const now = new Date();
        let overdueCount = 0;
        let dueT1Count = 0;
        let dueT3Count = 0;
        let stalledNewCount = 0;
        let notificationsSent = 0;

        for (const task of activeTasks) {
            const deadline = new Date(task.deadline);
            const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 3600);
            const createdHoursAgo = (now.getTime() - new Date(task.created_at).getTime()) / (1000 * 3600);

            // Prevent spamming more than once every 10 hours unless forced manually by leader
            const remindedRecently =
                !force && task.last_reminded_at && (now.getTime() - new Date(task.last_reminded_at).getTime()) / (1000 * 3600) < 10;

            if (diffHours < 0) {
                overdueCount += 1;
                if (!remindedRecently) {
                    const overdueDays = Math.max(1, Math.ceil(Math.abs(diffHours) / 24));
                    notificationsSent += await this.notifyUsers(
                        [task.assignee_id, task.assigner_id],
                        `🚨 [QUÁ HẠN ${overdueDays} NGÀY - ${task.code}] Công việc "${
                            task.title
                        }" đã quá hạn hoàn thành (${deadline.toLocaleDateString('vi-VN')}). Đề nghị xử lý khẩn trương!`,
                        undefined,
                        `[Cảnh báo Quá hạn] ${task.code} - ${task.title}`,
                    );
                    task.last_reminded_at = now;
                    await this.taskRepo.save(task);
                }
            } else if (diffHours <= 24) {
                dueT1Count += 1;
                if (!remindedRecently) {
                    const hoursLeft = Math.max(1, Math.round(diffHours));
                    const collabIds = Array.isArray(task.collaborators) ? task.collaborators.map((c) => c.user_id) : [];
                    notificationsSent += await this.notifyUsers(
                        [task.assignee_id, ...collabIds],
                        `⏰ [Nhắc hạn T-1 - Còn ${hoursLeft} giờ] Công việc [${task.code}] "${task.title}" sắp đến hạn vào ${deadline.toLocaleString(
                            'vi-VN',
                        )}`,
                        undefined,
                        `[Nhắc việc khẩn T-1] ${task.code} - ${task.title}`,
                    );
                    task.last_reminded_at = now;
                    await this.taskRepo.save(task);
                }
            } else if (diffHours <= 72) {
                dueT3Count += 1;
                if (!remindedRecently) {
                    const daysLeft = Math.ceil(diffHours / 24);
                    notificationsSent += await this.notifyUsers(
                        [task.assignee_id],
                        `🔔 [Nhắc hạn T-${daysLeft}] Công việc [${task.code}] "${
                            task.title
                        }" còn ${daysLeft} ngày đến hạn (${deadline.toLocaleDateString('vi-VN')})`,
                    );
                    task.last_reminded_at = now;
                    await this.taskRepo.save(task);
                }
            } else if (task.status === 'NEW' && createdHoursAgo >= 24) {
                stalledNewCount += 1;
                if (!remindedRecently) {
                    notificationsSent += await this.notifyUsers(
                        [task.assignee_id],
                        `📌 [Chưa tiếp nhận > 24h - ${task.code}] Bạn có công việc "${task.title}" được giao từ ${new Date(
                            task.created_at,
                        ).toLocaleDateString('vi-VN')} chưa bấm Tiếp nhận.`,
                    );
                    task.last_reminded_at = now;
                    await this.taskRepo.save(task);
                }
            }
        }

        return {
            scannedCount: activeTasks.length,
            overdueCount,
            dueT1Count,
            dueT3Count,
            stalledNewCount,
            notificationsSent,
            timestamp: now.toISOString(),
        };
    }

    // ═══════════════════ PHASE 2: DIRECT NUDGE ("ĐÔN ĐỐC CÔNG VIỆC") ═══════════════════
    async nudgeTask(currentUser: User, id: number, note?: string): Promise<{message: string; task: WorkTask}> {
        const task = await this.findOneTask(id);
        const nudgeContent = note?.trim()
            ? `⚡ [Đôn đốc tiến độ]: ${note.trim()}`
            : `⚡ [Đôn đốc tiến độ]: Đề nghị khẩn trương cập nhật tiến độ và hoàn thành công việc đúng hạn.`;

        await this.logActivity(task.id, currentUser.user_id, 'REMINDER', nudgeContent);

        const targetIds = [
            task.assignee_id,
            ...(Array.isArray(task.collaborators) ? task.collaborators.filter((c) => c.role === 'COLLABORATOR').map((c) => c.user_id) : []),
        ];

        await this.notifyUsers(
            targetIds,
            `⚡ [Đôn đốc từ ${currentUser.name || 'Lãnh đạo'} - ${task.code}] "${task.title}": ${
                note?.trim() || 'Đề nghị khẩn trương triển khai và báo cáo tiến độ!'
            }`,
            currentUser.user_id,
            `[Đôn đốc công việc] ${task.code} - ${task.title}`,
        );

        task.last_reminded_at = new Date();
        await this.taskRepo.save(task);

        return {
            message: `Đã gửi thông báo đôn đốc tới ${task.assignee?.name || 'người thực hiện'}`,
            task: await this.findOneTask(task.id),
        };
    }

    // ═══════════════════ PHASE 2: EXECUTIVE DASHBOARD & WORKLOAD ANALYTICS ═══════════════════
    async getExecutiveDashboard(currentUser: User, query?: {dept_id?: number; project_id?: number; month?: string}) {
        let tasks = await this.getAccessibleTasksForUser(currentUser);

        if (query?.dept_id) {
            tasks = tasks.filter((t) => t.dept_id === Number(query.dept_id));
        }
        if (query?.project_id) {
            tasks = tasks.filter((t) => t.project_id === Number(query.project_id));
        }
        if (query?.month) {
            // YYYY-MM filter
            tasks = tasks.filter((t) => {
                const d = new Date(t.deadline).toISOString().slice(0, 7);
                const c = new Date(t.created_at).toISOString().slice(0, 7);
                return d === query.month || c === query.month;
            });
        }

        const now = new Date();
        const isOverdue = (t: WorkTask) => !['COMPLETED', 'CANCELLED'].includes(t.status) && new Date(t.deadline) < now;

        const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
        const completedOnTime = completedTasks.filter((t) => {
            const doneDate = t.completed_at ? new Date(t.completed_at) : t.submitted_at ? new Date(t.submitted_at) : new Date(t.updated_at);
            return doneDate <= new Date(t.deadline);
        });

        const activeTasks = tasks.filter((t) => !['COMPLETED', 'CANCELLED'].includes(t.status));
        const overdueTasks = tasks.filter(isOverdue);

        // Stalled / Attention Tasks detection
        const stalledTasks: IStalledTaskAlert[] = [];
        for (const t of tasks) {
            if (['COMPLETED', 'CANCELLED'].includes(t.status)) continue;

            const deadlineDate = new Date(t.deadline);
            const createdHours = (now.getTime() - new Date(t.created_at).getTime()) / (1000 * 3600);
            const submittedHours = t.submitted_at ? (now.getTime() - new Date(t.submitted_at).getTime()) / (1000 * 3600) : 0;

            let alertType: IStalledTaskAlert['alertType'] | null = null;
            let alertLabel = '';
            let hoursDelayed = 0;

            if (deadlineDate < now) {
                alertType = 'OVERDUE';
                hoursDelayed = Math.round((now.getTime() - deadlineDate.getTime()) / (1000 * 3600));
                alertLabel = hoursDelayed >= 24 ? `Quá hạn ${Math.floor(hoursDelayed / 24)} ngày` : `Quá hạn ${Math.max(1, hoursDelayed)} giờ`;
            } else if (t.status === 'CHANGE_REQUESTED') {
                alertType = 'CHANGE_REQUESTED';
                hoursDelayed = Math.round(createdHours);
                alertLabel = 'Chờ duyệt điều chỉnh hạn';
            } else if (t.status === 'PENDING_REVIEW' && submittedHours >= 24) {
                alertType = 'PENDING_REVIEW_OVER_24H';
                hoursDelayed = Math.round(submittedHours);
                alertLabel = `Chờ nghiệm thu ${Math.floor(submittedHours / 24)} ngày`;
            } else if (t.status === 'NEW' && createdHours >= 24) {
                alertType = 'NEW_OVER_24H';
                hoursDelayed = Math.round(createdHours);
                alertLabel = `Giao ${Math.floor(createdHours / 24)} ngày chưa tiếp nhận`;
            }

            if (alertType) {
                stalledTasks.push({
                    id: t.id,
                    code: t.code,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    progress: t.progress,
                    deadline: t.deadline,
                    created_at: t.created_at,
                    submitted_at: t.submitted_at,
                    alertType,
                    alertLabel,
                    hoursDelayed,
                    assignee: t.assignee
                        ? {
                              user_id: t.assignee.user_id,
                              name: t.assignee.name,
                              avatar: t.assignee.avatar,
                              position: t.assignee.position,
                          }
                        : undefined,
                    assigner: t.assigner
                        ? {
                              user_id: t.assigner.user_id,
                              name: t.assigner.name,
                          }
                        : undefined,
                    department: t.department
                        ? {
                              dept_id: t.department.dept_id,
                              name: t.department.name,
                          }
                        : undefined,
                });
            }
        }

        // Sort stalled tasks: OVERDUE first, then by hoursDelayed desc
        stalledTasks.sort((a, b) => {
            if (a.alertType === 'OVERDUE' && b.alertType !== 'OVERDUE') return -1;
            if (a.alertType !== 'OVERDUE' && b.alertType === 'OVERDUE') return 1;
            return b.hoursDelayed - a.hoursDelayed;
        });

        // Status breakdown
        const statusMeta: Array<{
            status: WorkTaskStatus;
            label: string;
            color: string;
        }> = [
            {status: 'NEW', label: 'Mới giao', color: '#2563eb'},
            {status: 'CHANGE_REQUESTED', label: 'Đề nghị điều chỉnh', color: '#d97706'},
            {status: 'IN_PROGRESS', label: 'Đang thực hiện', color: '#0284c7'},
            {status: 'PENDING_REVIEW', label: 'Chờ nghiệm thu', color: '#7c3aed'},
            {status: 'REJECTED', label: 'Yêu cầu làm lại', color: '#dc2626'},
            {status: 'COMPLETED', label: 'Đã hoàn thành', color: '#16a34a'},
        ];
        const statusBreakdown = statusMeta.map((sm) => ({
            ...sm,
            count: tasks.filter((t) => t.status === sm.status).length,
        }));

        // Priority breakdown
        const priorityMeta: Array<{
            priority: WorkTaskPriority;
            label: string;
            color: string;
        }> = [
            {priority: 'URGENT', label: 'Khẩn cấp', color: '#dc2626'},
            {priority: 'HIGH', label: 'Cao', color: '#d97706'},
            {priority: 'NORMAL', label: 'Bình thường', color: '#2563eb'},
            {priority: 'LOW', label: 'Thấp', color: '#64748b'},
        ];
        const priorityBreakdown = priorityMeta.map((pm) => ({
            ...pm,
            count: tasks.filter((t) => t.priority === pm.priority).length,
        }));

        // Department Workload Aggregation
        const deptMap = new Map<
            number,
            {
                dept_id: number;
                dept_name: string;
                total: number;
                newCount: number;
                inProgress: number;
                pendingReview: number;
                completed: number;
                completedOnTime: number;
                overdue: number;
            }
        >();

        for (const t of tasks) {
            const dId = t.department?.dept_id || t.dept_id || 0;
            const dName = t.department?.name || 'Chưa phân đơn vị';
            let entry = deptMap.get(dId);
            if (!entry) {
                entry = {
                    dept_id: dId,
                    dept_name: dName,
                    total: 0,
                    newCount: 0,
                    inProgress: 0,
                    pendingReview: 0,
                    completed: 0,
                    completedOnTime: 0,
                    overdue: 0,
                };
                deptMap.set(dId, entry);
            }
            entry.total += 1;
            if (t.status === 'NEW' || t.status === 'CHANGE_REQUESTED') entry.newCount += 1;
            if (t.status === 'IN_PROGRESS' || t.status === 'REJECTED') entry.inProgress += 1;
            if (t.status === 'PENDING_REVIEW') entry.pendingReview += 1;
            if (t.status === 'COMPLETED') {
                entry.completed += 1;
                const doneAt = t.completed_at ? new Date(t.completed_at) : new Date(t.updated_at);
                if (doneAt <= new Date(t.deadline)) entry.completedOnTime += 1;
            }
            if (isOverdue(t)) entry.overdue += 1;
        }

        const departmentWorkload = Array.from(deptMap.values())
            .map((d) => ({
                ...d,
                onTimeRate: d.completed > 0 ? Math.round((d.completedOnTime / d.completed) * 100) : 100,
            }))
            .sort((a, b) => b.total - a.total);

        // Employee Workload Aggregation
        const empMap = new Map<
            number,
            {
                user_id: number;
                name: string;
                avatar?: string;
                position?: string;
                dept_name: string;
                total: number;
                inProgress: number;
                pendingReview: number;
                completed: number;
                completedOnTime: number;
                overdue: number;
                totalKpiScore: number;
            }
        >();

        for (const t of tasks) {
            if (!t.assignee_id) continue;
            const uId = t.assignee_id;
            let emp = empMap.get(uId);
            if (!emp) {
                emp = {
                    user_id: uId,
                    name: t.assignee?.name || `Nhân sự #${uId}`,
                    avatar: t.assignee?.avatar,
                    position: t.assignee?.position || t.assignee?.role,
                    dept_name: t.department?.name || '—',
                    total: 0,
                    inProgress: 0,
                    pendingReview: 0,
                    completed: 0,
                    completedOnTime: 0,
                    overdue: 0,
                    totalKpiScore: 0,
                };
                empMap.set(uId, emp);
            }
            emp.total += 1;
            if (t.status === 'NEW' || t.status === 'CHANGE_REQUESTED' || t.status === 'IN_PROGRESS' || t.status === 'REJECTED') {
                emp.inProgress += 1;
            }
            if (t.status === 'PENDING_REVIEW') emp.pendingReview += 1;
            if (t.status === 'COMPLETED') {
                emp.completed += 1;
                const doneAt = t.completed_at ? new Date(t.completed_at) : new Date(t.updated_at);
                if (doneAt <= new Date(t.deadline)) emp.completedOnTime += 1;
                emp.totalKpiScore = Number((emp.totalKpiScore + Number(t.kpi_score || 0)).toFixed(1));
            }
            if (isOverdue(t)) emp.overdue += 1;
        }

        const employeeWorkload = Array.from(empMap.values())
            .map((e) => ({
                ...e,
                onTimeRate: e.completed > 0 ? Math.round((e.completedOnTime / e.completed) * 100) : 100,
            }))
            .sort((a, b) => b.total - a.total);

        const totalKpiScore = Number(completedTasks.reduce((acc, t) => acc + Number(t.kpi_score || 0), 0).toFixed(1));

        return {
            summary: {
                totalTasks: tasks.length,
                activeTasks: activeTasks.length,
                completedTasks: completedTasks.length,
                overdueTasks: overdueTasks.length,
                stalledCount: stalledTasks.length,
                pendingReviewCount: tasks.filter((t) => t.status === 'PENDING_REVIEW').length,
                completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
                onTimeCompletionRate: completedTasks.length > 0 ? Math.round((completedOnTime.length / completedTasks.length) * 100) : 100,
                totalKpiScore,
                avgKpiScore: completedTasks.length > 0 ? Number((totalKpiScore / completedTasks.length).toFixed(1)) : 0,
            },
            statusBreakdown,
            priorityBreakdown,
            departmentWorkload,
            employeeWorkload,
            stalledTasks: stalledTasks.slice(0, 25),
        };
    }

    // ═══════════════════ PHASE 3: KPI EVALUATION, EMULATION RANKING & 360° USER SUMMARY ═══════════════════
    private computeGrade(
        totalAssigned: number,
        completionRate: number,
        onTimeRate: number,
        overdueUnfinished: number,
    ): {grade: 'A+' | 'A' | 'B' | 'C'; gradeLabel: string} {
        if (totalAssigned === 0) {
            return {grade: 'B', gradeLabel: 'Chưa phát sinh việc'};
        }
        if (completionRate >= 90 && onTimeRate >= 90 && overdueUnfinished === 0) {
            return {grade: 'A+', gradeLabel: 'Hoàn thành xuất sắc'};
        }
        if (completionRate >= 75 && onTimeRate >= 75 && overdueUnfinished <= 1) {
            return {grade: 'A', gradeLabel: 'Hoàn thành tốt'};
        }
        if (completionRate >= 50) {
            return {grade: 'B', gradeLabel: 'Hoàn thành nhiệm vụ'};
        }
        return {grade: 'C', gradeLabel: 'Cần chấn chỉnh tiến độ'};
    }

    async getKpiEvaluationReport(
        currentUser: User,
        query?: {
            period_type?: 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL';
            period_value?: string;
            dept_id?: number;
        },
    ) {
        let tasks = await this.getAccessibleTasksForUser(currentUser);
        tasks = tasks.filter((t) => t.status !== 'CANCELLED');

        if (query?.dept_id) {
            tasks = tasks.filter((t) => t.dept_id === Number(query.dept_id));
        }

        const periodType = query?.period_type || 'ALL';
        const periodValue = query?.period_value || '';
        let periodLabel = 'Toàn thời gian';

        if (periodType === 'MONTH' && periodValue) {
            // YYYY-MM
            periodLabel = `Tháng ${periodValue.slice(5, 7)}/${periodValue.slice(0, 4)}`;
            tasks = tasks.filter((t) => {
                const d = new Date(t.deadline).toISOString().slice(0, 7);
                const c = new Date(t.created_at).toISOString().slice(0, 7);
                return d === periodValue || c === periodValue;
            });
        } else if (periodType === 'QUARTER' && periodValue) {
            // YYYY-Q1..Q4
            const [yearStr, qStr] = periodValue.split('-Q');
            const qNum = Number(qStr) || 1;
            periodLabel = `Quý ${qNum}/${yearStr}`;
            const startMonth = (qNum - 1) * 3 + 1;
            const endMonth = qNum * 3;
            tasks = tasks.filter((t) => {
                const dt = new Date(t.deadline);
                const y = dt.getFullYear();
                const m = dt.getMonth() + 1;
                return String(y) === yearStr && m >= startMonth && m <= endMonth;
            });
        } else if (periodType === 'YEAR' && periodValue) {
            periodLabel = `Năm ${periodValue}`;
            tasks = tasks.filter((t) => {
                const y = String(new Date(t.deadline).getFullYear());
                return y === periodValue;
            });
        }

        const now = new Date();
        const isOverdue = (t: WorkTask) => !['COMPLETED', 'CANCELLED'].includes(t.status) && new Date(t.deadline) < now;

        const empMap = new Map<
            number,
            {
                user_id: number;
                name: string;
                avatar?: string;
                position?: string;
                dept_id?: number | null;
                dept_name: string;
                totalAssigned: number;
                completedOnTime: number;
                completedLate: number;
                inProgress: number;
                overdueUnfinished: number;
                totalWeight: number;
                earnedKpiScore: number;
                penaltyScore: number;
                tasks: Array<{
                    id: number;
                    code: string;
                    title: string;
                    status: WorkTaskStatus;
                    priority: WorkTaskPriority;
                    deadline: Date;
                    completed_at?: Date | null;
                    kpi_weight: number;
                    kpi_score?: number | null;
                    onTime: boolean;
                }>;
            }
        >();

        for (const t of tasks) {
            if (!t.assignee_id) continue;
            const uId = t.assignee_id;
            let row = empMap.get(uId);
            if (!row) {
                row = {
                    user_id: uId,
                    name: t.assignee?.name || `Nhân sự #${uId}`,
                    avatar: t.assignee?.avatar,
                    position: t.assignee?.position || t.assignee?.role,
                    dept_id: t.department?.dept_id || t.dept_id,
                    dept_name: t.department?.name || 'Chưa phân đơn vị',
                    totalAssigned: 0,
                    completedOnTime: 0,
                    completedLate: 0,
                    inProgress: 0,
                    overdueUnfinished: 0,
                    totalWeight: 0,
                    earnedKpiScore: 0,
                    penaltyScore: 0,
                    tasks: [],
                };
                empMap.set(uId, row);
            }
            const weight = Number(t.kpi_weight || 1);
            row.totalAssigned += 1;
            row.totalWeight = Number((row.totalWeight + weight).toFixed(1));

            let onTime = true;
            if (t.status === 'COMPLETED') {
                const doneAt = t.completed_at ? new Date(t.completed_at) : t.submitted_at ? new Date(t.submitted_at) : new Date(t.updated_at);
                onTime = doneAt <= new Date(t.deadline);
                if (onTime) {
                    row.completedOnTime += 1;
                } else {
                    row.completedLate += 1;
                }
                const score =
                    t.kpi_score !== null && t.kpi_score !== undefined
                        ? Number(t.kpi_score)
                        : onTime
                        ? Number((weight * 10).toFixed(1))
                        : Number((weight * 5).toFixed(1));
                row.earnedKpiScore = Number((row.earnedKpiScore + score).toFixed(1));
            } else {
                row.inProgress += 1;
                if (isOverdue(t)) {
                    onTime = false;
                    row.overdueUnfinished += 1;
                    row.penaltyScore = Number((row.penaltyScore + weight * 2).toFixed(1));
                }
            }

            row.tasks.push({
                id: t.id,
                code: t.code,
                title: t.title,
                status: t.status,
                priority: t.priority,
                deadline: t.deadline,
                completed_at: t.completed_at,
                kpi_weight: weight,
                kpi_score: t.kpi_score,
                onTime,
            });
        }

        const employeeRanking = Array.from(empMap.values())
            .map((e) => {
                const completedTotal = e.completedOnTime + e.completedLate;
                const completionRate = e.totalAssigned > 0 ? Math.round((completedTotal / e.totalAssigned) * 100) : 0;
                const onTimeRate = completedTotal > 0 ? Math.round((e.completedOnTime / completedTotal) * 100) : e.overdueUnfinished > 0 ? 0 : 100;
                const netKpiScore = Number(Math.max(0, e.earnedKpiScore - e.penaltyScore).toFixed(1));
                const maxPossibleScore = e.totalWeight * 10;
                const kpiEfficiency = maxPossibleScore > 0 ? Math.min(100, Math.round((netKpiScore / maxPossibleScore) * 100)) : 0;
                const {grade, gradeLabel} = this.computeGrade(e.totalAssigned, completionRate, onTimeRate, e.overdueUnfinished);

                return {
                    ...e,
                    completedTotal,
                    completionRate,
                    onTimeRate,
                    netKpiScore,
                    kpiEfficiency,
                    grade,
                    gradeLabel,
                };
            })
            .sort((a, b) => {
                if (b.netKpiScore !== a.netKpiScore) return b.netKpiScore - a.netKpiScore;
                return b.onTimeRate - a.onTimeRate;
            })
            .map((item, idx) => ({
                ...item,
                rank: idx + 1,
            }));

        // Aggregate Department Ranking
        const deptAgg = new Map<
            string,
            {
                dept_name: string;
                memberCount: number;
                totalAssigned: number;
                completedTotal: number;
                completedOnTime: number;
                overdueUnfinished: number;
                netKpiScore: number;
            }
        >();

        for (const emp of employeeRanking) {
            const key = emp.dept_name;
            let d = deptAgg.get(key);
            if (!d) {
                d = {
                    dept_name: key,
                    memberCount: 0,
                    totalAssigned: 0,
                    completedTotal: 0,
                    completedOnTime: 0,
                    overdueUnfinished: 0,
                    netKpiScore: 0,
                };
                deptAgg.set(key, d);
            }
            d.memberCount += 1;
            d.totalAssigned += emp.totalAssigned;
            d.completedTotal += emp.completedTotal;
            d.completedOnTime += emp.completedOnTime;
            d.overdueUnfinished += emp.overdueUnfinished;
            d.netKpiScore = Number((d.netKpiScore + emp.netKpiScore).toFixed(1));
        }

        const departmentRanking = Array.from(deptAgg.values())
            .map((d) => {
                const completionRate = d.totalAssigned > 0 ? Math.round((d.completedTotal / d.totalAssigned) * 100) : 0;
                const onTimeRate = d.completedTotal > 0 ? Math.round((d.completedOnTime / d.completedTotal) * 100) : 100;
                const {grade, gradeLabel} = this.computeGrade(d.totalAssigned, completionRate, onTimeRate, d.overdueUnfinished);
                return {
                    ...d,
                    completionRate,
                    onTimeRate,
                    avgScorePerMember: d.memberCount > 0 ? Number((d.netKpiScore / d.memberCount).toFixed(1)) : 0,
                    grade,
                    gradeLabel,
                };
            })
            .sort((a, b) => b.netKpiScore - a.netKpiScore)
            .map((item, idx) => ({
                ...item,
                rank: idx + 1,
            }));

        const gradeCounts = {
            A_PLUS: employeeRanking.filter((e) => e.grade === 'A+').length,
            A: employeeRanking.filter((e) => e.grade === 'A').length,
            B: employeeRanking.filter((e) => e.grade === 'B').length,
            C: employeeRanking.filter((e) => e.grade === 'C').length,
        };

        return {
            periodLabel,
            summary: {
                evaluatedEmployees: employeeRanking.length,
                totalTasks: tasks.length,
                totalNetKpiScore: Number(employeeRanking.reduce((s, e) => s + e.netKpiScore, 0).toFixed(1)),
                gradeCounts,
            },
            employeeRanking,
            departmentRanking,
        };
    }

    async getUserTaskSummary(userId: number) {
        const tasks = await this.taskRepo.find({
            where: {assignee_id: Number(userId)},
            relations: ['assigner', 'department', 'project'],
            order: {created_at: 'DESC'},
        });

        const validTasks = tasks.filter((t) => t.status !== 'CANCELLED');
        const now = new Date();
        let completedOnTime = 0;
        let completedLate = 0;
        let inProgress = 0;
        let overdueUnfinished = 0;
        let earnedKpiScore = 0;
        let penaltyScore = 0;

        for (const t of validTasks) {
            const weight = Number(t.kpi_weight || 1);
            if (t.status === 'COMPLETED') {
                const doneAt = t.completed_at ? new Date(t.completed_at) : t.submitted_at ? new Date(t.submitted_at) : new Date(t.updated_at);
                const onTime = doneAt <= new Date(t.deadline);
                if (onTime) completedOnTime += 1;
                else completedLate += 1;

                const score =
                    t.kpi_score !== null && t.kpi_score !== undefined
                        ? Number(t.kpi_score)
                        : onTime
                        ? Number((weight * 10).toFixed(1))
                        : Number((weight * 5).toFixed(1));
                earnedKpiScore = Number((earnedKpiScore + score).toFixed(1));
            } else {
                inProgress += 1;
                if (new Date(t.deadline) < now) {
                    overdueUnfinished += 1;
                    penaltyScore = Number((penaltyScore + weight * 2).toFixed(1));
                }
            }
        }

        const completedTotal = completedOnTime + completedLate;
        const completionRate = validTasks.length > 0 ? Math.round((completedTotal / validTasks.length) * 100) : 0;
        const onTimeRate = completedTotal > 0 ? Math.round((completedOnTime / completedTotal) * 100) : overdueUnfinished > 0 ? 0 : 100;
        const netKpiScore = Number(Math.max(0, earnedKpiScore - penaltyScore).toFixed(1));
        const {grade, gradeLabel} = this.computeGrade(validTasks.length, completionRate, onTimeRate, overdueUnfinished);

        return {
            totalAssigned: validTasks.length,
            completedTotal,
            completedOnTime,
            completedLate,
            inProgress,
            overdueUnfinished,
            earnedKpiScore,
            penaltyScore,
            netKpiScore,
            completionRate,
            onTimeRate,
            grade,
            gradeLabel,
            recentTasks: validTasks.slice(0, 15),
        };
    }
}
