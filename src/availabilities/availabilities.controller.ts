import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { AvailabilitiesService } from './availabilities.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Controller('availabilities')
export class AvailabilitiesController {
  constructor(private readonly service: AvailabilitiesService) {}

  @Post() create(@Body() dto: CreateAvailabilityDto) { return this.service.create(dto); }
  @Get('professional/:id') findByPro(@Param('id') id: string) { return this.service.findAllByProfessional(id); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateAvailabilityDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}