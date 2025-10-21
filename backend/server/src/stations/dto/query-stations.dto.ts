import { IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryStationsDto {
  @IsOptional() @IsUUID()
  branchId?: string;

  @IsOptional() @IsString()
  q?: string; 

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}
