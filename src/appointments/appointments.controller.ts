import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { CancelPublicAppointmentDto } from './dto/cancel-public-appointment.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
  ) {}

  @Post()
  create(
    @Body()
    dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('cleanup')
  cleanup(
    @Req() req: any,
  ) {
    return this.appointmentsService.cleanup(
      req.user?.professionalId,
    );
  }

  @Get('available')
  getAvailableSlots(
    @Query('date')
    date: string,

    @Query('professionalId')
    professionalId: string,

    @Query('serviceId')
    serviceId: string,
  ) {
    return this.appointmentsService.findAvailableSlots(
      date,
      professionalId,
      serviceId,
    );
  }

  @Get('by-phone')
  getByPhone(
    @Query('phone')
    phone: string,
  ) {
    return this.appointmentsService.findByPhone(
      phone,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findMyAppointments(
    @Req() req: any,
    @Query('date')
    date?: string,
  ) {
    return this.appointmentsService.findByProfessional(
      req.user?.professionalId,
      date,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(
    @Req() req: any,

    @Param('id')
    id: string,

    @Body()
    dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(
      id,
      dto.status,
      req.user?.professionalId,
    );
  }

  @Patch(':id/cancel-public')
  cancelPublic(
    @Param('id')
    id: string,

    @Body()
    dto: CancelPublicAppointmentDto,
  ) {
    return this.appointmentsService.cancelPublic(
      id,
      dto.phone,
    );
  }
}