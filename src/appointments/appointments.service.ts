import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto) {
    const appointmentDate = new Date(dto.dateTime);

    if (appointmentDate < new Date()) {
      throw new BadRequestException('Não é possível agendar em uma data passada.');
    }

    const professional = await this.prisma.professional.findUnique({
      where: { id: dto.professionalId },
    });
    if (!professional) {
      throw new NotFoundException(`Profissional com ID ${dto.professionalId} não encontrada.`);
    }

    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });
    if (!service) {
      throw new NotFoundException(`Serviço com ID ${dto.serviceId} não encontrado.`);
    }

    const dayOfWeek = appointmentDate.getDay();
    const availability = await this.prisma.availability.findUnique({
      where: {
        professionalId_dayOfWeek: {
          professionalId: dto.professionalId,
          dayOfWeek,
        },
      },
    });
    if (!availability || !availability.isActive) {
      throw new BadRequestException('A profissional não atende neste dia da semana.');
    }

    const [startH, startM] = availability.startTime.split(':').map(Number);
    const [endH, endM] = availability.endTime.split(':').map(Number);
    const workStart = new Date(appointmentDate);
    workStart.setHours(startH, startM, 0, 0);
    const workEnd = new Date(appointmentDate);
    workEnd.setHours(endH, endM, 0, 0);

    if (appointmentDate < workStart || appointmentDate >= workEnd) {
      throw new BadRequestException('O horário solicitado está fora do expediente.');
    }

    const endTime = new Date(appointmentDate.getTime() + service.durationMinutes * 60000);

    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        professionalId: dto.professionalId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: { service: true },
    });

    for (const existing of existingAppointments) {
      const existingEnd = new Date(
        existing.date.getTime() + existing.service.durationMinutes * 60000,
      );
      if (appointmentDate < existingEnd && endTime > existing.date) {
        throw new ConflictException('Este horário já está preenchido.');
      }
    }

    let customer = await this.prisma.customer.findFirst({
      where: { phone: dto.clientWhats },
    });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: { name: dto.clientName, phone: dto.clientWhats },
      });
    }

    return this.prisma.appointment.create({
      data: {
        professionalId: dto.professionalId,
        serviceId: dto.serviceId,
        customerId: customer.id,
        date: appointmentDate,
        status: 'PENDING',
      },
      include: { professional: true, service: true, customer: true },
    });
  }

  async findAvailableSlots(dateString: string, professionalId: string) {
    const targetDate = new Date(`${dateString}T12:00:00`);
    const dayOfWeek = targetDate.getDay();

    const availability = await this.prisma.availability.findUnique({
      where: {
        professionalId_dayOfWeek: { professionalId, dayOfWeek },
      },
    });
    if (!availability || !availability.isActive) {
      return { available: false, slots: [], message: 'Profissional não atende neste dia.' };
    }

    const services = await this.prisma.service.findMany({
      where: { professionalId, isActive: true },
      select: { durationMinutes: true },
    });
    const intervalMinutes =
      services.length > 0 ? Math.min(...services.map((s) => s.durationMinutes)) : 60;

    const [startH, startM] = availability.startTime.split(':').map(Number);
    const [endH, endM] = availability.endTime.split(':').map(Number);

    const bookedSlots = await this.prisma.appointment.findMany({
      where: {
        professionalId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        date: {
          gte: new Date(`${dateString}T00:00:00`),
          lt: new Date(`${dateString}T23:59:59`),
        },
      },
      include: { service: true },
    });

    const slots: any[] = [];
    let current = new Date(targetDate);
    current.setHours(startH, startM, 0, 0);
    const workEnd = new Date(targetDate);
    workEnd.setHours(endH, endM, 0, 0);

    while (current < workEnd) {
      const slotEnd = new Date(current.getTime() + intervalMinutes * 60000);
      const isBooked = bookedSlots.some((booked) => {
        const bookedEnd = new Date(
          booked.date.getTime() + booked.service.durationMinutes * 60000,
        );
        return current < bookedEnd && slotEnd > booked.date;
      });
      slots.push({ time: current.toTimeString().substring(0, 5), available: !isBooked });
      current = slotEnd;
    }

    return { available: true, slots };
  }

  async findAll() {
    return this.prisma.appointment.findMany({
      include: { professional: true, service: true, customer: true },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { professional: true, service: true, customer: true },
    });
    if (!appointment) throw new NotFoundException(`Agendamento ${id} não encontrado.`);
    return appointment;
  }

  async findByProfessional(professionalId: string, date?: string) {
    const where: any = { professionalId };
    if (date) {
      const target = new Date(date);
      where.date = {
        gte: new Date(target.setHours(0, 0, 0, 0)),
        lt: new Date(target.setHours(23, 59, 59, 999)),
      };
    }
    return this.prisma.appointment.findMany({
      where,
      include: { professional: true, service: true, customer: true },
      orderBy: { date: 'asc' },
    });
  }

  async findByPhone(phone: string) {
    // Normalizar telefone (remover caracteres não-numéricos)
    const normalizedPhone = phone.replace(/\D/g, '');
    
    const customer = await this.prisma.customer.findFirst({
      where: {
        phone: {
          startsWith: normalizedPhone.substring(normalizedPhone.length - 10),
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Nenhum agendamento encontrado para este telefone.`);
    }

    return this.prisma.appointment.findMany({
      where: { customerId: customer.id },
      include: { professional: true, service: true, customer: true },
      orderBy: { date: 'desc' },
    });
  }

  async updateStatus(id: string, status: string) {
    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Status inválido.');
    }
    return this.prisma.appointment.update({
      where: { id },
      data: { status: status as AppointmentStatus },
    });
  }
}