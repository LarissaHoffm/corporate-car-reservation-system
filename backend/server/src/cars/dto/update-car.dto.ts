import { IsEnum, IsInt, IsOptional, IsString, Matches, Min, IsUUID } from 'class-validator';
import { PLATE_REGEX } from './create-car.dto';
import { CarStatus } from '@prisma/client';

export class UpdateCarDto {
  @IsOptional()
  @IsString()
  @Matches(PLATE_REGEX, { message: 'Placa inválida (formato BR)' })
  plate?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus; 
}
