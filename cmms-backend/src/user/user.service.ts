import {Injectable, NotFoundException, InternalServerErrorException, BadRequestException, HttpException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository, FindOneOptions} from 'typeorm';
import {User} from './user.entity';
import {CreateUserDto} from './dto/user-create.dto';
import {Department} from 'src/departments/department.entity';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async findAll(): Promise<{result: User[]}> {
        try {
            const users = await this.userRepository.find({
                order: {
                    updated_at: 'DESC',
                },
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
            role: 'admin',
            citizen_identification_card: '',
            status: 'active',
            avatar: '',
        });

        const saved = await this.userRepository.save(admin);
        const {password: _, ...rest} = saved;
        return rest as User;
    }
}
