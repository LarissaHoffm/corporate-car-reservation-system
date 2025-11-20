import { PartialType } from '@nestjs/mapped-types';
import { CreateChecklistTemplateDto } from './create-checklist-template.dto';

export class UpdateChecklistTemplateDto extends PartialType(
  CreateChecklistTemplateDto,
) {}
