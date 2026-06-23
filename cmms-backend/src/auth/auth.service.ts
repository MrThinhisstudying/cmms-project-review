import {BadRequestException, Injectable, NotFoundException, UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {User} from '../user/user.entity';
import {JwtPayload} from './interfaces/jwt-payload.interface';
import {UserService} from '../user/user.service';
import {SignIn} from './dto/sign-in.dto';
import * as crypto from 'crypto';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) {}

    async signIn(signIn: SignIn) {
        const {email, password} = signIn;

        if (!email || !password || email.trim() === '' || password.trim() === '') {
            throw new UnauthorizedException('Please enter your email/password');
        }

        let user: User;

        try {
            user = await this.userService.findOneSignup({
                where: {email},
                relations: ['department'],
            });

            if (!user || !(await user.checkPassword(password))) {
                throw new UnauthorizedException('Please check your email/password again');
            }
        } catch (err) {
            
            throw new UnauthorizedException('Please check your email/password again');
        }

        delete user.password;
        const departmentPermissions = user.department?.permissions || [];

        const payload = {
            email: user.email,
            sub: user.name,
            id: user.user_id,
            role: user.role,
            department: {
                id: user.department?.dept_id,
                name: user.department?.name,
            },
            position: user.position,
            avatar: user.avatar,
            status: user.status,
            permissions: departmentPermissions,
            signature_url: user.signature_url,
            mustChangePassword: user.must_change_password,
        };

        return {
            accessToken: this.jwtService.sign(payload),
        };
    }

    async verifyPayload(payload: JwtPayload): Promise<User> {
        let user: User;

        try {
            user = await this.userService.findOneSignup({
                where: {email: payload.email},
                relations: ['department', 'user_departments', 'user_departments.department'],
            });
        } catch (error) {
            throw new UnauthorizedException(`Không có người dùng nào có email:: ${payload.email}`);
        }
        delete user.password;

        return user;
    }

    async generateResetToken(email: string) {
        const user = await this.userRepository.findOne({where: {email}});
        if (!user) throw new NotFoundException('Email không tồn tại');

        const token = crypto.randomBytes(32).toString('hex');
        user.reset_token = token;
        user.reset_token_expiry = new Date(Date.now() + 15 * 60 * 1000);
        await this.userRepository.update(user.user_id, {
            reset_token: token,
            reset_token_expiry: new Date(Date.now() + 15 * 60 * 1000),
        });

        return token;
    }

    async resetPassword(token: string, newPassword: string) {
        const user = await this.userRepository.findOne({where: {reset_token: token}});
        if (!user || !user.reset_token_expiry || user.reset_token_expiry < new Date()) {
            throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
        }

        user.password = newPassword;
        user.reset_token = null;
        user.reset_token_expiry = null;
        await this.userRepository.save(user);

        return {message: 'Đổi mật khẩu thành công'};
    }

    async changePasswordFirstLogin(userId: number, data: any) {
        const {currentPassword, newPassword, confirmNewPassword} = data;
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            throw new BadRequestException('Vui lòng điền đầy đủ các thông tin mật khẩu');
        }
        if (newPassword !== confirmNewPassword) {
            throw new BadRequestException('Mật khẩu mới và mật khẩu xác nhận không khớp');
        }

        const user = await this.userRepository.findOne({
            where: {user_id: userId},
            relations: ['department'],
        });
        if (!user) {
            throw new NotFoundException('Người dùng không tồn tại');
        }

        // Verify current password
        const isMatch = await user.checkPassword(currentPassword);
        if (!isMatch) {
            throw new BadRequestException('Mật khẩu hiện tại không chính xác');
        }

        // Check if the new password is same as default password
        if (newPassword === 'Vcs@123456' || newPassword === '12345678') {
            throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu mặc định');
        }

        if (newPassword.length < 6) {
            throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự');
        }

        user.password = newPassword;
        user.must_change_password = false;
        await this.userRepository.save(user);

        // Generate new token
        delete user.password;
        const departmentPermissions = user.department?.permissions || [];

        const payload = {
            email: user.email,
            sub: user.name,
            id: user.user_id,
            role: user.role,
            department: {
                id: user.department?.dept_id,
                name: user.department?.name,
            },
            position: user.position,
            avatar: user.avatar,
            status: user.status,
            permissions: departmentPermissions,
            signature_url: user.signature_url,
            mustChangePassword: false,
        };

        return {
            accessToken: this.jwtService.sign(payload),
        };
    }
}
