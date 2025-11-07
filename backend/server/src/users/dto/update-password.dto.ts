import { IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiPropertyOptional({
    description: 'Senha atual',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({
    description:
      'Nova senha (mín. 8, com maiúscula, minúscula, dígito e símbolo)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Senha deve conter ao menos uma letra maiúscula.' })
  @Matches(/[a-z]/, { message: 'Senha deve conter ao menos uma letra minúscula.' })
  @Matches(/\d/,   { message: 'Senha deve conter ao menos um dígito.' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Senha deve conter ao menos um símbolo.' })
  newPassword!: string;
}
