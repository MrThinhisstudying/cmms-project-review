import {Injectable} from '@nestjs/common';
import {TypeOrmOptionsFactory, TypeOrmModuleOptions} from '@nestjs/typeorm';
import {AppDataSource} from '../data-source';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
    createTypeOrmOptions(): TypeOrmModuleOptions {
        return {
            ...AppDataSource.options,
            autoLoadEntities: true,
        };
    }
}
