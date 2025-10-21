import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min, IsUUID } from 'class-validator';

export const PLATE_REGEX = /^(?:[A-Za-z]{3}[- ]?\d{4}|[A-Za-z]{3}\d[A-Za-z]\d{2})$/;

export class CreateCarDto {
  @IsString()
  @Matches(PLATE_REGEX, { message: 'Placa inválida (formato BR)' })
  plate!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsInt()
  @Min(0)
  mileage!: number;

  @IsOptional()
  @IsUUID()
  branchId?: string; 
}
