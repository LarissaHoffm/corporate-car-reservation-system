import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ValidationResult } from '@prisma/client';

export class ValidateDocumentDto {
  @IsEnum(ValidationResult)
  result!: ValidationResult; 

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}
