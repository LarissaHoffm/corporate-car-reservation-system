import { Injectable } from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';

import { PrismaService } from '../infra/prisma.service';
import { ReservationReportFiltersDto } from './dto/reservation-report-filters.dto';

// --------- Helpers de datas ---------

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

// --------- Helper CSV ---------

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (s.includes('"') || s.includes(';') || s.includes('\n') || s.includes('\r')) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function buildCsvRow(values: unknown[]): string {
  return values.map(escapeCsvValue).join(';');
}

// --------- Código amigável de reserva ---------

function makeFriendlyReservationCode(id: string, createdAt?: Date | null): string {
  if (!id) return '';
  const year =
    createdAt instanceof Date && !isNaN(createdAt.getTime())
      ? createdAt.getFullYear()
      : new Date().getFullYear();

  const clean = id.replace(/-/g, '').toUpperCase();
  const suffix = clean.slice(-6) || clean;
  return `RSV-${year}-${suffix}`;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ================== TENANT (ADMIN / APPROVER) ==================

  private buildTenantWhere(
    tenantId: string | null,
    filters?: ReservationReportFiltersDto,
  ): Prisma.ReservationWhereInput {
    if (!tenantId) {
      // sem tenant: devolve where impossível (nenhum resultado)
      return { id: '__invalid__' };
    }

    const where: Prisma.ReservationWhereInput = {
      tenantId,
    };

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.carId) {
      where.carId = filters.carId;
    }

    if (filters?.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status as ReservationStatus[] };
      } else {
        where.status = filters.status as ReservationStatus;
      }
    }

    return where;
  }

  async getTenantReservationsSummary(params: { tenantId: string | null }) {
    const { tenantId } = params;

    if (!tenantId) {
      return {
        totalReservations: 0,
        pendingApproval: 0,
        completedTrips: 0,
        canceledReservations: 0,
      };
    }

    const groups = await this.prisma.reservation.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true },
    });

    let total = 0;
    let pending = 0;
    let completed = 0;
    let canceled = 0;

    for (const g of groups) {
      const c = g._count?._all ?? 0;
      total += c;

      if (g.status === ReservationStatus.PENDING) pending += c;
      if (g.status === ReservationStatus.COMPLETED) completed += c;
      if (
        g.status === ReservationStatus.CANCELED ||
        g.status === ReservationStatus.REJECTED
      ) {
        canceled += c;
      }
    }

    return {
      totalReservations: total,
      pendingApproval: pending,
      completedTrips: completed,
      canceledReservations: canceled,
    };
  }

  async getReservationsReport(params: {
    tenantId: string | null;
    filters: ReservationReportFiltersDto;
  }) {
    const { tenantId, filters } = params;

    const where = this.buildTenantWhere(tenantId, filters);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,
        orderBy: { startAt: 'desc' },
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        include: {
          user: true,
          approver: true,
          car: true,
          branch: true,
        },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return { total, items };
  }

  /**
   * Export CSV para ADMIN/APPROVER, com filtros + presets de período.
   * - RF17: relatórios por Usuário, Carro, Filial, Período.
   */
  async exportTenantReservationsCsv(params: {
    tenantId: string | null;
    filters?: ReservationReportFiltersDto;
  }): Promise<string> {
    const { tenantId, filters } = params;
    const where = this.buildTenantWhere(tenantId, filters);

    const preset = (filters?.preset ?? 'all') as
      | 'last-30-days'
      | 'last-quarter'
      | 'last-year'
      | 'last-12-months'
      | 'canceled-12-months'
      | 'all';

    // aplica presets de período/status, sem conflitar com outros filtros
    const dateFilter: Prisma.DateTimeFilter = {};

    switch (preset) {
      case 'last-30-days':
        dateFilter.gte = daysAgo(30);
        break;
      case 'last-quarter':
        dateFilter.gte = monthsAgo(3);
        break;
      case 'last-year':
      case 'last-12-months':
        dateFilter.gte = monthsAgo(12);
        break;
      case 'canceled-12-months':
        dateFilter.gte = monthsAgo(12);
        // sobrescreve status para canceladas/rejeitadas
        where.status = {
          in: [ReservationStatus.CANCELED, ReservationStatus.REJECTED],
        };
        break;
      case 'all':
      default:
        // sem filtro de data extra
        break;
    }

    if (Object.keys(dateFilter).length > 0) {
      where.startAt = dateFilter;
    }

    const items = await this.prisma.reservation.findMany({
      where,
      orderBy: { startAt: 'desc' },
      include: {
        user: true,
        approver: true,
        car: true,
        branch: true,
      },
    });

    const header = buildCsvRow([
      'Código',
      'Status',
      'Requester',
      'RequesterEmail',
      'Carro',
      'Placa',
      'Filial',
      'Início',
      'Fim',
      'Origem',
      'Destino',
      'Purpose',
      'Aprovador',
      'AprovadoEm',
      'CanceladoEm',
    ]);

    const lines: string[] = [header];

    for (const r of items) {
      const code = makeFriendlyReservationCode(r.id, r.createdAt);
      lines.push(
        buildCsvRow([
          code,
          r.status,
          r.user?.name ?? '',
          r.user?.email ?? '',
          r.car?.model ?? '',
          r.car?.plate ?? '',
          r.branch?.name ?? '',
          r.startAt.toISOString(),
          r.endAt.toISOString(),
          r.origin,
          r.destination,
          r.purpose ?? '',
          r.approver?.name ?? '',
          r.approvedAt ? r.approvedAt.toISOString() : '',
          r.canceledAt ? r.canceledAt.toISOString() : '',
        ]),
      );
    }

    return lines.join('\n');
  }

  // ================== REQUESTER (histórico pessoal) ==================

  async getMyReservationsSummary(params: {
    tenantId: string | null;
    userId: string | null;
  }) {
    const { tenantId, userId } = params;

    if (!tenantId || !userId) {
      return {
        totalReservations: 0,
        pendingApproval: 0,
        completedTrips: 0,
        canceledReservations: 0,
      };
    }

    const groups = await this.prisma.reservation.groupBy({
      by: ['status'],
      where: { tenantId, userId },
      _count: { _all: true },
    });

    let total = 0;
    let pending = 0;
    let completed = 0;
    let canceled = 0;

    for (const g of groups) {
      const c = g._count?._all ?? 0;
      total += c;

      if (g.status === ReservationStatus.PENDING) pending += c;
      if (g.status === ReservationStatus.COMPLETED) completed += c;
      if (
        g.status === ReservationStatus.CANCELED ||
        g.status === ReservationStatus.REJECTED
      ) {
        canceled += c;
      }
    }

    return {
      totalReservations: total,
      pendingApproval: pending,
      completedTrips: completed,
      canceledReservations: canceled,
    };
  }

  async exportMyReservationsCsv(params: {
    tenantId: string | null;
    userId: string | null;
    range:
      | 'last-30-days'
      | 'last-quarter'
      | 'last-6-months'
      | 'last-12-months'
      | 'canceled-12-months'
      | 'all'
      | 'quarterly-trend';
  }): Promise<string> {
    const { tenantId, userId } = params;
    let { range } = params;

    if (!tenantId || !userId) {
      return buildCsvRow(['Código', 'Status', 'Início', 'Fim', 'Origem', 'Destino']);
    }

    // Compat: se vier "quarterly-trend", trata como last-12-months
    if (range === 'quarterly-trend') {
      range = 'last-12-months';
    }

    const where: Prisma.ReservationWhereInput = {
      tenantId,
      userId,
    };

    switch (range) {
      case 'last-30-days':
        where.startAt = { gte: daysAgo(30) };
        break;
      case 'last-quarter':
        where.startAt = { gte: monthsAgo(3) };
        break;
      case 'last-6-months':
        where.startAt = { gte: monthsAgo(6) };
        break;
      case 'last-12-months':
        where.startAt = { gte: monthsAgo(12) };
        break;
      case 'canceled-12-months':
        where.startAt = { gte: monthsAgo(12) };
        where.status = { in: [ReservationStatus.CANCELED, ReservationStatus.REJECTED] };
        break;
      case 'all':
      default:
        // sem filtro de data
        break;
    }

    const items = await this.prisma.reservation.findMany({
      where,
      orderBy: { startAt: 'desc' },
      include: {
        car: {
          include: {
            branch: true,
          },
        },
        branch: true,
      },
    });

    const header = buildCsvRow([
      'Código',
      'Status',
      'Início',
      'Fim',
      'Origem',
      'Destino',
      'Carro',
      'Placa',
      'Filial',
    ]);

    const lines: string[] = [header];

    for (const r of items) {
      const code = makeFriendlyReservationCode(r.id, r.createdAt);
      lines.push(
        buildCsvRow([
          code,
          r.status,
          r.startAt.toISOString(),
          r.endAt.toISOString(),
          r.origin,
          r.destination,
          r.car?.model ?? '',
          r.car?.plate ?? '',
          r.branch?.name ?? r.car?.branch?.name ?? '',
        ]),
      );
    }

    return lines.join('\n');
  }

  async exportMyUsageByCarCsv(params: {
    tenantId: string | null;
    userId: string | null;
    range?: 'last-12-months' | 'all';
  }): Promise<string> {
    const { tenantId, userId } = params;

    if (!tenantId || !userId) {
      return buildCsvRow([
        'Placa',
        'Carro',
        'Filial',
        'TotalReservas',
        'TotalDias',
        'UltimaReserva',
      ]);
    }

    const where: Prisma.ReservationWhereInput = {
      tenantId,
      userId,
    };

    if (!params.range || params.range === 'last-12-months') {
      where.startAt = { gte: monthsAgo(12) };
    }

    const reservations = await this.prisma.reservation.findMany({
      where,
      include: {
        car: {
          include: {
            branch: true,
          },
        },
      },
    });

    type Agg = {
      carId: string | null;
      plate: string;
      model: string;
      branchName: string;
      totalReservations: number;
      totalDays: number;
      lastStartAt: Date | null;
    };

    const map = new Map<string, Agg>();

    for (const r of reservations) {
      const key = r.carId ?? 'NO-CAR';
      let agg = map.get(key);
      if (!agg) {
        agg = {
          carId: r.carId ?? null,
          plate: r.car?.plate ?? '(sem carro)',
          model: r.car?.model ?? '(sem carro)',
          branchName: r.car?.branch?.name ?? '',
          totalReservations: 0,
          totalDays: 0,
          lastStartAt: null,
        };
        map.set(key, agg);
      }

      agg.totalReservations += 1;

      const diffMs = r.endAt.getTime() - r.startAt.getTime();
      const diffDays = Math.max(diffMs / 86_400_000, 0);
      agg.totalDays += diffDays;

      if (!agg.lastStartAt || r.startAt > agg.lastStartAt) {
        agg.lastStartAt = r.startAt;
      }
    }

    const header = buildCsvRow([
      'Placa',
      'Carro',
      'Filial',
      'TotalReservas',
      'TotalDias',
      'UltimaReserva',
    ]);

    const lines: string[] = [header];

    for (const agg of map.values()) {
      lines.push(
        buildCsvRow([
          agg.plate,
          agg.model,
          agg.branchName,
          agg.totalReservations,
          agg.totalDays.toFixed(1),
          agg.lastStartAt ? agg.lastStartAt.toISOString() : '',
        ]),
      );
    }

    return lines.join('\n');
  }
}
