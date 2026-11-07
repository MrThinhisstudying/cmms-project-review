import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {CompanyPolicy, PolicyCategory} from './entities/company-policy.entity';
import {CompanyPolicyAck} from './entities/company-policy-ack.entity';
import {CreateCompanyPolicyDto, UpdateCompanyPolicyDto, QueryCompanyPolicyDto} from './dto/company-policy.dto';
import {User} from 'src/user/user.entity';
import {NotificationService} from 'src/notification/notification.service';
import {RepairsGateway} from 'src/repairs/repairs.gateway';

@Injectable()
export class CompanyPoliciesService {
    constructor(
        @InjectRepository(CompanyPolicy)
        private readonly policyRepo: Repository<CompanyPolicy>,
        @InjectRepository(CompanyPolicyAck)
        private readonly ackRepo: Repository<CompanyPolicyAck>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly notificationService: NotificationService,
        private readonly repairsGateway: RepairsGateway,
    ) {}

    private async getActiveUsers(): Promise<User[]> {
        const users = await this.userRepo.find({
            relations: ['department'],
        });
        return users.filter((u) => !u.status || u.status.trim().toLowerCase() === 'active');
    }

    async findAll(query: QueryCompanyPolicyDto, currentUser?: User) {
        const qb = this.policyRepo
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.created_by', 'cb')
            .leftJoinAndSelect('p.acknowledgments', 'ack')
            .orderBy('p.is_pinned', 'DESC')
            .addOrderBy('p.created_at', 'DESC');

        const canManage = ['ADMIN', 'HR_MANAGER', 'DIRECTOR'].includes((currentUser?.role || '').toUpperCase());

        if (!(canManage && query.include_inactive === 'true')) {
            qb.andWhere('p.is_active = :isActive', {isActive: true});
        }

        if (query.category) {
            qb.andWhere('p.category = :category', {category: query.category});
        }

        if (query.search && query.search.trim()) {
            const s = `%${query.search.trim().toLowerCase()}%`;
            qb.andWhere(
                "(LOWER(p.title) LIKE :s OR LOWER(COALESCE(p.code, '')) LIKE :s OR LOWER(COALESCE(p.summary, '')) LIKE :s OR LOWER(COALESCE(p.content, '')) LIKE :s)",
                {s},
            );
        }

        const [policies, activeUsers] = await Promise.all([qb.getMany(), this.getActiveUsers()]);

        const activeUserIds = new Set(activeUsers.map((u) => u.user_id));
        const totalActiveUsers = activeUsers.length;
        const currentUserId = currentUser?.user_id;
        const now = new Date();
        const policiesToAutoUnpin: CompanyPolicy[] = [];

        const enriched = policies.map((p) => {
            const acks = (p.acknowledgments || []).filter((a) => activeUserIds.has(a.user_id));
            const myAck = currentUserId ? (p.acknowledgments || []).find((a) => a.user_id === currentUserId) : undefined;

            // Tự động gỡ ghim khi hết hạn pinned_until HOẶC khi 100% nhân sự đã xác nhận đọc
            const isExpiredPin = p.is_pinned && p.pinned_until && new Date(p.pinned_until).getTime() <= now.getTime();
            const isAllReadPin = p.is_pinned && totalActiveUsers > 0 && acks.length >= totalActiveUsers;

            if (isExpiredPin || isAllReadPin) {
                p.is_pinned = false;
                p.pinned_until = null;
                policiesToAutoUnpin.push(p);
            }

            return {
                id: p.id,
                code: p.code,
                title: p.title,
                category: p.category,
                summary: p.summary,
                content: p.content,
                file_url: p.file_url,
                file_name: p.file_name,
                effective_date: p.effective_date,
                is_pinned: p.is_pinned,
                pinned_until: p.pinned_until,
                is_mandatory_ack: p.is_mandatory_ack,
                is_active: p.is_active,
                created_by_id: p.created_by_id,
                created_by: p.created_by
                    ? {
                          user_id: p.created_by.user_id,
                          name: p.created_by.name,
                          position: p.created_by.position,
                          avatar: p.created_by.avatar,
                      }
                    : null,
                created_at: p.created_at,
                updated_at: p.updated_at,
                is_acknowledged: Boolean(myAck),
                acknowledged_at: myAck?.acknowledged_at || null,
                ack_count: acks.length,
                total_active_users: totalActiveUsers,
            };
        });

        if (policiesToAutoUnpin.length > 0) {
            await this.policyRepo
                .save(
                    policiesToAutoUnpin.map((item) => ({
                        id: item.id,
                        is_pinned: false,
                        pinned_until: null,
                    })),
                )
                .catch(() => undefined);
            enriched.sort((a, b) => {
                if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
        }

        const total = enriched.length;
        const unreadCount = enriched.filter((item) => item.is_active && item.is_mandatory_ack && !item.is_acknowledged).length;
        const acknowledgedCount = enriched.filter((item) => item.is_acknowledged).length;
        const pinnedCount = enriched.filter((item) => item.is_pinned).length;

        const items = query.unread_only === 'true' ? enriched.filter((item) => !item.is_acknowledged) : enriched;

        return {
            items,
            stats: {
                total,
                unreadCount,
                acknowledgedCount,
                pinnedCount,
                totalActiveUsers,
            },
        };
    }

    async findOne(id: number, currentUser?: User) {
        const policy = await this.policyRepo.findOne({
            where: {id},
            relations: ['created_by', 'acknowledgments', 'acknowledgments.user', 'acknowledgments.user.department'],
        });

        if (!policy) {
            throw new NotFoundException(`Không tìm thấy quy chế / quy định ID #${id}`);
        }

        const activeUsers = await this.getActiveUsers();
        const activeUserMap = new Map(activeUsers.map((u) => [u.user_id, u]));
        const ackMap = new Map<number, CompanyPolicyAck>();

        for (const ack of policy.acknowledgments || []) {
            if (activeUserMap.has(ack.user_id)) {
                ackMap.set(ack.user_id, ack);
            }
        }

        const acknowledgedUsers = Array.from(ackMap.values())
            .sort((a, b) => new Date(b.acknowledged_at).getTime() - new Date(a.acknowledged_at).getTime())
            .map((ack) => {
                const u = ack.user || activeUserMap.get(ack.user_id);
                return {
                    user_id: ack.user_id,
                    name: u?.name || 'Nhân viên',
                    employee_code: u?.employee_code || '',
                    position: u?.position || '',
                    department_name: u?.department?.name || '',
                    avatar: u?.avatar || '',
                    acknowledged_at: ack.acknowledged_at,
                };
            });

        const unacknowledgedUsers = activeUsers
            .filter((u) => !ackMap.has(u.user_id))
            .map((u) => ({
                user_id: u.user_id,
                name: u.name || 'Nhân viên',
                employee_code: u.employee_code || '',
                position: u.position || '',
                department_name: u.department?.name || '',
                avatar: u.avatar || '',
            }));

        const myAck = currentUser?.user_id ? (policy.acknowledgments || []).find((a) => a.user_id === currentUser.user_id) : undefined;

        // Tự động gỡ ghim nếu đã hết hạn hoặc 100% nhân sự đã xác nhận đọc
        const isExpiredPin = policy.is_pinned && policy.pinned_until && new Date(policy.pinned_until).getTime() <= Date.now();
        const isAllReadPin = policy.is_pinned && activeUsers.length > 0 && acknowledgedUsers.length >= activeUsers.length;

        if (isExpiredPin || isAllReadPin) {
            policy.is_pinned = false;
            policy.pinned_until = null;
            await this.policyRepo.update(policy.id, {is_pinned: false, pinned_until: null}).catch(() => undefined);
        }

        return {
            id: policy.id,
            code: policy.code,
            title: policy.title,
            category: policy.category,
            summary: policy.summary,
            content: policy.content,
            file_url: policy.file_url,
            file_name: policy.file_name,
            effective_date: policy.effective_date,
            is_pinned: policy.is_pinned,
            pinned_until: policy.pinned_until,
            is_mandatory_ack: policy.is_mandatory_ack,
            is_active: policy.is_active,
            created_by_id: policy.created_by_id,
            created_by: policy.created_by
                ? {
                      user_id: policy.created_by.user_id,
                      name: policy.created_by.name,
                      position: policy.created_by.position,
                      avatar: policy.created_by.avatar,
                  }
                : null,
            created_at: policy.created_at,
            updated_at: policy.updated_at,
            is_acknowledged: Boolean(myAck),
            acknowledged_at: myAck?.acknowledged_at || null,
            ack_count: acknowledgedUsers.length,
            total_active_users: activeUsers.length,
            acknowledged_users: acknowledgedUsers,
            unacknowledged_users: unacknowledgedUsers,
        };
    }

    async create(dto: CreateCompanyPolicyDto, currentUser: User) {
        const isPinned = dto.is_pinned ?? false;
        let pinnedUntil: Date | null = null;
        if (isPinned) {
            pinnedUntil = dto.pinned_until ? new Date(dto.pinned_until) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }

        const policy = this.policyRepo.create({
            code: dto.code?.trim() || undefined,
            title: dto.title.trim(),
            category: dto.category || PolicyCategory.LABOR_RULES,
            summary: dto.summary?.trim() || undefined,
            content: dto.content?.trim() || undefined,
            file_url: dto.file_url || undefined,
            file_name: dto.file_name || undefined,
            effective_date: dto.effective_date || undefined,
            is_pinned: isPinned,
            pinned_until: pinnedUntil,
            is_mandatory_ack: dto.is_mandatory_ack ?? true,
            is_active: dto.is_active ?? true,
            created_by_id: currentUser?.user_id,
            created_by: currentUser,
        });

        const saved = await this.policyRepo.save(policy);

        // Người tạo mặc định được ghi nhận đã đọc
        if (currentUser?.user_id) {
            const creatorAck = this.ackRepo.create({
                policy_id: saved.id,
                user_id: currentUser.user_id,
            });
            await this.ackRepo.save(creatorAck).catch(() => undefined);
        }

        // Gửi thông báo đến toàn bộ người lao động đang hoạt động
        if (dto.notify_all !== false && saved.is_active) {
            try {
                const activeUsers = await this.getActiveUsers();
                const msg = `📢 Quy chế / Quy định mới ban hành: "${saved.title}"${
                    saved.code ? ` (${saved.code})` : ''
                }. Vui lòng truy cập mục Quy chế & Quy định để đọc và xác nhận.`;
                for (const target of activeUsers) {
                    if (target.user_id !== currentUser?.user_id) {
                        await this.notificationService.createForUser(target, msg);
                        this.repairsGateway.sendToUser(target.user_id, msg);
                    }
                }
            } catch (err) {
                console.error('Failed to broadcast new policy notification:', err);
            }
        }

        this.repairsGateway.notifyPolicyUpdate({
            policyId: saved.id,
            action: 'created',
        });

        return this.findOne(saved.id, currentUser);
    }

    async update(id: number, dto: UpdateCompanyPolicyDto, currentUser: User) {
        const policy = await this.policyRepo.findOne({where: {id}});
        if (!policy) {
            throw new NotFoundException(`Không tìm thấy quy chế / quy định ID #${id}`);
        }

        if (dto.code !== undefined) policy.code = dto.code?.trim() || undefined;
        if (dto.title !== undefined) policy.title = dto.title.trim();
        if (dto.category !== undefined) policy.category = dto.category;
        if (dto.summary !== undefined) policy.summary = dto.summary?.trim() || undefined;
        if (dto.content !== undefined) policy.content = dto.content?.trim() || undefined;
        if (dto.file_url !== undefined) policy.file_url = dto.file_url || undefined;
        if (dto.file_name !== undefined) policy.file_name = dto.file_name || undefined;
        if (dto.effective_date !== undefined) policy.effective_date = dto.effective_date || undefined;
        if (dto.is_pinned !== undefined) {
            policy.is_pinned = dto.is_pinned;
            if (!dto.is_pinned) {
                policy.pinned_until = null;
            } else if (dto.pinned_until !== undefined) {
                policy.pinned_until = dto.pinned_until ? new Date(dto.pinned_until) : null;
            } else if (!policy.pinned_until) {
                policy.pinned_until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            }
        } else if (dto.pinned_until !== undefined) {
            policy.pinned_until = dto.pinned_until ? new Date(dto.pinned_until) : null;
        }
        if (dto.is_mandatory_ack !== undefined) policy.is_mandatory_ack = dto.is_mandatory_ack;
        if (dto.is_active !== undefined) policy.is_active = dto.is_active;

        await this.policyRepo.save(policy);

        this.repairsGateway.notifyPolicyUpdate({
            policyId: id,
            action: 'updated',
        });

        return this.findOne(id, currentUser);
    }

    async remove(id: number) {
        const policy = await this.policyRepo.findOne({where: {id}});
        if (!policy) {
            throw new NotFoundException(`Không tìm thấy quy chế / quy định ID #${id}`);
        }

        await this.policyRepo.remove(policy);

        this.repairsGateway.notifyPolicyUpdate({
            policyId: id,
            action: 'deleted',
        });

        return {deleted: true, id};
    }

    async acknowledge(id: number, currentUser: User) {
        const policy = await this.policyRepo.findOne({where: {id}});
        if (!policy) {
            throw new NotFoundException(`Không tìm thấy quy chế / quy định ID #${id}`);
        }

        const existing = await this.ackRepo.findOne({
            where: {policy_id: id, user_id: currentUser.user_id},
        });

        if (!existing) {
            const ack = this.ackRepo.create({
                policy_id: id,
                user_id: currentUser.user_id,
            });
            await this.ackRepo.save(ack);

            this.repairsGateway.notifyPolicyUpdate({
                policyId: id,
                action: 'acknowledged',
            });
        }

        return this.findOne(id, currentUser);
    }
}
