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

    async findAll(currentUser?: User, groupId?: number): Promise<{result: User[]}> {
        try {
            let whereClause: any = {};
            let allowedUserIds: number[] | null = null; // null means no restriction yet

            // Filter by requested groupId
            if (groupId) {
                 const usersInGroup = await this.userDeviceGroupRepository.find({
                     where: { group_id: groupId },
                     select: ['user_id']
                 });
                 allowedUserIds = usersInGroup.map(u => u.user_id);
                 if (allowedUserIds.length === 0) return { result: [] };
            }

            // If user is OPERATOR, only show users in the same device groups
            if (currentUser && currentUser.role === UserRole.OPERATOR) {
                 const myGroups = await this.userDeviceGroupRepository.find({
                    where: { user_id: currentUser.user_id },
                    select: ['group_id']
                 });
                 
                 let operatorUserIds: number[] = [];
                 if (myGroups.length > 0) {
                     const groupIds = myGroups.map(g => g.group_id);
                     const usersInGroups = await this.userDeviceGroupRepository.find({
                         where: { group_id: In(groupIds) },
                         select: ['user_id']
                     });
                     operatorUserIds = usersInGroups.map(u => u.user_id);
                 } else {
                     operatorUserIds = [currentUser.user_id];
                 }

                 // Intersection
                 if (allowedUserIds !== null) {
                     allowedUserIds = allowedUserIds.filter(id => operatorUserIds.includes(id));
                 } else {
                     allowedUserIds = operatorUserIds;
                 }
                 
                 if (allowedUserIds.length === 0) return { result: [] };
            }

            // TEAM_LEAD: Giờ có quyền HR, không cần filter theo department nữa
            // (Trước đây: chỉ thấy user cùng department)

            if (allowedUserIds !== null) {
                whereClause.user_id = In(allowedUserIds);
            }

            const users = await this.userRepository.find({
                where: whereClause,
                order: {
                    updated_at: 'DESC',
                },
                relations: ['department', 'user_device_groups', 'user_device_groups.device_group', 'user_departments', 'user_departments.department']
            });
            const isHrAllowed = currentUser && [UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.DIRECTOR, UserRole.UNIT_HEAD].includes(currentUser.role);
            const listUsers = users.map((user) => {
                const {password, ...rest} = user;
                if (!isHrAllowed && rest.user_id !== currentUser?.user_id) {
                    delete rest.citizen_identification_card;
                    delete rest.date_of_birth;
                    delete rest.place_of_birth;
                    delete rest.permanent_address;
                    delete rest.temporary_address;
                    delete rest.hometown;
                    delete rest.phone_number;
                    delete rest.signature_url;
                }
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
            relations: ['department', 'user_device_groups', 'user_device_groups.device_group', 'user_departments', 'user_departments.department']
        });
        if (!user) throw new NotFoundException('User not found');
        const { password, ...rest } = user;
        return rest as User;
    }

    async findByRoles(roles: UserRole[]): Promise<User[]> {
        return this.userRepository.find({
            where: roles.map(role => ({ role })),
        });
    }

    async updateProfile(userId: number, data: Partial<User> & { password?: string, _old_values?: any }): Promise<User> {
         const user = await this.userRepository.findOne({ where: { user_id: userId } });
         if (!user) throw new NotFoundException('User not found');

         if (data.name) user.name = data.name;
         if (data.email) user.email = data.email;
         if (data.signature_url) user.signature_url = data.signature_url;
         if (data.phone_number !== undefined) user.phone_number = data.phone_number;
         if (data.citizen_identification_card !== undefined) user.citizen_identification_card = data.citizen_identification_card;
         if (data.employee_code !== undefined) user.employee_code = data.employee_code;
         if (data.position !== undefined) user.position = data.position;
         if (data.date_of_birth !== undefined) user.date_of_birth = data.date_of_birth;
         if (data.place_of_birth !== undefined) user.place_of_birth = data.place_of_birth;
         if (data.gender !== undefined) user.gender = data.gender;
         if (data.ethnicity !== undefined) user.ethnicity = data.ethnicity;
         if (data.cccd_issue_date !== undefined) user.cccd_issue_date = data.cccd_issue_date;
         if (data.permanent_address !== undefined) user.permanent_address = data.permanent_address;
         if (data.temporary_address !== undefined) user.temporary_address = data.temporary_address;
         if (data.hometown !== undefined) user.hometown = data.hometown;
         
         if (data.password) {
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
            must_change_password: false,
        });

        const saved = await this.userRepository.save(admin);
        const {password: _, ...rest} = saved;
        return rest as User;
    }
}
