// backend/server/src/users/users.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar usuários (ADMIN)' })
  findAll(@Req() req: any) {
    return this.usersService.findAll(req?.user?.tenantId);
  }

  @Post()
  @Roles('ADMIN')
  @Audit('USER_CREATE', 'User')
  @ApiOperation({ summary: 'Criar usuário (ADMIN)' })
  create(@Body() dto: CreateUserDto, @Req() req: any) {
    const tenantId = req?.user?.tenantId ?? req.headers['x-tenant-id'];
    const actorId = req?.user?.sub;
    return this.usersService.create(dto, { tenantId, actorId });
  }

  @Patch(':id')
  @Roles('ADMIN')
  @Audit('USER_UPDATE', 'User')
  @ApiOperation({ summary: 'Atualizar usuário (ADMIN)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    const tenantId = req?.user?.tenantId;
    return this.usersService.update(id, dto, { tenantId });
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Audit('USER_DELETE', 'User')
  @ApiOperation({ summary: 'Remover usuário (ADMIN)' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/make-approver')
  @Roles('ADMIN')
  @Audit('USER_MAKE_APPROVER', 'User')
  @ApiOperation({ summary: 'Promover para APPROVER (ADMIN)' })
  makeApprover(@Param('id') id: string) {
    return this.usersService.makeApprover(id);
  }

  @Patch(':id/revoke-approver')
  @Roles('ADMIN')
  @Audit('USER_REVOKE_APPROVER', 'User')
  @ApiOperation({ summary: 'Revogar APPROVER (ADMIN)' })
  revokeApprover(@Param('id') id: string) {
    return this.usersService.revokeApprover(id);
  }

  @Patch(':id/password')
  @Roles('ADMIN')
  @Audit('USER_PASSWORD_SET', 'User')
  @ApiBody({ type: UpdatePasswordDto })
  @ApiOperation({ summary: 'Definir nova senha para o usuário (ADMIN)' })
  setPassword(@Param('id') id: string, @Body() dto: UpdatePasswordDto, @Req() req: any) {
    const ctx = {
      tenantId: req?.user?.tenantId ?? null,
      actorId: req?.user?.sub ?? null,
      actorRole: req?.user?.role ?? null,
    };
    return this.usersService.updatePassword(id, dto, ctx);
  }

  @Post(':id/reset-password')
  @Roles('ADMIN')
  @Audit('USER_PASSWORD_RESET', 'User')
  @ApiOperation({ summary: 'Resetar senha (gera temporaryPassword e força troca) (ADMIN)' })
  resetPassword(@Param('id') id: string, @Req() req: any) {
    const ctx = {
      tenantId: req?.user?.tenantId ?? null,
      actorId: req?.user?.sub ?? null,
      actorRole: req?.user?.role ?? null,
    };
    return this.usersService.resetPassword(id, ctx);
  }
}
