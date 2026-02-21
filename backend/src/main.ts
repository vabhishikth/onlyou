import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { execSync } from 'child_process';
import { AppModule } from './app.module';

function killPortHolder(port: number | string) {
    try {
        const output = execSync('netstat -ano', { encoding: 'utf8' });
        const regex = new RegExp(`\\s+0\\.0\\.0\\.0:${port}\\s+.*LISTENING\\s+(\\d+)`);
        const match = output.match(regex);
        if (match) {
            const pid = match[1];
            // Don't kill ourselves
            if (Number(pid) !== process.pid) {
                console.log(`[bootstrap] Port ${port} held by PID ${pid} — killing it`);
                execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
                // Brief pause for OS to release the port
                execSync('ping -n 2 127.0.0.1 > NUL', { stdio: 'ignore' });
            }
        }
    } catch {
        // Silently ignore — port may already be free
    }
}

async function bootstrap() {
    const port = process.env.PORT || 4000;

    // Kill any stale process holding the port before listening
    killPortHolder(port);

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

    await app.listen(port, '0.0.0.0');

    console.log(`Onlyou API running at http://localhost:${port}/graphql`);
}

bootstrap();
