import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  // Simulando uma tabela do banco de dados
  private appointments = [];

  create(dto: CreateAppointmentDto) {
    const appointmentDate = new Date(dto.dateTime);

    // 1. Validação de segurança: Não permitir agendamentos no passado
    if (appointmentDate < new Date()) {
      throw new BadRequestException('Não é possível agendar em uma data passada.');
    }

    // 2. Conflito de horário: Checa se a manicure (professionalId) já tem cliente nesse horário
    const hasConflict = this.appointments.some(
      app => 
        app.professionalId === dto.professionalId && 
        app.dateTime.getTime() === appointmentDate.getTime() &&
        app.status !== 'CANCELED'
    );

    if (hasConflict) {
      // Retorna automaticamente um HTTP 409 (Conflict) se o horário já estiver ocupado
      throw new ConflictException('Este horário já está preenchido para esta profissional.');
    }

    // 3. Salva o agendamento
    const newAppointment = {
      id: this.appointments.length + 1,
      ...dto,
      dateTime: appointmentDate,
      status: 'CONFIRMED',
    };

    this.appointments.push(newAppointment);
    return newAppointment;
  }

  findAvailableSlots(dateString: string, professionalId: number) {
  // 1. Definimos a grade fixa de horários da manicure (ex: das 08h às 12h, 13h às 17h)
  // No futuro, isso virá da tabela "Availability" do banco de dados
  const businessHours = ['08:00', '10:00', '13:00', '15:00',  '17:00'];

  // 2. Filtramos os agendamentos que já existem para este profissional no dia solicitado
  const bookedAppointments = this.appointments.filter(app => {
    const isSameProfessional = app.professionalId === professionalId;
    const isSameDay = app.dateTime.toISOString().startsWith(dateString); // Compara "YYYY-MM-DD"
    const isNotCanceled = app.status !== 'CANCELED';
    
    return isSameProfessional && isSameDay && isNotCanceled;
  });

  // 3. Extraímos apenas as horas que já estão ocupadas (ex: ["10:00", "14:00"])
  const bookedHours = bookedAppointments.map(app => {
    // Formata a data para pegar apenas "HH:MM"
    return app.dateTime.toISOString().substring(11, 16); 
  });

  // 4. Cruzamos as listas: O horário está disponível se NÃO estiver na lista de ocupados
  const availableSlots = businessHours.map(hour => {
    const isAvailable = !bookedHours.includes(hour);
    return {
      time: hour,
      available: isAvailable
    };
  });

  return availableSlots;
}

}