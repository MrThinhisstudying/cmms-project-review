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
        };

        return {
            accessToken: this.jwtService.sign(payload),
        };
    }

    async verifyPayload(payload: JwtPayload): Promise<User> {
        let user: User;

        try {
            user = await this.userService.findOne({
                where: {email: payload.email},
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
}
