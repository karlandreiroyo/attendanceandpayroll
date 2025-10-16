import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Enable CORS so frontend (React) can call backend
  app.enableCors({
    origin: 'http://localhost:5173', // React app URL
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(3000);
  console.log('✅ Backend is running on http://localhost:3000');
}
bootstrap();
