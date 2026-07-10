// src/professionals/professionals.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProfessionalDto } from './dto/create-professional.dto';

@Injectable()
export class ProfessionalsService {
  private professionals = [
    {
      id: 'nann1naf',
      slug: 'jessicasantana', // 💡 O link amigável que ela vai enviar para os clientes
      name: 'Jessica Santana',
      bio: 'Especialista em Alongamento em Gel e Nail Art.',
      avatarUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de215f',
      socialMedia: {
        instagram: 'https://instagram.com/studiojessicasantanaa',
      },
    },
  ];

  create(dto: CreateProfessionalDto) {
    const slugExists = this.professionals.some((p) => p.slug === dto.slug);
    if (slugExists) {
      throw new ConflictException(
        'Este link personalizado já está em uso por outra profissional.',
      );
    }

    const newProfessional = {
      id: Math.random().toString(36).substring(2, 12),
      ...dto,
    };
    this.professionals.push(newProfessional);
    return newProfessional;
  }

  findAll() {
    return this.professionals;
  }

  // 💡 Busca interna/administrativa (Pelo ID em formato String)
  findOneById(id: string) {
    const professional = this.professionals.find((p) => p.id === id);
    if (!professional) {
      throw new NotFoundException(`Profissional com ID ${id} não encontrada.`);
    }
    return professional;
  }

  // 💡 Busca pública para os clientes (Pelo Slug do link)
  findOneBySlug(slug: string) {
    const professional = this.professionals.find((p) => p.slug === slug);
    if (!professional) {
      throw new NotFoundException(
        `A página da profissional "${slug}" não foi encontrada.`,
      );
    }
    return professional;
  }
}
