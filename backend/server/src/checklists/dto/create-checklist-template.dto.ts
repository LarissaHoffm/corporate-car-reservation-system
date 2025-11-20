import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ChecklistTemplateItemDto } from './checklist-template-item.dto';

export class CreateChecklistTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  carId: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean = true;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistTemplateItemDto)
  items: ChecklistTemplateItemDto[];
}
