import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Notification} from './notification.entity';
import {User} from '../user/user.entity';
import {Department} from '../departments/department.entity';

@Injectable()
export class NotificationService {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepo: Repository<Notification>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) {}

    async getUserNotifications(userId: number): Promise<Notification[]> {
        return this.notificationRepo.find({
            where: {user: {user_id: userId}},
            order: {created_at: 'DESC'},
        });
    }

    async markAsRead(id: number): Promise<{message: string}> {
        await this.notificationRepo.update(id, {is_read: true});
        return {message: 'Đã đánh dấu đã đọc'};
    }

    async markAllAsRead(userId: number): Promise<{message: string}> {
        await this.notificationRepo.update({user: {user_id: userId}, is_read: false}, {is_read: true});
        return {message: 'Tất cả thông báo đã được đánh dấu đã đọc'};
    }

    async createForUser(user: User, message: string): Promise<Notification> {
        const noti = this.notificationRepo.create({user, message});
        return this.notificationRepo.save(noti);
    }

    async createForDepartment(department: Department, message: string): Promise<void> {
        const users = await this.userRepo.find({
            where: {department: {dept_id: department.dept_id}},
        });
        for (const u of users) {
            const noti = this.notificationRepo.create({user: u, department, message});
            await this.notificationRepo.save(noti);
        }
    }
}

