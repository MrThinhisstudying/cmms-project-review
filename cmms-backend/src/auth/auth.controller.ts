import {ApiTags} from '@nestjs/swagger';
import {Body, Controller, HttpCode, HttpStatus, Post, UseGuards} from '@nestjs/common';
import {AuthService} from './auth.service';
import {SignIn} from './dto/sign-in.dto';
import {MailerService} from '@nestjs-modules/mailer';
import {ResetPasswordDto} from './dto/reset-password.dto';
import {ForgotPasswordDto} from './dto/forgot-password.dto';
import {JWTAuthGuard} from './guards/jwt-auth.guard';
import {CurrentUser} from './current-user.decorator';
import {User} from '../user/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService, private readonly mailService: MailerService) {}

    @Post('signIn')
    @HttpCode(HttpStatus.OK)
    async signIn(@Body() signIn: SignIn) {
        return this.authService.signIn(signIn);
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() body: ForgotPasswordDto) {
        const token = await this.authService.generateResetToken(body.email);

        const resetLink = `${process.env.FE_URL}dat_lai_mat_khau?token=${token}`;

        await this.mailService.sendMail({
            to: body.email,
            subject: '🔑 Đặt lại mật khẩu của bạn',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
                    border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px; 
                    background-color: #fafafa; color: #333;">
            <h2 style="color: #2c3e50; text-align: center;">
                Yêu cầu đặt lại mật khẩu
            </h2>
            <p style="font-size: 15px; line-height: 1.6;">
                Xin chào, chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
            </p>
            <p style="font-size: 15px; line-height: 1.6;">
                Vui lòng bấm vào nút bên dưới để đặt lại mật khẩu mới:
            </p>
            
            <div style="text-align: center; margin: 24px 0;">
                <a href="${resetLink}"
                   style="display: inline-block; background-color: #007bff; color: #fff; 
                          padding: 12px 24px; border-radius: 8px; text-decoration: none; 
                          font-weight: bold; font-size: 16px;">
                    🔒 Đặt lại mật khẩu
                </a>
            </div>
            
            <p style="font-size: 14px; color: #555;">
                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="font-size: 12px; color: #888; text-align: center;">
                Email này được gửi tự động, vui lòng không trả lời.
            </p>
        </div>
        `,
        });

        return {message: 'Vui lòng kiểm tra email của bạn để đặt lại mật khẩu'};
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body.token, body.newPassword);
    }

    @Post('change-password-first-login')
    @UseGuards(JWTAuthGuard)
    @HttpCode(HttpStatus.OK)
    async changePasswordFirstLogin(@CurrentUser() user: User, @Body() body: any) {
        return this.authService.changePasswordFirstLogin(user.user_id, body);
    }
}
