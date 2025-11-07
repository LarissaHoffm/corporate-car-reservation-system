import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { ListCarsQueryDto } from './dto/list-cars.query';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Cars')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cars')
export class CarsController {
  private readonly logger = new Logger('CarsController');

  constructor(private readonly cars: CarsService) {}

  // Helpers de auditoria
  private getClientIp(req: any): string | undefined {
    const xf = req.headers?.['x-forwarded-for'];
    return (Array.isArray(xf) ? xf[0] : xf?.split(',')[0])?.trim() ?? req.ip;
  }
  private auditLog(req: any, action: string, data: Record<string, unknown>) {
    const payload = {
      ts: new Date().toISOString(),
      action, // car.create | car.update | car.delete
      method: req.method,
      path: req.originalUrl ?? req.url,
      ip: this.getClientIp(req),
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ...data,
    };
    this.logger.log(JSON.stringify(payload));
  }

  @Roles('ADMIN', 'APPROVER', 'USER')
  @Get()
  @ApiOperation({ summary: 'Listar carros do tenant (filtros opcionais)' })
  @ApiOkResponse({ description: 'Lista de carros retornada com sucesso.' })
  @ApiBadRequestResponse({ description: 'Parâmetros inválidos.' })
  async list(@Req() req: any, @Query() query: ListCarsQueryDto) {
    const tenantId = req.user?.tenantId as string;
    return this.cars.list(tenantId, query);
  }

  @Roles('ADMIN', 'APPROVER', 'USER')
  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um carro por ID' })
  @ApiOkResponse({ description: 'Carro encontrado.' })
  @ApiNotFoundResponse({ description: 'Carro não encontrado.' })
  async get(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const tenantId = req.user?.tenantId as string;
    return this.cars.getById(tenantId, id);
  }

  @Roles('ADMIN', 'APPROVER')
  @Post()
  @ApiOperation({ summary: 'Criar um novo carro' })
  @ApiCreatedResponse({ description: 'Carro criado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Payload inválido.' })
  @ApiConflictResponse({ description: 'Placa já cadastrada neste tenant.' })
  async create(@Req() req: any, @Body() dto: CreateCarDto) {
    const tenantId = req.user?.tenantId as string;
    const result = await this.cars.create(tenantId, dto);

    this.auditLog(req, 'car.create', {
      carId: result.id,
      plate: result.plate,
      branchId: result.branchId ?? null,
    });

    return result;
  }

  @Roles('ADMIN', 'APPROVER')
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados de um carro' })
  @ApiOkResponse({ description: 'Carro atualizado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Payload inválido.' })
  @ApiNotFoundResponse({ description: 'Carro não encontrado.' })
  @ApiConflictResponse({ description: 'Placa já cadastrada neste tenant.' })
  async update(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCarDto,
  ) {
    const tenantId = req.user?.tenantId as string;
    const result = await this.cars.update(tenantId, id, dto);

    this.auditLog(req, 'car.update', {
      carId: id,
      changed: {
        plate: dto.plate ?? undefined,
        model: dto.model ?? undefined,
        color: dto.color ?? undefined,
        mileage: dto.mileage ?? undefined,
        status: dto.status ?? undefined,
        branchId: dto.branchId ?? (dto.branchName ? `name:${dto.branchName}` : undefined),
      },
    });

    return result;
  }

  @Roles('ADMIN', 'APPROVER')
  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remover um carro' })
  @ApiOkResponse({ description: 'Carro removido com sucesso.' })
  @ApiNotFoundResponse({ description: 'Carro não encontrado.' })
  @ApiConflictResponse({ description: 'Existem vínculos que impedem a remoção.' })
  async remove(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const tenantId = req.user?.tenantId as string;
    const result = await this.cars.remove(tenantId, id);

    this.auditLog(req, 'car.delete', { carId: id });

    return result;
  }
}
