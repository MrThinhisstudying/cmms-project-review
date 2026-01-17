import 'reflect-metadata';
import {DataSource} from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [process.env.NODE_ENV === 'test' ? 'src/**/*.entity.ts' : 'dist/**/*.entity.js'],
migrations: [], 
    
    // Logic cũ (tạm thời bỏ qua hoặc comment lại)
    // migrations: [process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' 
    //    ? 'src/migrations/*.ts'
    //    : 'dist/migrations/*.js'
    // ],
    synchronize: true,
    ssl: process.env.SSL_MODE === 'require' ? {rejectUnauthorized: false} : false,
});
