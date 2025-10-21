import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Senha atual (obrigatória neste endpoint)' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ description: 'Nova senha (mín. 8, com maiúsc./minúsc./dígito/símbolo)' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
