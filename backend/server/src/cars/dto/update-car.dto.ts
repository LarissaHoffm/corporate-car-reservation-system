import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';
import { CarStatus } from '@prisma/client';
import { PLATE_REGEX } from './create-car.dto';

export class UpdateCarDto {
  @ApiPropertyOptional({ example: 'ABC1D23' })
  @IsOptional()
  @Matches(PLATE_REGEX, { message: 'plate must be like ABC1D23' })
  plate?: string;

  @ApiPropertyOptional({ example: 'Onix 1.0' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'Prata' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 12000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @ApiPropertyOptional({ enum: ['AVAILABLE','IN_USE','MAINTENANCE','INACTIVE','ACTIVE'] })
  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filial (UUID). Envie null para limpar.' })
  @IsOptional()
  @IsUUID('4', { message: 'branchId must be a UUID' })
  branchId?: string;

  @ApiPropertyOptional({ example: 'Fortaleza', description: 'Nome da filial (alternativo ao branchId)' })
  @IsOptional()
  @IsString()
  branchName?: string;
}
