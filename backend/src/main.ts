import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

// Light-weight pure Node.js env loader to prevent port-binding race conditions during bootstrap
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts
          .slice(1)
          .join('=')
          .trim()
          .replace(/(^"|"$)/g, '');
        if (key) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Enable CORS to allow the Next.js frontend (port 3000) to fetch API data from port 3001
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
