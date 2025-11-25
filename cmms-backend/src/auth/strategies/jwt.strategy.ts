import {ConfigService} from '@nestjs/config';
import {Injectable} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {Strategy, ExtractJwt} from 'passport-jwt';
import {AuthService} from '../auth.service';
import {User} from '../../user/user.entity';
import {JwtPayload} from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.get('JWT_SECRET'),
            ignoreExpiration: false,
            passReqToCallback: false,
        });
    }

    async validate(payload: JwtPayload): Promise<User> {
        return await this.authService.verifyPayload(payload);
    }
}
