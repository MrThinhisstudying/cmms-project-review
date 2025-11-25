import {IsEmailAvailable} from './constraints/is-email-available.validator';
import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {User} from './user.entity';
import {UserService} from './user.service';
import {UserController} from './user.controller';

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    providers: [UserService, IsEmailAvailable],
    exports: [UserService],
    controllers: [UserController],
})
export class UserModule {}
