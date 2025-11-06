import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  phone?: number;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  join_date?: string;
}
