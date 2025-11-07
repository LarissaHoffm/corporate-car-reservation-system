import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, Matches } from 'class-validator';
import { CarStatus } from '@prisma/client';
import { BRANCH_ID_REGEX } from './create-car.dto';

export class ListCarsQueryDto {
  @ApiPropertyOptional({
    description: 'Filial (código de 3 letras, ex.: FOR) ou UUID v4',
    example: 'FOR',
  })
  @IsOptional()
  @Matches(BRANCH_ID_REGEX, {
    message: 'branchId deve ser código de 3 letras (ex.: FOR) ou UUID v4 válido',
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return /^[a-zA-Z]{3}$/.test(value) ? value.toUpperCase() : value;
  })
  branchId?: string;

  @ApiPropertyOptional({
    enum: CarStatus,
    description: 'Status do carro',
    example: CarStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus;
}
