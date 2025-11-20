import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ChecklistItemType } from '@prisma/client';

export class ChecklistTemplateItemDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsEnum(ChecklistItemType)
  type: ChecklistItemType;

  @IsBoolean()
  @IsOptional()
  required?: boolean = true;

  @IsOptional()
  options?: any;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number = 0;
}
