import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';
import { CarStatus } from '@prisma/client';

export const BR_PLATE_REGEX = /^(?:[A-Z]{3}-?\d{4}|[A-Z]{3}\d[A-Z0-9]\d{2})$/;

export const BRANCH_ID_REGEX =
  /^(?:[A-Z]{3}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$/;

export class CreateCarDto {
  @ApiProperty({ example: 'ABC1D23', description: 'Aceita ABC-1234 ou ABC1D23' })
  @IsString({ message: 'plate deve ser string' })
  @Matches(BR_PLATE_REGEX, { message: 'plate inválida. Use ABC-1234 ou ABC1D23' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/[\s-]+/g, '').toUpperCase() : value,
  )
  plate!: string;

  @ApiProperty({ example: 'Onix 1.0' })
  @IsString()
  @MinLength(2, { message: 'model deve ter ao menos 2 caracteres' })
  model!: string;

  @ApiPropertyOptional({ example: 'Prata' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 12000, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'mileage não pode ser negativo' })
  mileage?: number;

  @ApiPropertyOptional({
    enum: ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE', 'ACTIVE'],
    default: 'AVAILABLE',
  })
  @IsOptional()
  @IsEnum(CarStatus, { message: 'status inválido' })
  status?: CarStatus;

  @ApiPropertyOptional({
    example: 'FOR ou 3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'branchId como código (3 letras) OU UUID v4.',
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
    example: 'Fortaleza',
    description: 'Nome da filial (alternativo ao branchId); resolução será feita no service.',
  })
  @IsOptional()
  @IsString()
  branchName?: string;
}
