import { IsDateString, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @MinLength(2)
  origin!: string;

  @IsString()
  @MinLength(2)
  destination!: string;

  @IsDateString()
  startAt!: string; 

  @IsDateString()
  endAt!: string;   

  @IsUUID()
  carId!: string;   
}
