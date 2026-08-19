import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentsService.create(createAppointmentDto);
  }

  @Get('available')
  getAvailableSlots(
    @Query('date') date: string,
    @Query('professionalId') professionalId: string
  ) {
    return this.appointmentsService.findAvailableSlots(date, professionalId);
  }
}