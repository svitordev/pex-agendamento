import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateAppointmentStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: string;
}