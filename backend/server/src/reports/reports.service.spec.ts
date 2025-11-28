import { ReservationStatus } from '@prisma/client';
import { ReportsService } from './reports.service';
import { PrismaService } from '../infra/prisma.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      reservation: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
    };

    service = new ReportsService(prisma as PrismaService);
  });

  // ================== TENANT SUMMARY ==================

  describe('getTenantReservationsSummary', () => {
    it('retorna zeros quando tenantId é nulo', async () => {
      const result = await service.getTenantReservationsSummary({
        tenantId: null,
      });

      expect(result).toEqual({
        totalReservations: 0,
        pendingApproval: 0,
        completedTrips: 0,
        canceledReservations: 0,
      });
      expect(prisma.reservation.groupBy).not.toHaveBeenCalled();
    });

    it('agrega contagens por status para o tenant', async () => {
      prisma.reservation.groupBy.mockResolvedValue([
        { status: ReservationStatus.PENDING, _count: { _all: 3 } },
        { status: ReservationStatus.COMPLETED, _count: { _all: 5 } },
        { status: ReservationStatus.CANCELED, _count: { _all: 2 } },
        { status: ReservationStatus.REJECTED, _count: { _all: 1 } },
      ]);

      const result = await service.getTenantReservationsSummary({
        tenantId: 't1',
      });

      expect(prisma.reservation.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { tenantId: 't1' },
        _count: { _all: true },
      });

      expect(result).toEqual({
        totalReservations: 11,
        pendingApproval: 3,
        completedTrips: 5,
        canceledReservations: 3, // canceled + rejected
      });
    });
  });

  // ================== TENANT LIST/REPORT ==================

  describe('getReservationsReport', () => {
    it('aplica filtros do tenant e paginação corretamente', async () => {
      prisma.reservation.findMany.mockResolvedValue([
        { id: 'r1', tenantId: 't1' },
      ]);
      prisma.reservation.count.mockResolvedValue(1);

      const filters: any = {
        userId: 'u1',
        carId: 'c1',
        branchId: 'b1',
        status: [ReservationStatus.APPROVED, ReservationStatus.CANCELED],
        skip: 10,
        take: 5,
      };

      const result = await service.getReservationsReport({
        tenantId: 't1',
        filters,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.reservation.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.reservation.count).toHaveBeenCalledTimes(1);

      const args = prisma.reservation.findMany.mock.calls[0][0];

      expect(args.where).toEqual({
        tenantId: 't1',
        userId: 'u1',
        carId: 'c1',
        branchId: 'b1',
        status: {
          in: [ReservationStatus.APPROVED, ReservationStatus.CANCELED],
        },
      });
      expect(args.orderBy).toEqual({ startAt: 'desc' });
      expect(args.skip).toBe(10);
      expect(args.take).toBe(5);

      expect(result).toEqual({
        total: 1,
        items: [{ id: 'r1', tenantId: 't1' }],
      });
    });
  });

  describe('exportTenantReservationsCsv', () => {
    it('aplica preset canceled-12-months e gera CSV com header + linha', async () => {
      const now = new Date('2024-01-01T10:00:00.000Z');

      const reservation = {
        id: 'abc-def-123456',
        status: ReservationStatus.CANCELED,
        origin: 'Joinville',
        destination: 'Curitiba',
        startAt: now,
        endAt: new Date('2024-01-01T12:00:00.000Z'),
        purpose: 'Reunião',
        createdAt: new Date('2024-01-01T09:00:00.000Z'),
        approvedAt: null,
        canceledAt: new Date('2024-01-01T09:30:00.000Z'),
        user: { name: 'Requester', email: 'req@test.com' },
        approver: { name: 'Approver' },
        car: { model: 'Onix', plate: 'ABC-1234' },
        branch: { name: 'Filial Centro' },
      } as any;

      prisma.reservation.findMany.mockResolvedValue([reservation]);

      const csv = await service.exportTenantReservationsCsv({
        tenantId: 't1',
        filters: { preset: 'canceled-12-months' } as any,
      });

      expect(prisma.reservation.findMany).toHaveBeenCalledTimes(1);
      const args = prisma.reservation.findMany.mock.calls[0][0];

      expect(args.where.tenantId).toBe('t1');
      expect(args.where.status).toEqual({
        in: [ReservationStatus.CANCELED, ReservationStatus.REJECTED],
      });
      expect(args.where.startAt).toBeDefined();
      expect(args.where.startAt.gte).toBeInstanceOf(Date);

      const lines = csv.split('\n');
      expect(lines.length).toBe(2);

      const header = lines[0];
      expect(header).toContain('Código');
      expect(header).toContain('Status');
      expect(header).toContain('RequesterEmail');

      const row = lines[1];
      expect(row).toContain('RSV-2024-'); // código amigável
      expect(row).toContain('Joinville');
      expect(row).toContain('Curitiba');
      expect(row).toContain('ABC-1234');
      expect(row).toContain('Filial Centro');
    });
  });

  // ================== MY SUMMARY ==================

  describe('getMyReservationsSummary', () => {
    it('retorna zeros quando tenantId ou userId são nulos', async () => {
      const res1 = await service.getMyReservationsSummary({
        tenantId: null,
        userId: 'u1',
      });
      const res2 = await service.getMyReservationsSummary({
        tenantId: 't1',
        userId: null,
      });

      const expected = {
        totalReservations: 0,
        pendingApproval: 0,
        completedTrips: 0,
        canceledReservations: 0,
      };

      expect(res1).toEqual(expected);
      expect(res2).toEqual(expected);
      expect(prisma.reservation.groupBy).not.toHaveBeenCalled();
    });

    it('agrega contagens por status para o usuário', async () => {
      prisma.reservation.groupBy.mockResolvedValue([
        { status: ReservationStatus.PENDING, _count: { _all: 2 } },
        { status: ReservationStatus.COMPLETED, _count: { _all: 4 } },
        { status: ReservationStatus.CANCELED, _count: { _all: 1 } },
      ]);

      const res = await service.getMyReservationsSummary({
        tenantId: 't1',
        userId: 'u1',
      });

      expect(prisma.reservation.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { tenantId: 't1', userId: 'u1' },
        _count: { _all: true },
      });

      expect(res).toEqual({
        totalReservations: 7,
        pendingApproval: 2,
        completedTrips: 4,
        canceledReservations: 1,
      });
    });
  });

  // ================== MY CSV ==================

  describe('exportMyReservationsCsv', () => {
    it('retorna apenas header quando tenantId/userId ausentes', async () => {
      const csv = await service.exportMyReservationsCsv({
        tenantId: null,
        userId: null,
        range: 'all',
      });

      expect(csv.trim()).toBe('Código;Status;Início;Fim;Origem;Destino');
      expect(prisma.reservation.findMany).not.toHaveBeenCalled();
    });

    it('gera CSV com reservas no intervalo', async () => {
      const start = new Date('2024-01-10T08:00:00.000Z');
      const end = new Date('2024-01-10T18:00:00.000Z');

      prisma.reservation.findMany.mockResolvedValue([
        {
          id: 'res-1',
          status: ReservationStatus.APPROVED,
          startAt: start,
          endAt: end,
          origin: 'Joinville',
          destination: 'São Bento',
          createdAt: new Date('2024-01-09T12:00:00.000Z'),
          car: { model: 'HB20', plate: 'DEF-5678', branch: { name: 'Matriz' } },
          branch: null,
        } as any,
      ]);

      const csv = await service.exportMyReservationsCsv({
        tenantId: 't1',
        userId: 'u1',
        range: 'last-6-months',
      });

      expect(prisma.reservation.findMany).toHaveBeenCalledTimes(1);
      const args = prisma.reservation.findMany.mock.calls[0][0];

      expect(args.where).toMatchObject({
        tenantId: 't1',
        userId: 'u1',
      });
      expect(args.where.startAt).toBeDefined();

      const lines = csv.split('\n');
      expect(lines.length).toBe(2);
      expect(lines[1]).toContain('HB20');
      expect(lines[1]).toContain('DEF-5678');
      expect(lines[1]).toContain('Joinville');
      expect(lines[1]).toContain('São Bento');
    });

    it('trata range "quarterly-trend" como last-12-months', async () => {
      prisma.reservation.findMany.mockResolvedValue([]);

      await service.exportMyReservationsCsv({
        tenantId: 't1',
        userId: 'u1',
        range: 'quarterly-trend',
      });

      expect(prisma.reservation.findMany).toHaveBeenCalledTimes(1);
      const args = prisma.reservation.findMany.mock.calls[0][0];
      expect(args.where.startAt).toBeDefined();
      expect(args.where.startAt.gte).toBeInstanceOf(Date);
    });
  });

  // ================== MY USAGE BY CAR ==================

  describe('exportMyUsageByCarCsv', () => {
    it('retorna apenas header quando tenantId/userId ausentes', async () => {
      const csv = await service.exportMyUsageByCarCsv({
        tenantId: null,
        userId: null,
        range: 'all',
      });

      expect(csv.trim()).toBe(
        'Placa;Carro;Filial;TotalReservas;TotalDias;UltimaReserva',
      );
      expect(prisma.reservation.findMany).not.toHaveBeenCalled();
    });

    it('agrega uso por carro e gera CSV', async () => {
      const r1 = {
        id: 'r1',
        tenantId: 't1',
        userId: 'u1',
        carId: 'car-1',
        startAt: new Date('2024-01-01T10:00:00.000Z'),
        endAt: new Date('2024-01-03T10:00:00.000Z'), // 2 dias
        car: {
          plate: 'AAA-1111',
          model: 'Onix',
          branch: { name: 'Filial Norte' },
        },
      } as any;

      const r2 = {
        id: 'r2',
        tenantId: 't1',
        userId: 'u1',
        carId: 'car-1',
        startAt: new Date('2024-02-01T10:00:00.000Z'),
        endAt: new Date('2024-02-02T10:00:00.000Z'), // 1 dia
        car: {
          plate: 'AAA-1111',
          model: 'Onix',
          branch: { name: 'Filial Norte' },
        },
      } as any;

      const r3 = {
        id: 'r3',
        tenantId: 't1',
        userId: 'u1',
        carId: null,
        startAt: new Date('2024-03-01T10:00:00.000Z'),
        endAt: new Date('2024-03-01T18:00:00.000Z'),
        car: null,
      } as any;

      prisma.reservation.findMany.mockResolvedValue([r1, r2, r3]);

      const csv = await service.exportMyUsageByCarCsv({
        tenantId: 't1',
        userId: 'u1',
        range: 'last-12-months',
      });

      expect(prisma.reservation.findMany).toHaveBeenCalledTimes(1);
      const args = prisma.reservation.findMany.mock.calls[0][0];

      expect(args.where).toMatchObject({
        tenantId: 't1',
        userId: 'u1',
      });
      expect(args.where.startAt).toBeDefined();

      const lines = csv.split('\n');
      // header + 2 agregações (car-1 e NO-CAR)
      expect(lines.length).toBe(3);

      const carLine = lines.find((l) => l.includes('AAA-1111'))!;
      expect(carLine).toContain('Onix');
      expect(carLine).toContain('Filial Norte');
      expect(carLine).toContain('2'); // total reservas
      expect(carLine).toMatch(/3\.0/); // 2 + 1 dias = 3.0

      const noCarLine = lines.find((l) => l.includes('(sem carro)'))!;
      expect(noCarLine).toBeDefined();
    });
  });
});
