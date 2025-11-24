import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  IsString,
} from 'class-validator';

export class ReservationReportFiltersDto {
  @ApiPropertyOptional({
    description: 'Offset para paginação',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({
    description: 'Limite de registros para paginação',
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  take?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por usuário (requester)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por carro',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  carId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por filial (branch)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por status da reserva',
    enum: ReservationStatus,
  })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({
    description: 'Data inicial (ISO, inclusive)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data final (ISO, inclusive)',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description:
      "Preset de período ('all', 'last_30_days', 'last_quarter', 'last_12_months', 'custom')",
    example: 'last_30_days',
  })
  @IsOptional()
  @IsString()
  preset?: string;

  @ApiPropertyOptional({
    description: 'Top N registros para rankings (ex: top 10 usuários)',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  top?: number;
}
