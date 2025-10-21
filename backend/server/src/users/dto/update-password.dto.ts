import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
