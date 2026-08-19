import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProfessionalDto) {
    const existing = await this.prisma.professional.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Este link personalizado já está em uso por outra profissional.');
    }

    return this.prisma.professional.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        instagram: dto.socialMedia?.instagram,
        facebook: dto.socialMedia?.facebook,
      },
    });
  }

  async findAll() {
    return this.prisma.professional.findMany({
      include: {
        services: { where: { isActive: true } },
        availabilities: { where: { isActive: true } },
      },
    });
  }

  async findOneById(id: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      include: {
        services: { where: { isActive: true } },
        availabilities: { where: { isActive: true } },
        user: true,
      },
    });
    if (!professional) {
      throw new NotFoundException(`Profissional com ID ${id} não encontrada.`);
    }
    return professional;
  }

  async findOneBySlug(slug: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { slug },
      include: {
        services: { where: { isActive: true }, orderBy: { name: 'asc' } },
        availabilities: { where: { isActive: true }, orderBy: { dayOfWeek: 'asc' } },
      },
    });
    if (!professional) {
      throw new NotFoundException(`A página da profissional "${slug}" não foi encontrada.`);
    }
    return professional;
  }

  async update(id: string, dto: Partial<CreateProfessionalDto>) {
    const existing = await this.prisma.professional.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Profissional com ID ${id} não encontrada.`);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.prisma.professional.findUnique({ where: { slug: dto.slug } });
      if (slugExists) {
        throw new ConflictException('Este link personalizado já está em uso.');
      }
    }

    return this.prisma.professional.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        instagram: dto.socialMedia?.instagram,
        facebook: dto.socialMedia?.facebook,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.professional.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Profissional com ID ${id} não encontrada.`);
    }
    return this.prisma.professional.delete({ where: { id } });
  }
}