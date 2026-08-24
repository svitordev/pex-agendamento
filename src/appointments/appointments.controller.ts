import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  // Publico: GET /appointments/available?date=2026-08-22&professionalId=xxx
  @Get('available')
  getAvailableSlots(
    @Query('date') date: string,
    @Query('professionalId') professionalId: string,
  ) {
    return this.appointmentsService.findAvailableSlots(date, professionalId);
  }

  // Publico: GET /appointments/by-phone?phone=55999999999
  @Get('by-phone')
  getByPhone(@Query('phone') phone: string) {
    return this.appointmentsService.findByPhone(phone);
  }

  // Protegido: GET /appointments (do profissional logado)
  @UseGuards(JwtAuthGuard)
  @Get()
  findMyAppointments(@Req() req: any, @Query('date') date?: string) {
    const professionalId = req.user?.professionalId;
    return this.appointmentsService.findByProfessional(professionalId, date);
  }

  // Protegido: PATCH /appointments/:id/status
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(id, dto.status);
  }
}