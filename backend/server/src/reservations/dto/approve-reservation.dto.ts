import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveReservationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}
