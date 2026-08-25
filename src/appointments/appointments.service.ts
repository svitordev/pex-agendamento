import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto) {
    const appointmentDate = new Date(dto.dateTime);

    if (appointmentDate < new Date()) {
      throw new BadRequestException(
        'Não é possível agendar em uma data passada.',
      );
    }

    const professional = await this.prisma.professional.findUnique({
      where: { id: dto.professionalId },
    });
    if (!professional) {
      throw new NotFoundException(
        `Profissional com ID ${dto.professionalId} não encontrada.`,
      );
    }

    const service = await this.prisma.service.findFirst({
      where: {
        id: dto.serviceId,
        professionalId: dto.professionalId,
        isActive: true,
      },
    });

    if (!service) {
      throw new NotFoundException(
        'Serviço não encontrado ou não pertence a este profissional.',
      );
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
      throw new BadRequestException(
        'A profissional não atende neste dia da semana.',
      );
    }

    const [startH, startM] = availability.startTime.split(':').map(Number);
    const [endH, endM] = availability.endTime.split(':').map(Number);
    const workStart = new Date(appointmentDate);
    workStart.setHours(startH, startM, 0, 0);
    const workEnd = new Date(appointmentDate);
    workEnd.setHours(endH, endM, 0, 0);

    const endTime = new Date(
      appointmentDate.getTime() + service.durationMinutes * 60000,
    );

    if (
      appointmentDate < workStart ||
      appointmentDate >= workEnd ||
      endTime > workEnd
    ) {
      throw new BadRequestException(
        'O horário solicitado está fora do expediente ou o serviço ultrapassa o horário de atendimento.',
      );
    }

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

  async findAvailableSlots(
    dateString: string,
    professionalId: string,
    serviceId: string,
  ) {
    if (!dateString || !professionalId || !serviceId) {
      throw new BadRequestException(
        'Data, profissional e serviço são obrigatórios.',
      );
    }

    /*
     * Verifica se o serviço existe
     * e se pertence ao profissional.
     */
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        professionalId,
        isActive: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Serviço não encontrado ou indisponível.');
    }

    /*
     * Usa 12:00 para evitar problemas de mudança
     * de dia durante a criação da data.
     */
    const targetDate = new Date(`${dateString}T12:00:00`);

    if (Number.isNaN(targetDate.getTime())) {
      throw new BadRequestException('Data inválida.');
    }

    const dayOfWeek = targetDate.getDay();

    /*
     * Verifica expediente.
     */
    const availability = await this.prisma.availability.findUnique({
      where: {
        professionalId_dayOfWeek: {
          professionalId,
          dayOfWeek,
        },
      },
    });

    if (!availability || !availability.isActive) {
      return {
        available: false,
        slots: [],
        message: 'Profissional não atende neste dia.',
      };
    }

    const [startH, startM] = availability.startTime.split(':').map(Number);

    const [endH, endM] = availability.endTime.split(':').map(Number);

    /*
     * Início do expediente.
     */
    const workStart = new Date(targetDate);

    workStart.setHours(startH, startM, 0, 0);

    /*
     * Fim do expediente.
     */
    const workEnd = new Date(targetDate);

    workEnd.setHours(endH, endM, 0, 0);

    /*
     * Agendamentos existentes.
     */
    const bookedAppointments = await this.prisma.appointment.findMany({
      where: {
        professionalId,

        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },

        date: {
          gte: new Date(`${dateString}T00:00:00`),

          lte: new Date(`${dateString}T23:59:59.999`),
        },
      },

      include: {
        service: true,
      },
    });

    const slots: {
      time: string;
      available: boolean;
    }[] = [];

    const now = new Date();

    /*
     * Como estamos buscando horários para um
     * serviço específico, usamos a duração
     * daquele serviço.
     */
    const intervalMinutes = service.durationMinutes;

    let current = new Date(workStart);

    while (current < workEnd) {
      /*
       * Horário em que o serviço terminaria.
       */
      const slotEnd = new Date(
        current.getTime() + service.durationMinutes * 60 * 1000,
      );

      /*
       * Serviço precisa terminar antes ou
       * exatamente no fim do expediente.
       */
      if (slotEnd > workEnd) {
        break;
      }

      /*
       * Não disponibiliza horários passados.
       */
      const isPast = current <= now;

      /*
       * Verifica conflito com qualquer
       * agendamento existente.
       */
      const isBooked = bookedAppointments.some((booked) => {
        const bookedEnd = new Date(
          booked.date.getTime() + booked.service.durationMinutes * 60 * 1000,
        );

        return current < bookedEnd && slotEnd > booked.date;
      });

      slots.push({
        time: current.toTimeString().substring(0, 5),

        available: !isPast && !isBooked,
      });

      /*
       * Próximo horário.
       */
      current = new Date(current.getTime() + intervalMinutes * 60 * 1000);
    }

    return {
      available: slots.some((slot) => slot.available),

      slots,

      service: {
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
      },
    };
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
    if (!appointment)
      throw new NotFoundException(`Agendamento ${id} não encontrado.`);
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
    /*
     * Remove espaços, +, (, ), -
     */
    const normalizedPhone = phone.replace(/\D/g, '');

    if (!normalizedPhone || normalizedPhone.length < 10) {
      throw new BadRequestException('Telefone inválido.');
    }

    /*
     * Remove o código 55 quando presente.
     *
     * 5581999999999
     * vira
     * 81999999999
     */
    const localPhone =
      normalizedPhone.startsWith('55') && normalizedPhone.length > 11
        ? normalizedPhone.substring(2)
        : normalizedPhone;

    /*
     * endsWith é melhor neste caso.
     *
     * Encontra tanto:
     *
     * 81999999999
     * 5581999999999
     * +5581999999999 (caso esteja assim no banco)
     */
    const customer = await this.prisma.customer.findFirst({
      where: {
        OR: [
          {
            phone: normalizedPhone,
          },
          {
            phone: localPhone,
          },
          {
            phone: `55${localPhone}`,
          },
          {
            phone: {
              endsWith: localPhone,
            },
          },
        ],
      },
    });

    console.log('Telefone recebido:', phone);

    console.log('Telefone normalizado:', normalizedPhone);

    console.log('Telefone local:', localPhone);

    console.log('Cliente encontrado:', customer);

    if (!customer) {
      throw new NotFoundException(
        'Nenhum cliente encontrado para este telefone.',
      );
    }

    const appointments = await this.prisma.appointment.findMany({
      where: {
        customerId: customer.id,
      },

      include: {
        professional: true,
        service: true,
        customer: true,
      },

      orderBy: {
        date: 'desc',
      },
    });

    console.log('Agendamentos encontrados:', appointments.length);

    return appointments;
  }

  async updateStatus(id: string, status: string) {
    const validStatuses = [
      'PENDING',
      'CONFIRMED',
      'CANCELLED',
      'COMPLETED',
      'NO_SHOW',
    ];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Status inválido.');
    }
    return this.prisma.appointment.update({
      where: { id },
      data: { status: status as AppointmentStatus },
    });
  }
  async cleanup(professionalId: string) {
    if (!professionalId) {
      throw new BadRequestException('Profissional não identificado.');
    }

    const now = new Date();

    /*
     * Precisamos buscar a duração do serviço,
     * pois somente appointment.date não informa
     * quando o atendimento realmente termina.
     */
    const appointments = await this.prisma.appointment.findMany({
      where: {
        professionalId,
      },
      include: {
        service: {
          select: {
            durationMinutes: true,
          },
        },
      },
    });

    const appointmentsToDelete = appointments.filter((appointment) => {
      /*
       * Cancelados podem ser excluídos
       * independentemente da data.
       */
      if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
        return true;
      }

      /*
       * Calcula quando o atendimento terminou.
       */
      const appointmentEnd = new Date(
        appointment.date.getTime() +
          appointment.service.durationMinutes * 60 * 1000,
      );

      return appointmentEnd <= now;
    });

    const ids = appointmentsToDelete.map((appointment) => appointment.id);

    if (ids.length === 0) {
      return {
        count: 0,
        deletedIds: [],
        message: 'Nenhum agendamento para limpar.',
      };
    }

    const result = await this.prisma.appointment.deleteMany({
      where: {
        id: {
          in: ids,
        },

        /*
         * Segurança extra:
         * garante novamente que pertencem
         * ao profissional autenticado.
         */
        professionalId,
      },
    });

    return {
      count: result.count,
      deletedIds: ids,
      message: `${result.count} agendamento(s) removido(s).`,
    };
  }
  async cancelPublic(id: string, phone: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: {
        id,
      },

      include: {
        customer: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    /*
     * Normaliza o telefone informado.
     */
    const normalizePhone = (value: string) => {
      const digits = value.replace(/\D/g, '');

      if (digits.startsWith('55') && digits.length >= 12) {
        return digits.substring(2);
      }

      return digits;
    };

    const informedPhone = normalizePhone(phone);

    const customerPhone = normalizePhone(appointment.customer.phone);

    /*
     * O agendamento precisa pertencer
     * ao telefone informado.
     */
    if (informedPhone !== customerPhone) {
      throw new NotFoundException(
        'Agendamento não encontrado para este telefone.',
      );
    }

    /*
     * Somente estes status podem ser
     * cancelados pelo cliente.
     */
    if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) {
      throw new BadRequestException(
        'Este agendamento não pode mais ser cancelado.',
      );
    }

    /*
     * Não permite cancelar algo
     * que já começou.
     */
    if (appointment.date <= new Date()) {
      throw new BadRequestException(
        'Não é possível cancelar um agendamento que já iniciou.',
      );
    }

    return this.prisma.appointment.update({
      where: {
        id,
      },

      data: {
        status: 'CANCELLED',
      },
    });
  }
}
