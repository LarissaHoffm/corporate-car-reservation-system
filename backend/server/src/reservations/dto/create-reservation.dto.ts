import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Transform } from 'class-transformer';

/** Validação cross-field: startAt deve ser anterior a endAt (ISO 8601). */
@ValidatorConstraint({ name: 'StartBeforeEnd', async: false })
class StartBeforeEndConstraint implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments): boolean {
    const dto = args.object as CreateReservationDto;
    if (!dto?.startAt || !dto?.endAt) return true;
    const start = Date.parse(dto.startAt);
    const end = Date.parse(dto.endAt);
    if (Number.isNaN(start) || Number.isNaN(end)) return true;
    return start < end;
  }
  defaultMessage(): string {
    return 'startAt must be before endAt';
  }
}

export class CreateReservationDto {
  @ApiProperty({ description: 'Local de saída', minLength: 3, maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @Length(3, 120)
  origin: string;

  @ApiProperty({ description: 'Local de chegada', minLength: 3, maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @Length(3, 120)
  destination: string;

  @ApiProperty({ description: 'Início da reserva (ISO 8601)' })
  @IsISO8601()
  startAt: string;

  @ApiProperty({ description: 'Fim da reserva (ISO 8601)' })
  @IsISO8601()
  @Validate(StartBeforeEndConstraint) // <- aplicar no campo (não na classe)
  endAt: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Carro desejado (opcional)' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsUUID()
  carId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filial (opcional)' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Finalidade/justificativa (opcional)' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  purpose?: string;
}
