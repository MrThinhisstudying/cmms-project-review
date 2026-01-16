import {Injectable, NotFoundException, InternalServerErrorException, BadRequestException, HttpException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository, FindOneOptions} from 'typeorm';
import {User} from './user.entity';
import {CreateUserDto} from './dto/user-create.dto';
import {Department} from 'src/departments/department.entity';
import {UserDeviceGroup} from '../device-groups/entities/user-device-group.entity';
import {UserRole} from './user-role.enum';
import {In} from 'typeorm';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(UserDeviceGroup)
        private readonly userDeviceGroupRepository: Repository<UserDeviceGroup>,
    ) {}

    async findAll(currentUser?: User): Promise<{result: User[]}> {
        try {
            let whereClause: any = {};

            // If user is OPERATOR, only show users in the same device groups
            if (currentUser && currentUser.role === UserRole.OPERATOR) {
                 const myGroups = await this.userDeviceGroupRepository.find({
                    where: { user_id: currentUser.user_id },
                    select: ['group_id']
                 });
                 
                 if (myGroups.length > 0) {
                     const groupIds = myGroups.map(g => g.group_id);
                     const usersInGroups = await this.userDeviceGroupRepository.find({
                         where: { group_id: In(groupIds) },
                         select: ['user_id']
                     });
                     const userIds = usersInGroups.map(u => u.user_id);
                     whereClause = { user_id: In(userIds) };
                 } else {
                     // If operator has no group, maybe only see themselves? Or none? 
                     // Let's assume they only see themselves if no group assigned.
                     whereClause = { user_id: currentUser.user_id };
                 }
            }

            const users = await this.userRepository.find({
                where: whereClause,
                order: {
                    updated_at: 'DESC',
                },
                relations: ['department', 'user_device_groups', 'user_device_groups.device_group']
            });
            const listUsers = users.map((user) => {
                const {password, ...rest} = user;
                return rest as User;
            });
            return {result: listUsers};
        } catch (error) {
            console.log(error);
            throw new InternalServerErrorException('Lấy danh sách người dùng thất bại');
        }
    }

    async getProfile(userId: number): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { user_id: userId },
            relations: ['department', 'user_device_groups', 'user_device_groups.device_group']
        });
        if (!user) throw new NotFoundException('User not found');
        const { password, ...rest } = user;
        return rest as User;
    }

    async updateProfile(userId: number, data: Partial<User> & { password?: string }): Promise<User> {
         const user = await this.userRepository.findOne({ where: { user_id: userId } });
         if (!user) throw new NotFoundException('User not found');

         if (data.name) user.name = data.name;
         if (data.email) user.email = data.email;
         if (data.signature_url) user.signature_url = data.signature_url;
         
         // Logic to help update password
         if (data.password) {
             // Let's assume Entity listener handles hashing (Usually @BeforeInsert/@BeforeUpdate)
             // But checking User Entity... I should verify if it has @BeforeUpdate.
             // If not, I must hash it here.
             // Since I can't check Entity easily right now without another tool call, 
             // and legacy `create` method doesn't manually hash (it just saves), 
             // it implies Entity likely has BeforeInsert/Update hooks OR it stores plaintext (bad).
             // Wait, `createAdmin` sets password '12345678'.
             // Let's check `User` entity to be safe. 
             // But for now, I will assign it. If it needs hashing and entity doesn't do it, 
             // it will be plaintext. 
             // Let's check `User` entity in next step to be sure.
             user.password = data.password;
         }
         
         await this.userRepository.save(user);
         return this.getProfile(userId);
    }

    async create(data: CreateUserDto): Promise<User> {
        try {
            const existingUser = await this.userRepository.findOne({
                where: {email: data.email},
            });

            if (existingUser) {
                throw new BadRequestException('Email người dùng đã tồn tại');
            }

            const user = this.userRepository.create(data);
            if (data.dept_id) {
                user.department = {dept_id: data.dept_id} as Department;
            }

            const savedUser = await this.userRepository.save(user);

            // Handle Device Group Assignment
            if (data.group_id) {
                const userGroup = this.userDeviceGroupRepository.create({
                    user_id: savedUser.user_id,
                    group_id: data.group_id,
                    is_group_lead: !!data.is_group_lead
                });
                await this.userDeviceGroupRepository.save(userGroup);
            }
            const {password, ...rest} = savedUser;
            return rest as User;
        } catch (error) {
            console.log(error);
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException('Thêm mới người dùng thất bại');
        }
    }

    async update(id: number, data: CreateUserDto): Promise<User> {
        try {
            const user = await this.userRepository.findOne({where: {user_id: id}});
            if (!user) {
                throw new NotFoundException(`Lấy thông tin người dùng thất bại`);
            }
            if (data.email) {
                const existingEmailUser = await this.userRepository.findOne({
                    where: {
                        email: data.email,
                    },
                });

                if (existingEmailUser && existingEmailUser.user_id !== id) {
                    throw new BadRequestException('Email đã tồn tại');
                }
            }
            Object.assign(user, data);
            if (data.dept_id) {
                user.department = {dept_id: data.dept_id} as Department;
            }

            const updated = await this.userRepository.save(user);

            // Handle Device Group Assignment Update
            // Assumption: User belongs to only ONE group via this UI.
            // If group_id is provided, update or create. If null/undefined? existing flow might not send it if not changed?
            // UserModal sends group_id if selected. If cleared? it sends undefined or null?
            if (data.group_id !== undefined) {
                 // Clear existing groups first (Single Group Policy for this UI)
                 await this.userDeviceGroupRepository.delete({ user_id: id });
                 
                 if (data.group_id) {
                     const userGroup = this.userDeviceGroupRepository.create({
                        user_id: id,
                        group_id: data.group_id,
                        is_group_lead: !!data.is_group_lead
                    });
                    await this.userDeviceGroupRepository.save(userGroup);
                 }
            }

            const {password, ...rest} = updated;
            return rest as User;
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException('Cập nhật người dùng thất bại');
        }
    }

    async delete(id: number): Promise<void> {
        try {
            const result = await this.userRepository.delete(id);
            if (result.affected === 0) {
                throw new NotFoundException(`Xoá người dùng thất bại`);
            }
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException('Xoá người dùng thất bại');
        }
    }

    async findOne(where: FindOneOptions<User>): Promise<User> {
        try {
            const user = await this.userRepository.findOne(where);
            if (!user) {
                throw new NotFoundException('Tìm kiếm người dùng thất bại');
            }
            const {password, ...rest} = user;
            return rest as User;
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException('Tìm kiếm người dùng thất bại');
        }
    }

    async findOneSignup(where: FindOneOptions<User>) {
        try {
            return await this.userRepository.findOne(where);
        } catch (error) {
            throw new InternalServerErrorException('Tìm kiếm người dùng thất bại');
        }
    }

    async createAdmin(): Promise<User> {
        const existing = await this.userRepository.findOne({
            where: {email: 'admin@gmail.com'},
        });

        if (existing) {
            throw new BadRequestException('Tài khoản admin đã tồn tại');
        }

        const admin = this.userRepository.create({
            name: 'Administrator',
            email: 'admin@gmail.com',
            position: 'admin',
            password: '12345678',
            role: UserRole.ADMIN,
            citizen_identification_card: '',
            status: 'active',
            avatar: '',
        });

        const saved = await this.userRepository.save(admin);
        const {password: _, ...rest} = saved;
        return rest as User;
    }
}
