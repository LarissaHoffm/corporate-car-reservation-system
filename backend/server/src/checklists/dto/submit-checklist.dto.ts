import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ChecklistSubmissionKind, ValidationResult } from '@prisma/client';

export class SubmitChecklistDto {
  @IsUUID()
  @IsNotEmpty()
  templateId: string;

  @IsEnum(ChecklistSubmissionKind)
  kind: ChecklistSubmissionKind;

  @IsNotEmpty()
  payload: Record<string, any>;

  // Para o APPROVER indicar se aprovou ou rejeitou a devolução.
  @IsEnum(ValidationResult)
  @IsOptional()
  decision?: ValidationResult;
}
