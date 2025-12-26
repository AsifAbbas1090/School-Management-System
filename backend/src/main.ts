import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'], // Only log errors, warnings, and info
    });

    // Enable CORS for frontend
    const allowedOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174',
        ];

    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          // In development, allow all origins
          if (process.env.NODE_ENV !== 'production') {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      exposedHeaders: ['Authorization'],
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    // API prefix
    app.setGlobalPrefix('api');

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('Multi-School Management System API')
      .setDescription('Production-grade backend API for multi-school management')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`🚀 Application is running on: http://localhost:${port}`);
    console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  } catch (error) {
    console.error('Failed to start application:', error.message);
    if (error.message?.includes('database') || error.message?.includes('Prisma')) {
      console.error('\n⚠️  Database connection failed. Please check your DATABASE_URL in .env file.');
      console.error('The backend requires a valid PostgreSQL database connection to start.');
    }
    process.exit(1);
  }
}

bootstrap();

