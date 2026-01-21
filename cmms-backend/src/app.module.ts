import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {ScheduleModule} from '@nestjs/schedule';
import {MailerModule} from '@nestjs-modules/mailer';
import {ClsModule} from 'nestjs-cls';
import {AuditInterceptor} from './audit-log/interceptors/audit.interceptor';

// Controllers & Services
import {AppController} from './app.controller';
import {AppService} from './app.service';

// Custom Modules
import {AuthModule} from './auth/auth.module';
import {DatabaseModule} from './database/database.module';
import {UserModule} from './user/user.module';
import {DevicesModule} from './devices/devices.module';
import {DepartmentModule} from './departments/departments.module';
import {MaintenanceModule} from './maintenance/maintenance.module'; // Chỉ giữ lại dòng này
import {NotificationModule} from './notification/notification.module';
import {AuditModule} from './audit-log/audit-log.module';
import {MaintenanceTicketModule} from './maintenance-ticket/maintenance-ticket.module';
import {InventoryCategoryModule} from './inventory_category/inventory-category.module';
import {InventoryItemModule} from './inventory_item/inventory-item.module';
import {InventoryTransactionModule} from './inventory_transaction/inventory-transaction.module';
import {StockOutModule} from './stock-out/stock-out.module';
import {RepairsModule} from './repairs/repairs.module';
import {DeviceGroupsModule} from './device-groups/device-groups.module';
import {ReportModule} from './report/report.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        MailerModule.forRoot({
            transport: {
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            },
            defaults: {
                from: '"CON DAO AIRPORT" <no-reply@gmail.com>',
            },
        }),
        ClsModule.forRoot({
            global: true,
            middleware: {mount: true},
        }),
        ScheduleModule.forRoot(),
        DatabaseModule,
        AuthModule,
        UserModule,
        DevicesModule,
        DepartmentModule,
        MaintenanceModule,
        NotificationModule,
        AuditModule,
        MaintenanceTicketModule,
        InventoryCategoryModule,
        InventoryItemModule,
        InventoryTransactionModule,
        StockOutModule,
        RepairsModule,
        DeviceGroupsModule,
        ReportModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: 'APP_INTERCEPTOR',
            useClass: AuditInterceptor,
        },
    ],
})
export class AppModule {}

