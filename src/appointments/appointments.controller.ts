import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { CancelPublicAppointmentDto } from './dto/cancel-public-appointment.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  // Protegido: DELETE /appointments/cleanup
  @UseGuards(JwtAuthGuard)
  @Delete('cleanup')
  cleanup(@Req() req: any) {
    const professionalId = req.user?.professionalId;

    return this.appointmentsService.cleanup(professionalId);
  }

  // Publico: GET /appointments/available?date=2026-08-22&professionalId=xxx
  @Get('available')
  getAvailableSlots(
    @Query('date') date: string,
    @Query('professionalId') professionalId: string,
    @Query('serviceId') serviceId: string,
  ) {
    return this.appointmentsService.findAvailableSlots(
      date,
      professionalId,
      serviceId,
    );
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

  @Patch(':id/cancel-public')
  cancelPublic(
    @Param('id') id: string,
    @Body()
    dto: CancelPublicAppointmentDto,
  ) {
    return this.appointmentsService.cancelPublic(id, dto.phone);
  }
}
