import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { execSync } from 'child_process';
import { AppModule } from './app.module';

function killPortHolder(port: number | string) {
    try {
        const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
            encoding: 'utf8',
        });
        // Match any line with our port in LISTENING state — extract PID (last number on line)
        const lines = output.trim().split('\n');
        for (const line of lines) {
            const pidMatch = line.match(/LISTENING\s+(\d+)/);
            if (pidMatch) {
                const pid = Number(pidMatch[1]);
                if (pid !== process.pid) {
                    console.log(`[bootstrap] Port ${port} held by PID ${pid} — killing it`);
                    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
                    execSync('ping -n 2 127.0.0.1 > NUL', { stdio: 'ignore' });
                }
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
