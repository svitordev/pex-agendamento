// src/professionals/professionals.controller.ts
import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';

@Controller('professionals') // Rota: http://localhost:3000/professionals
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  create(@Body() createProfessionalDto: CreateProfessionalDto) {
    return this.professionalsService.create(createProfessionalDto);
  }

  @Get()
  getAll() {
    return this.professionalsService.findAll();
  }

  // 💡 Rota para a página pública: GET /professionals/slug/mayarasilva
  @Get('slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.professionalsService.findOneBySlug(slug);
  }

  // 💡 Rota para o painel administrativo: GET /professionals/jhwah1huh2
  @Get(':id')
  getById(@Param('id') id: string) {
    // Removido o sinal de "+" porque agora o ID é string
    return this.professionalsService.findOneById(id);
  }
}
