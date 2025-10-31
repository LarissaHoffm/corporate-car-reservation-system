import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({
    required: false,
    description:
      'Senha atual (ou temporária). Obrigatória para o próprio usuário; ADMIN pode omitir.',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({
    description:
      'Nova senha. Recomendação: min. 8, com maiúscula, minúscula, número e símbolo.',
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
