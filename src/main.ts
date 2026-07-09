import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 💡 ATIVA A VALIDAÇÃO EM TODAS AS ROTAS DA API
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // Remove propriedades do Body que não estão no DTO
    forbidNonWhitelisted: true, // Rejeita a requisição se houver propriedades não permitidas
    transform: true,        // Transforma os tipos primitivos automaticamente (ex: string para number)
  }))
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
