import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ApproveReservationDto } from './dto/approve-reservation.dto';
import { QueryReservationsDto } from './dto/query-reservations.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../infra/audit/audit.decorator';
import { ReservationStatus } from '@prisma/client';

@ApiTags('Reservations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  @Audit('RESERVATION_CREATE', 'Reservation')
  @ApiOperation({
    summary: 'Criar uma reserva',
    description:
      'Cria uma nova reserva com status PENDING. Carro/Filial são opcionais nesta fase.',
  })
  @ApiCreatedResponse({
    description: 'Reserva criada.',
    schema: {
      example: {
        id: '0f8fad5b-d9cb-469f-a165-70867728950e',
        tenantId: 'e23c8c9a-4d1a-4a64-bc0a-0d0c0c0c0c0c',
        origin: 'Matriz',
        destination: 'Cliente XPTO',
        startAt: '2025-11-08T14:00:00.000Z',
        endAt: '2025-11-08T16:00:00.000Z',
        status: 'PENDING',
        purpose: 'Visita comercial',
        carId: null,
        branchId: '3b5f8a13-3d0a-4b2a-8bb1-5bb8b7a6c9e1',
        userId: 'a1a1a1a1-1111-2222-3333-b2b2b2b2b2b2',
        createdAt: '2025-11-08T12:30:01.123Z',
        user: { id: 'a1a1a1a1-1111-2222-3333-b2b2b2b2b2b2', name: 'Requester', email: 'requester@reservcar.com' },
        branch: { id: '3b5f8a13-3d0a-4b2a-8bb1-5bb8b7a6c9e1', name: 'Matriz' },
        car: null,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos (ex.: datas trocadas).' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido.' })
  create(@Req() req: any, @Body() dto: CreateReservationDto) {
    return this.reservations.create(
      {
        userId: req.user.id,
        tenantId: req.user.tenantId,
        branchId: req.user.branchId,
        role: req.user.role,
      },
      dto,
    );
  }

  @Get('me')
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  @ApiOperation({
    summary: 'Listar minhas reservas',
    description:
      'Lista paginada das reservas do usuário autenticado. Aceita filtros de período, status, etc.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ReservationStatus })
  @ApiQuery({ name: 'branchId', required: false, description: 'UUID da filial' })
  @ApiQuery({ name: 'carId', required: false, description: 'UUID do carro' })
  @ApiQuery({ name: 'from', required: false, description: 'ISO datetime inicial' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO datetime final' })
  @ApiQuery({ name: 'page', required: false, description: 'Página (>=1)' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Itens por página (1–100)' })
  @ApiOkResponse({
    description: 'Lista paginada de reservas do usuário.',
    schema: {
      example: {
        items: [
          {
            id: '0f8fad5b-d9cb-469f-a165-70867728950e',
            origin: 'Matriz',
            destination: 'Cliente A',
            startAt: '2025-11-09T12:00:00.000Z',
            endAt: '2025-11-09T14:00:00.000Z',
            status: 'PENDING',
            purpose: 'SMOKE_SEED_PENDING_1',
            approvedAt: null,
            canceledAt: null,
            user: { id: '...', name: 'Requester', email: 'requester@reservcar.com' },
            branch: { id: '...', name: 'Matriz' },
            car: { id: '...', plate: 'ABC1D23', model: 'Fiat Cronos' },
          },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido.' })
  listMine(@Req() req: any, @Query() q: QueryReservationsDto) {
    return this.reservations.list(
      { tenantId: req.user.tenantId, role: 'REQUESTER', userId: req.user.id },
      q,
    );
  }

  @Get()
  @Roles('APPROVER', 'ADMIN') // somente aprovadores/admins listam geral
  @ApiOperation({
    summary: 'Listar reservas do tenant (geral)',
    description:
      'Lista paginada de reservas do tenant. Restrito a APPROVER/ADMIN.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ReservationStatus })
  @ApiQuery({ name: 'branchId', required: false, description: 'UUID da filial' })
  @ApiQuery({ name: 'userId', required: false, description: 'UUID do solicitante (filtro)' })
  @ApiQuery({ name: 'carId', required: false, description: 'UUID do carro' })
  @ApiQuery({ name: 'from', required: false, description: 'ISO datetime inicial' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO datetime final' })
  @ApiQuery({ name: 'page', required: false, description: 'Página (>=1)' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Itens por página (1–100)' })
  @ApiOkResponse({
    description: 'Lista paginada de reservas do tenant.',
    schema: {
      example: {
        items: [
          {
            id: '9c9f1a5b-3333-4444-aaaa-222222222222',
            origin: 'Matriz',
            destination: 'Cliente B',
            startAt: '2025-11-09T17:00:00.000Z',
            endAt: '2025-11-09T19:00:00.000Z',
            status: 'PENDING',
            purpose: 'SMOKE_SEED_PENDING_2',
            approvedAt: null,
            canceledAt: null,
            user: { id: '...', name: 'Requester', email: 'requester@reservcar.com' },
            branch: { id: '...', name: 'Matriz' },
            car: null,
          },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso negado (somente APPROVER/ADMIN).' })
  list(@Req() req: any, @Query() q: QueryReservationsDto) {
    return this.reservations.list(
      { tenantId: req.user.tenantId, role: req.user.role, userId: req.user.id },
      q,
    );
  }

  @Get(':id')
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  @ApiOperation({
    summary: 'Obter detalhes de uma reserva',
    description:
      'Retorna os detalhes da reserva, respeitando escopo de tenant e propriedade (REQUESTER só vê a própria).',
  })
  @ApiParam({ name: 'id', description: 'UUID da reserva' })
  @ApiOkResponse({
    description: 'Reserva encontrada.',
    schema: {
      example: {
        id: '0f8fad5b-d9cb-469f-a165-70867728950e',
        tenantId: 'e23c8c9a-4d1a-4a64-bc0a-0d0c0c0c0c0c',
        origin: 'Matriz',
        destination: 'Cliente XPTO',
        startAt: '2025-11-08T14:00:00.000Z',
        endAt: '2025-11-08T16:00:00.000Z',
        status: 'PENDING',
        purpose: 'Visita comercial',
        approvedAt: null,
        canceledAt: null,
        user: { id: '...', name: 'Requester', email: 'requester@reservcar.com' },
        branch: { id: '...', name: 'Matriz' },
        car: null,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido.' })
  @ApiForbiddenResponse({ description: 'REQUESTER tentando acessar reserva de outro usuário.' })
  @ApiNotFoundResponse({ description: 'Reserva não encontrada no tenant.' })
  async get(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: any) {
    const r = await this.reservations.getById({ tenantId: req.user.tenantId }, id);
    // REQUESTER só pode ver a própria reserva
    if (req.user.role === 'REQUESTER' && r?.user?.id && r.user.id !== req.user.id) {
      throw new ForbiddenException('Sem permissão para visualizar esta reserva.');
    }
    return r;
  }

  @Patch(':id/approve')
  @Roles('APPROVER', 'ADMIN')
  @Audit('RESERVATION_APPROVE', 'Reservation')
  @ApiOperation({
    summary: 'Aprovar reserva (atribuir carro)',
    description: 'Aprova uma reserva PENDING e vincula um carro disponível (APPROVER/ADMIN).',
  })
  @ApiParam({ name: 'id', description: 'UUID da reserva' })
  @ApiOkResponse({
    description: 'Reserva aprovada.',
    schema: {
      example: {
        id: '0f8fad5b-d9cb-469f-a165-70867728950e',
        status: 'APPROVED',
        carId: '5f5f5f5f-aaaa-bbbb-cccc-121212121212',
        approvedAt: '2025-11-08T13:00:00.000Z',
        updatedAt: '2025-11-08T13:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Estado inválido ou carro indisponível.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso negado (somente APPROVER/ADMIN).' })
  @ApiNotFoundResponse({ description: 'Reserva/Carro não encontrado no tenant.' })
  approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ApproveReservationDto,
    @Req() req: any,
  ) {
    return this.reservations.approve(
      { userId: req.user.id, tenantId: req.user.tenantId, role: req.user.role },
      id,
      dto,
    );
  }

  @Patch(':id/cancel')
  @Roles('REQUESTER') // dia 08/11: somente o solicitante cancela
  @Audit('RESERVATION_CANCEL', 'Reservation')
  @ApiOperation({
    summary: 'Cancelar reserva (REQUESTER)',
    description: 'Cancela uma reserva PENDING do próprio usuário.',
  })
  @ApiParam({ name: 'id', description: 'UUID da reserva' })
  @ApiOkResponse({
    description: 'Reserva cancelada.',
    schema: {
      example: {
        id: '0f8fad5b-d9cb-469f-a165-70867728950e',
        status: 'CANCELED',
        canceledAt: '2025-11-08T13:05:00.000Z',
        updatedAt: '2025-11-08T13:05:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Apenas reservas PENDING podem ser canceladas.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido.' })
  @ApiForbiddenResponse({ description: 'Somente o solicitante pode cancelar a própria reserva.' })
  @ApiNotFoundResponse({ description: 'Reserva não encontrada no tenant.' })
  cancel(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: any) {
    return this.reservations.cancel(
      { userId: req.user.id, tenantId: req.user.tenantId, role: req.user.role },
      id,
    );
  }

  @Patch(':id/complete')
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  @Audit('RESERVATION_COMPLETE', 'Reservation')
  @ApiOperation({
    summary: 'Concluir reserva',
    description:
      'Marca a reserva como COMPLETED (regras adicionais aplicam). REQUESTER precisa cumprir pré-condições.',
  })
  @ApiParam({ name: 'id', description: 'UUID da reserva' })
  @ApiOkResponse({
    description: 'Reserva concluída.',
    schema: {
      example: {
        id: '0f8fad5b-d9cb-469f-a165-70867728950e',
        status: 'COMPLETED',
        origin: 'Matriz',
        destination: 'Cliente XPTO',
        startAt: '2025-11-08T14:00:00.000Z',
        endAt: '2025-11-08T16:00:00.000Z',
        carId: '5f5f5f5f-aaaa-bbbb-cccc-121212121212',
        branchId: '3b5f8a13-3d0a-4b2a-8bb1-5bb8b7a6c9e1',
        updatedAt: '2025-11-08T17:10:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Estado inválido ou pré-condições não atendidas.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido.' })
  @ApiForbiddenResponse({ description: 'Sem permissão para concluir.' })
  @ApiNotFoundResponse({ description: 'Reserva não encontrada no tenant.' })
  complete(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: any) {
    return this.reservations.complete(
      { userId: req.user.id, tenantId: req.user.tenantId, role: req.user.role },
      id,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Audit('RESERVATION_DELETE', 'Reservation')
  @ApiOperation({
    summary: 'Excluir reserva (ADMIN)',
    description: 'Remove uma reserva do tenant.',
  })
  @ApiParam({ name: 'id', description: 'UUID da reserva' })
  @ApiOkResponse({
    description: 'Reserva removida.',
    schema: { example: { id: '0f8fad5b-d9cb-469f-a165-70867728950e', deleted: true } },
  })
  @ApiUnauthorizedResponse({ description: 'JWT ausente ou inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso negado (somente ADMIN).' })
  @ApiNotFoundResponse({ description: 'Reserva não encontrada no tenant.' })
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: any) {
    return this.reservations.remove({ tenantId: req.user.tenantId }, id);
  }
}
