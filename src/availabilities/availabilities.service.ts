import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Injectable()
export class AvailabilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAvailabilityDto) {
    const professional = await this.prisma.professional.findUnique({
      where: { id: dto.professionalId },
    });
    if (!professional) {
      throw new NotFoundException(`Profissional com ID ${dto.professionalId} não encontrada.`);
    }

    return this.prisma.availability.upsert({
      where: {
        professionalId_dayOfWeek: {
          professionalId: dto.professionalId,
          dayOfWeek: dto.dayOfWeek,
        },
      },
      update: { startTime: dto.startTime, endTime: dto.endTime, isActive: dto.isActive ?? true },
      create: { ...dto },
    });
  }

  async findAllByProfessional(professionalId: string) {
    const professional = await this.prisma.professional.findUnique({ where: { id: professionalId } });
    if (!professional) {
      throw new NotFoundException(`Profissional com ID ${professionalId} não encontrada.`);
    }

    return this.prisma.availability.findMany({
      where: { professionalId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async findOne(id: string) {
    const availability = await this.prisma.availability.findUnique({ where: { id } });
    if (!availability) {
      throw new NotFoundException(`Disponibilidade com ID ${id} não encontrada.`);
    }
    return availability;
  }

  async update(id: string, dto: UpdateAvailabilityDto) {
    await this.findOne(id);
    return this.prisma.availability.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.availability.delete({ where: { id } });
  }

  // Obtém intervalos de um dia para cálculo de slots disponíveis
  async getWorkingHours(professionalId: string, dayOfWeek: number) {
    return this.prisma.availability.findUnique({
      where: { professionalId_dayOfWeek: { professionalId, dayOfWeek } },
    });
  }
}