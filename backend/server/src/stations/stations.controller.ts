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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../audit/audit.decorator';

import { StationsService } from './stations.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { QueryStationsDto } from './dto/query-stations.dto';

@ApiTags('Stations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@ApiForbiddenResponse({ description: 'Permissão insuficiente.' })
@Controller('stations')
export class StationsController {
  constructor(private readonly stations: StationsService) {}

  @Post()
  @Roles('ADMIN', 'APPROVER')
  @Audit('STATION_CREATE', 'Station')
  @ApiOperation({ summary: 'Criar estação (ADMIN/APPROVER)' })
  @ApiCreatedResponse({ description: 'Estação criada com sucesso.' })
  @ApiBadRequestResponse({ description: 'Payload inválido.' })
  @ApiConflictResponse({ description: 'Nome já existente no tenant.' })
  create(@Req() req: any, @Body() dto: CreateStationDto) {
    return this.stations.create({ tenantId: req.user.tenantId }, dto);
  }

  @Get()
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  @ApiOperation({ summary: 'Listar estações (REQUESTER/APPROVER/ADMIN)' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Busca por nome (contains)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ description: 'Lista retornada com sucesso.' })
  list(@Req() req: any, @Query() q: QueryStationsDto) {
    return this.stations.list({ tenantId: req.user.tenantId }, q);
  }

  @Get(':id')
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  @ApiOperation({
    summary: 'Obter detalhes da estação (REQUESTER/APPROVER/ADMIN)',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'Estação encontrada.' })
  @ApiNotFoundResponse({ description: 'Estação não encontrada.' })
  get(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.stations.get({ tenantId: req.user.tenantId }, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'APPROVER')
  @Audit('STATION_UPDATE', 'Station')
  @ApiOperation({ summary: 'Atualizar estação (ADMIN/APPROVER)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'Estação atualizada com sucesso.' })
  @ApiBadRequestResponse({ description: 'Payload inválido.' })
  @ApiNotFoundResponse({ description: 'Estação não encontrada.' })
  @ApiConflictResponse({ description: 'Nome já existente no tenant.' })
  update(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateStationDto,
  ) {
    return this.stations.update({ tenantId: req.user.tenantId }, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'APPROVER')
  @Audit('STATION_DELETE', 'Station')
  @ApiOperation({ summary: 'Remover estação (ADMIN/APPROVER)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'Estação removida com sucesso.' })
  @ApiNotFoundResponse({ description: 'Estação não encontrada.' })
  remove(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.stations.remove({ tenantId: req.user.tenantId }, id);
  }
}
