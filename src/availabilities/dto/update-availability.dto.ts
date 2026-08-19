import { IsInt, IsString, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsInt() @Min(0) @Max(6) @IsOptional() dayOfWeek?: number;
  @IsString() @IsOptional() startTime?: string;
  @IsString() @IsOptional() endTime?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
}