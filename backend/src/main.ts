import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AuthService } from './modules/auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('WhatsApp Gateway API')
    .setDescription('Wablas-compatible WhatsApp Gateway with AI CS')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'Authorization', in: 'header' }, 'token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const authService = app.get(AuthService);
  const hasUser = await authService.hasAnyUser();
  if (!hasUser) {
    await authService.createSuperadmin('admin@localhost', 'admin123');
    console.log('👤 Default superadmin created: admin@localhost / admin123 (segera ganti password!)');
  }

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`🚀 WhatsApp Gateway running on http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/docs`);
}

bootstrap();
