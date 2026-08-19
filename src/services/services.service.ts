import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceDto) {
    // Verifica se o profissional existe
    const professional = await this.prisma.professional.findUnique({
      where: { id: dto.professionalId },
    });
    if (!professional) {
      throw new NotFoundException(`Profissional com ID ${dto.professionalId} não encontrada.`);
    }

    return this.prisma.service.create({
      data: dto,
    });
  }

  async findAllByProfessional(professionalId: string) {
    return this.prisma.service.findMany({
      where: { professionalId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.service.findMany({
      include: {
        professional: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        professional: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(`Serviço com ID ${id} não encontrado.`);
    }

    return service;
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findOne(id);

    return this.prisma.service.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.service.delete({
      where: { id },
    });
  }

  // Buscar serviços ativos com detalhes para cálculo de horários
  async findActiveWithDetails(professionalId: string) {
    return this.prisma.service.findMany({
      where: { professionalId, isActive: true },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        price: true,
        description: true,
      },
    });
  }
}