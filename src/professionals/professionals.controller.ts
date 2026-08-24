// src/professionals/professionals.controller.ts
import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('professionals')
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

  // Rota pública: GET /professionals/slug/mayarasilva
  @Get('slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.professionalsService.findOneBySlug(slug);
  }

  // Rota protegida: GET /professionals/:id
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.professionalsService.findOneById(id);
  }

  // PATCH /professionals/:id/profile - Atualizar perfil (bio, nome, instagram, cores, etc)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/profile')
  updateProfile(
    @Param('id') id: string,
    @Body() dto: {
      name?: string;
      bio?: string;
      avatarUrl?: string;
      instagram?: string;
      facebook?: string;
      themeColors?: Record<string, string>;
    },
  ) {
    return this.professionalsService.updateProfile(id, dto);
  }
}