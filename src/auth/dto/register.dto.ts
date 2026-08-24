import { IsEmail, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Digite um e-mail válido.' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsIn(['ADMIN', 'PROFESSIONAL', 'CUSTOMER'])
  @IsOptional()
  role?: 'ADMIN' | 'PROFESSIONAL' | 'CUSTOMER';
}