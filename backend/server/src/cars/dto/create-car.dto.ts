import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';
import { CarStatus } from '@prisma/client';

// ABC1D23 (padrão Mercosul simplificado)
export const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export class CreateCarDto {
  @ApiProperty({ example: 'ABC1D23' })
  @Matches(PLATE_REGEX, { message: 'plate must be like ABC1D23' })
  plate!: string;

  @ApiProperty({ example: 'Onix 1.0' })
  @IsString()
  model!: string;

  @ApiPropertyOptional({ example: 'Prata' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: 12000, default: 0 })
  @IsInt()
  @Min(0)
  mileage!: number;

  @ApiProperty({ enum: ['AVAILABLE','IN_USE','MAINTENANCE','INACTIVE','ACTIVE'], default: 'AVAILABLE' })
  @IsEnum(CarStatus)
  status!: CarStatus;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filial (UUID). Opcional.' })
  @IsOptional()
  @IsUUID('4', { message: 'branchId must be a UUID' })
  branchId?: string;

  @ApiPropertyOptional({ example: 'Fortaleza', description: 'Nome da filial (alternativo ao branchId)' })
  @IsOptional()
  @IsString()
  branchName?: string;
}
