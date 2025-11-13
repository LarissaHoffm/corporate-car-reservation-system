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
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
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
@ApiUnauthorizedResponse({ description: 'Não autenticado (401)' })
@ApiForbiddenResponse({ description: 'Sem permissão (403)' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar usuários', description: 'RBAC: ADMIN' })
  @ApiOkResponse({ description: 'Lista retornada com sucesso.' })
  findAll(@Req() req: any) {
    return this.usersService.findAll(req?.user?.tenantId);
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Obter detalhes de um usuário',
    description: 'RBAC: ADMIN',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'Usuário encontrado.' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado (404)' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId ?? req.headers['x-tenant-id'];
    return this.usersService.findOne(id, { tenantId });
  }

  @Post()
  @Roles('ADMIN')
  @Audit('USER_CREATE', 'User')
  @ApiOperation({ summary: 'Criar usuário', description: 'RBAC: ADMIN' })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      default: {
        summary: 'Exemplo',
        value: {
          email: 'novo.user@empresa.com',
          name: 'Novo User',
          role: 'REQUESTER',
          branchId: null,
          department: 'SALES',
          phone: '11999998888',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Usuário criado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos (400)' })
  @ApiConflictResponse({ description: 'E-mail já cadastrado.' })
  create(@Body() dto: CreateUserDto, @Req() req: any) {
    const tenantId = req?.user?.tenantId ?? req.headers['x-tenant-id'];
    const actorId = req?.user?.sub ?? req?.user?.id ?? null;
    return this.usersService.create(dto, { tenantId, actorId });
  }

  @Patch(':id')
  @Roles('ADMIN')
  @Audit('USER_UPDATE', 'User')
  @ApiOperation({ summary: 'Atualizar usuário', description: 'RBAC: ADMIN' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'Usuário atualizado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos (400)' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado (404)' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId;
    return this.usersService.update(id, dto, { tenantId });
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Audit('USER_DELETE', 'User')
  @ApiOperation({ summary: 'Remover usuário', description: 'RBAC: ADMIN' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'Usuário removido.' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado (404)' })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/make-approver')
  @Roles('ADMIN')
  @Audit('USER_MAKE_APPROVER', 'User')
  @ApiOperation({
    summary: 'Promover para APPROVER',
    description: 'RBAC: ADMIN',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'Usuário promovido.' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado (404)' })
  makeApprover(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.usersService.makeApprover(id);
  }

  @Patch(':id/revoke-approver')
  @Roles('ADMIN')
  @Audit('USER_REVOKE_APPROVER', 'User')
  @ApiOperation({ summary: 'Revogar APPROVER', description: 'RBAC: ADMIN' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'Permissão revogada.' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado (404)' })
  revokeApprover(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.usersService.revokeApprover(id);
  }

  @Patch(':id/password')
  @Audit('USER_PASSWORD_SET', 'User')
  @ApiOperation({
    summary: 'Alterar própria senha (SELF) / Definir senha (ADMIN)',
    description: 'RBAC: SELF ou ADMIN (verificado no service)',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({
    type: UpdatePasswordDto,
    examples: {
      self: {
        summary: 'Troca própria',
        value: { currentPassword: 'Senha@Atual1', newPassword: 'Nova@Senha2' },
      },
      admin: {
        summary: 'ADMIN definindo nova senha',
        value: { newPassword: 'Definida@Admin3' },
      },
    },
  })
  @ApiOkResponse({ description: 'Senha atualizada.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos (400)' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado (404)' })
  setPassword(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePasswordDto,
    @Req() req: any,
  ) {
    const u = req?.user ?? {};
    const ctx = {
      tenantId: u.tenantId ?? null,
      actorId: u.id ?? u.sub ?? null,
      actorRole: u.role ?? null,
    };
    return this.usersService.updatePassword(id, dto, ctx);
  }

  @Post(':id/reset-password')
  @Roles('ADMIN')
  @Audit('USER_PASSWORD_RESET', 'User')
  @ApiOperation({
    summary: 'Resetar senha (gera temporaryPassword e força troca)',
    description: 'RBAC: ADMIN',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'Senha resetada.' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado (404)' })
  resetPassword(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: any,
  ) {
    const u = req?.user ?? {};
    const ctx = {
      tenantId: u.tenantId ?? null,
      actorId: u.id ?? u.sub ?? null,
      actorRole: u.role ?? null,
    };
    return this.usersService.resetPassword(id, ctx);
  }

  @Get(':id/reservations')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Listar reservas do usuário',
    description: 'RBAC: ADMIN',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'Lista de reservas retornada.' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado (404)' })
  reservations(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId;
    return this.usersService.findReservationsByUser(id, { tenantId });
  }
}
