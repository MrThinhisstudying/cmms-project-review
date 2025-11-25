import './polyfills';
import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import compression from 'compression';
import {AppModule} from './app.module';
import {setupAuth} from './setup-auth';
import {setupSwagger} from './setup-swagger';
import {ValidationPipe} from '@nestjs/common';
import bodyParser from 'body-parser';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.use(bodyParser.json({limit: '20mb'}));
    app.use(bodyParser.urlencoded({limit: '20mb', extended: true}));
    app.use(compression());
    app.setGlobalPrefix('api');
    app.enableCors();
    app.useGlobalPipes(new ValidationPipe());

    setupAuth(app);

    if (process.env.API_DOCS) {
        setupSwagger(app);
    }

    await app.listen(process.env.PORT || 3000);
}
bootstrap();
