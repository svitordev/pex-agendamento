import { IsInt, IsString, IsNotEmpty, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class CreateAvailabilityDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number; // 0=Dom, 1=Seg, ..., 6=Sab

  @IsString()
  @IsNotEmpty()
  startTime!: string; // "HH:MM"

  @IsString()
  @IsNotEmpty()
  endTime!: string; // "HH:MM"

  @IsString()
  @IsNotEmpty()
  professionalId!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}