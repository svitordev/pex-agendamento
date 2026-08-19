import { IsString, IsNotEmpty } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  professionalId!: string;

  @IsString()
  @IsNotEmpty()
  dateTime!: string; // ISO date string

  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @IsString()
  @IsNotEmpty()
  clientName!: string;

  @IsString()
  @IsNotEmpty()
  clientWhats!: string;
}