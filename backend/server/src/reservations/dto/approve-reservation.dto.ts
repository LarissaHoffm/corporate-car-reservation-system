import { IsOptional, IsString, MaxLength, IsUUID } from 'class-validator';

export class ApproveReservationDto {
  @IsUUID()
  carId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}
