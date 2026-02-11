import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS for mobile and web clients
    app.enableCors({
        origin: true, // Allow all origins in development
        credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
        }),
    );

    const port = process.env.PORT || 4000;
    await app.listen(port, '0.0.0.0');

    console.log(`🚀 Onlyou API running at http://localhost:${port}/graphql`);
}

bootstrap();
