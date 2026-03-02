/**
 * ⚠️ FILE NÀY ĐÃ NGƯNG SỬ DỤNG ⚠️
 * 
 * Lý do: Hệ thống đã chuyển sang lưu trữ Checklist dưới dạng JSON (trong MaintenanceChecklistTemplate).
 * Các Entity cũ (MaintenanceChecklistItem, MaintenanceChecklistCategory) đã bị loại bỏ.
 * 
 * Script này được giữ lại chỉ để tham khảo lịch sử.
 */

// import { DataSource } from 'typeorm';
// import { MaintenanceChecklistItem } from './src/maintenance/entities/maintenance-checklist-item.entity';
// import { MaintenanceChecklistCategory } from './src/maintenance/entities/maintenance-checklist-category.entity';
// import { MaintenanceChecklistTemplate } from './src/maintenance/entities/maintenance-checklist-template.entity';
// import * as dotenv from 'dotenv';
// dotenv.config();

// const AppDataSource = new DataSource({
//     type: 'postgres',
//     host: process.env.DB_HOST || 'localhost',
//     port: parseInt(process.env.DB_PORT) || 5432,
//     username: process.env.DB_USERNAME || 'postgres',
//     password: process.env.DB_PASSWORD || 'postgres',
//     database: process.env.DB_NAME || 'cmms_db',
//     entities: [MaintenanceChecklistTemplate, MaintenanceChecklistCategory, MaintenanceChecklistItem],
//     synchronize: false,
// });

// async function checkCodes() {
//     await AppDataSource.initialize();
//     console.log("DB Connected.");

//     // const items = await AppDataSource.getRepository(MaintenanceChecklistItem)
//     //     .createQueryBuilder('item')
//     //     .leftJoinAndSelect('item.category', 'category')
//     //     .leftJoinAndSelect('category.template', 'template')
//     //     .orderBy('item.created_at', 'DESC')
//     //     .limit(10)
//     //     .getMany();

//     // console.log("--- LATEST 10 IMPORTED ITEMS ---");
//     // items.forEach(item => {
//     //     console.log(`ID: ${item.id} | Code: "${item.code}" | Task: ${item.task.substring(0, 20)}... | Template: ${item.category?.template?.name}`);
//     // });

//     await AppDataSource.destroy();
// }

// checkCodes();
