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
        const identifier = body.username || body.email;
        return this.authService.resetPasswordToDefault(identifier);
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
