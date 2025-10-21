import { IsEnum, IsOptional } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadDocumentDto {
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType; 
}
