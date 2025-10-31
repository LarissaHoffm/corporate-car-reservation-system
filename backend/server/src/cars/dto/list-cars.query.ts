import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CarStatus } from '@prisma/client';

export class ListCarsQueryDto {
  @ApiPropertyOptional({ description: 'Filial (UUID) para filtrar' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ enum: CarStatus, description: 'Status do carro' })
  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus;
}
