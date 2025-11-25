import {ConfigService, ConfigModule} from '@nestjs/config';
import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import type {JwtModuleOptions} from '@nestjs/jwt';
import {PassportModule} from '@nestjs/passport';
import {TypeOrmModule} from '@nestjs/typeorm';

import {UserModule} from '../user/user.module';
import {AuthController} from './auth.controller';
import {AuthService} from './auth.service';
import {SessionSerializer} from './session.serializer';
import {JwtStrategy} from './strategies/jwt.strategy';
import {User} from 'src/user/user.entity';
import {JWTAuthGuard} from './guards/jwt-auth.guard';
import {PermissionsGuard} from './guards/permissions.guard';

@Module({
    imports: [
        ConfigModule,
        UserModule,
        TypeOrmModule.forFeature([User]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (env: ConfigService): Promise<JwtModuleOptions> => ({
                secret: env.get('JWT_SECRET'),
                signOptions: {
                    expiresIn: '1095d',
                    algorithm: 'HS384',
                },
                verifyOptions: {
                    algorithms: ['HS384'],
                },
            }),
            inject: [ConfigService],
        }),
        PassportModule.register({defaultStrategy: 'web3'}),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, SessionSerializer, JWTAuthGuard, PermissionsGuard],
    exports: [PassportModule, JWTAuthGuard, PermissionsGuard],
})
export class AuthModule {}
