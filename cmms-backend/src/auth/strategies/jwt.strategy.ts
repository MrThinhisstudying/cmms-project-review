import {ConfigService} from '@nestjs/config';
import {Injectable} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {Strategy, ExtractJwt} from 'passport-jwt';
import {AuthService} from '../auth.service';
import {User} from '../../user/user.entity';
import {JwtPayload} from '../interfaces/jwt-payload.interface';
import {ClsService} from 'nestjs-cls';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
        private readonly cls: ClsService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.get('JWT_SECRET'),
            ignoreExpiration: false,
            passReqToCallback: false,
        });
    }

    async validate(payload: JwtPayload): Promise<User> {
        const user = await this.authService.verifyPayload(payload);
        if (user) {
            this.cls.set('audit.userId', user.user_id);
        }
        return user;
    }
}
