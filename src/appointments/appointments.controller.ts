import { AppointmentsService } from './appointments.service';
import { Body, Controller, Post, Query } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Controller('appointments')
export class AppointmentsController {
constructor(private readonly AppointmentsService: AppointmentsService) {}

@Post() // Rota para criar o agendamento
create(@Body() CreateAppointmentDto: CreateAppointmentDto) {
    return this.AppointmentsService.create(CreateAppointmentDto);
}

@Get('available')
//Rota para o front-end buscar os horários livres.
// Exemplo de chamada:  GET /appointments/available?date=2026-07-10&professionalId=1
getAvailableSlots(
    @Query('date') date: string,
    @Query('professionalId') professionalId: string
){
    return this.AppointmentsService.findAvailableSlots(date, +professionalId);
}
}
