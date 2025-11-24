import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { ReportsService } from './reports.service';
import { ReservationReportFiltersDto } from './dto/reservation-report-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Não autenticado (401).' })
@ApiForbiddenResponse({ description: 'Sem permissão (403).' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ========= ADMIN / APPROVER =========

  @Get('reservations/summary')
  @Roles('ADMIN', 'APPROVER')
  @ApiOperation({
    summary: 'Resumo das reservas do tenant',
    description:
      'Total, pendentes, concluídas e canceladas/rejeitadas para o tenant atual.',
  })
  @ApiOkResponse({ description: 'Resumo retornado com sucesso.' })
  async getReservationsSummary(@Req() req: any) {
    const u = req?.user ?? {};
    const tenantId = u.tenantId ?? null;

    return this.reportsService.getTenantReservationsSummary({ tenantId });
  }

  @Get('reservations')
  @Roles('ADMIN', 'APPROVER')
  @ApiOperation({
    summary: 'Listar reservas para relatórios (ADMIN/APPROVER)',
    description:
      'Retorna lista paginada de reservas do tenant, com filtros por usuário, carro, filial, período e status.',
  })
  @ApiOkResponse({ description: 'Lista de reservas retornada.' })
  async getReservationsReport(
    @Query() query: ReservationReportFiltersDto,
    @Req() req: any,
  ) {
    const u = req?.user ?? {};
    const tenantId = u.tenantId ?? null;

    const filters: ReservationReportFiltersDto = {
      ...query,
      skip:
        typeof query.skip === 'number'
          ? query.skip
          : query.skip != null
          ? Number(query.skip)
          : 0,
      take:
        typeof query.take === 'number'
          ? query.take
          : query.take != null
          ? Number(query.take)
          : 20,
      top:
        typeof query.top === 'number'
          ? query.top
          : query.top != null
          ? Number(query.top)
          : 10,
    } as any;

    return this.reportsService.getReservationsReport({
      tenantId,
      filters,
    });
  }

  @Get('reservations/export')
  @Roles('ADMIN', 'APPROVER')
  @ApiOperation({
    summary: 'Exportar reservas do tenant (CSV)',
    description:
      'Exporta as reservas do tenant aplicando os mesmos filtros do endpoint de listagem.',
  })
  @ApiOkResponse({ description: 'Arquivo CSV gerado.' })
  async exportReservationsReport(
    @Query() query: ReservationReportFiltersDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const u = req?.user ?? {};
    const tenantId = u.tenantId ?? null;

    const csv = await this.reportsService.exportTenantReservationsCsv({
      tenantId,
      filters: query,
    });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="reservations-report.csv"',
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');

    return res.send(csv);
  }

  // ========= REQUESTER (histórico pessoal) =========

  @Get('my-reservations/summary')
  @Roles('REQUESTER')
  @ApiOperation({
    summary: 'Resumo de uso pessoal (REQUESTER)',
    description:
      'Retorna contadores de reservas do próprio usuário: total, pendentes, concluídas e canceladas/rejeitadas.',
  })
  @ApiOkResponse({ description: 'Resumo retornado com sucesso.' })
  async getMyReservationsSummary(@Req() req: any) {
    const u = req?.user ?? {};
    const tenantId = u.tenantId ?? null;
    const userId = u.id ?? u.sub ?? null;

    return this.reportsService.getMyReservationsSummary({
      tenantId,
      userId,
    });
  }

  @Get('my-reservations/export')
  @Roles('REQUESTER')
  @ApiOperation({
    summary: 'Exportar histórico pessoal de reservas (CSV)',
    description:
      'Gera um CSV com as reservas do próprio usuário, em diferentes janelas de período.',
  })
  @ApiOkResponse({ description: 'Arquivo CSV gerado.' })
  async exportMyReservations(
    @Req() req: any,
    @Res() res: Response,
    @Query('range')
    range:
      | 'last-30-days'
      | 'last-quarter'
      | 'last-6-months'
      | 'last-12-months'
      | 'canceled-12-months'
      | 'all'
      | 'quarterly-trend' = 'last-quarter',
  ) {
    const u = req?.user ?? {};
    const tenantId = u.tenantId ?? null;
    const userId = u.id ?? u.sub ?? null;

    const csv = await this.reportsService.exportMyReservationsCsv({
      tenantId,
      userId,
      range,
    });

    const safeRange = range || 'last-quarter';

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="my-reservations-${safeRange}.csv"`,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');

    return res.send(csv);
  }

  @Get('my-reservations/by-car/export')
  @Roles('REQUESTER')
  @ApiOperation({
    summary: 'Exportar uso pessoal por carro (CSV)',
    description:
      'Agrupa as reservas do usuário por carro (últimos 12 meses por padrão).',
  })
  @ApiOkResponse({ description: 'Arquivo CSV gerado.' })
  async exportMyCarUsage(
    @Req() req: any,
    @Res() res: Response,
    @Query('range') range: 'last-12-months' | 'all' = 'last-12-months',
  ) {
    const u = req?.user ?? {};
    const tenantId = u.tenantId ?? null;
    const userId = u.id ?? u.sub ?? null;

    const csv = await this.reportsService.exportMyUsageByCarCsv({
      tenantId,
      userId,
      range,
    });

    const safeRange = range || 'last-12-months';

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="my-car-usage-${safeRange}.csv"`,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');

    return res.send(csv);
  }
}
