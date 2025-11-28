import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CarStatus, ReservationStatus } from '@prisma/client';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prisma: any;

  const actorBase = {
    tenantId: 't1',
    userId: 'u1',
    role: 'REQUESTER' as const,
  };

  const makeTx = () => ({
    reservation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    car: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  });

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((arg: any) => {
        // Suporta ambos os modos do Prisma:
        // 1) callback (tx) => {...}
        // 2) array de operações [count(), findMany()]
        if (typeof arg === 'function') {
          const tx = makeTx();
          return arg(tx);
        }
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        return Promise.resolve(arg);
      }),
      reservation: {
        findUnique: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      station: {
        findMany: jest.fn(),
      },
      document: {
        findMany: jest.fn(),
      },
      checklistSubmission: {
        findMany: jest.fn(),
      },
      car: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    service = new ReservationsService(prisma);
  });

  // CREATE
  describe('create', () => {
    it('deve lançar BadRequestException se datas forem inválidas', async () => {
      await expect(
        service.create(actorBase, {
          startAt: 'x',
          endAt: 'y',
          origin: 'A',
          destination: 'B',
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve lançar BadRequestException se endAt <= startAt', async () => {
      await expect(
        service.create(actorBase, {
          startAt: '2024-01-02T10:00:00Z',
          endAt: '2024-01-02T09:00:00Z',
          origin: 'A',
          destination: 'B',
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve criar reserva PENDING sem carro', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.reservation.create.mockResolvedValue({
          id: 'r1',
          tenantId: actorBase.tenantId,
          origin: 'A',
          destination: 'B',
          startAt: new Date(),
          endAt: new Date(Date.now() + 3600000),
          status: ReservationStatus.PENDING,
          purpose: null,
          carId: null,
          branchId: null,
          userId: actorBase.userId,
          createdAt: new Date(),
          user: { id: actorBase.userId, name: 'Req', email: 'req@test' },
          branch: null,
          car: null,
        });
        tx.auditLog.create.mockResolvedValue({} as any);
        return cb(tx);
      });

      const dto = {
        origin: 'A',
        destination: 'B',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 3600000).toISOString(),
      };

      const result = await service.create(actorBase, dto);

      expect(result.status).toBe(ReservationStatus.PENDING);
    });

    it('deve lançar NotFoundException se carro informado não existir', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.car.findUnique.mockResolvedValue(null);
        return cb(tx);
      });

      const dto = {
        origin: 'A',
        destination: 'B',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 3600000).toISOString(),
        carId: 'c1',
      };

      await expect(service.create(actorBase, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException se carro não estiver AVAILABLE', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.car.findUnique.mockResolvedValue({
          id: 'c1',
          tenantId: actorBase.tenantId,
          status: CarStatus.IN_USE,
        });
        return cb(tx);
      });

      const dto = {
        origin: 'A',
        destination: 'B',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 3600000).toISOString(),
        carId: 'c1',
      };

      await expect(service.create(actorBase, dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('deve lançar ConflictException se houver overlap para o carro', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.car.findUnique.mockResolvedValue({
          id: 'c1',
          tenantId: actorBase.tenantId,
          status: CarStatus.AVAILABLE,
        });
        tx.reservation.count.mockResolvedValue(1);
        return cb(tx);
      });

      const dto = {
        origin: 'A',
        destination: 'B',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 3600000).toISOString(),
        carId: 'c1',
      };

      await expect(service.create(actorBase, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  // LIST
  describe('list', () => {
    it('deve aplicar filtros e forçar userId para REQUESTER', async () => {
      prisma.reservation.count.mockResolvedValue(1);
      prisma.reservation.findMany.mockResolvedValue([
        {
          id: 'r1',
          origin: 'A',
          destination: 'B',
          startAt: new Date('2024-01-10T10:00:00Z'),
          endAt: new Date('2024-01-10T11:00:00Z'),
          status: ReservationStatus.PENDING,
          purpose: 'Viagem',
          approvedAt: null,
          canceledAt: null,
          user: { id: 'u1', name: 'Req', email: 'req@test' },
          branch: null,
          car: null,
        },
      ]);

      const actor = {
        tenantId: 't1',
        userId: 'u1',
        role: 'REQUESTER' as const,
      };

      const dto: any = {
        page: 2,
        pageSize: 10,
        status: ReservationStatus.APPROVED,
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-31T23:59:59Z',
        q: 'Viagem',
        branchId: 'b1',
        carId: 'c1',
        userId: 'uX', // será sobrescrito pelo REQUESTER
      };

      const result = await service.list(actor, dto);

      expect(prisma.reservation.count).toHaveBeenCalledTimes(1);
      expect(prisma.reservation.findMany).toHaveBeenCalledTimes(1);

      const whereArg = prisma.reservation.count.mock.calls[0][0].where;

      expect(whereArg.tenantId).toBe('t1');
      // REQUESTER força userId = actor.userId
      expect(whereArg.userId).toBe('u1');
      expect(whereArg.carId).toBe('c1');
      expect(whereArg.branchId).toBe('b1');
      expect(whereArg.AND).toBeDefined();
      expect(whereArg.OR).toBeDefined();

      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('r1');
    });
  });

  // GET BY ID
  describe('getById', () => {
    it('deve retornar reserva quando tenant estiver correto', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        tenantId: 't1',
      });

      const result = await service.getById({ tenantId: 't1' }, 'r1');

      expect(result.id).toBe('r1');
    });

    it('deve lançar NotFoundException quando tenant divergir', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        tenantId: 'tX',
      });

      await expect(
        service.getById({ tenantId: 't1' }, 'r1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // APPROVE
  describe('approve', () => {
    const approver = {
      userId: 'a1',
      tenantId: 't1',
      role: 'APPROVER' as const,
    };

    it('deve aprovar reserva quando carro está AVAILABLE e não há overlap', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();

        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
          status: ReservationStatus.PENDING,
          startAt: new Date(),
          endAt: new Date(Date.now() + 3600000),
          carId: null,
          branchId: null,
        });

        tx.car.findUnique.mockResolvedValue({
          id: 'c1',
          tenantId: 't1',
          status: CarStatus.AVAILABLE,
        });

        tx.reservation.count.mockResolvedValue(0);

        tx.reservation.update.mockResolvedValue({
          id: 'r1',
          status: ReservationStatus.APPROVED,
          carId: 'c1',
          approvedAt: new Date(),
          updatedAt: new Date(),
        });

        tx.auditLog.create.mockResolvedValue({} as any);

        return cb(tx);
      });

      const result = await service.approve(approver, 'r1', { carId: 'c1' });

      expect(result.status).toBe(ReservationStatus.APPROVED);
      expect(result.carId).toBe('c1');
    });

    it('deve lançar BadRequestException se reserva não estiver PENDING', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
          status: ReservationStatus.APPROVED,
        });
        return cb(tx);
      });

      await expect(
        service.approve(approver, 'r1', { carId: 'c1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve lançar ConflictException em caso de overlap', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();

        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
          status: ReservationStatus.PENDING,
          startAt: new Date(),
          endAt: new Date(Date.now() + 3600000),
        });

        tx.car.findUnique.mockResolvedValue({
          id: 'c1',
          tenantId: 't1',
          status: CarStatus.AVAILABLE,
        });

        tx.reservation.count.mockResolvedValue(1);

        return cb(tx);
      });

      await expect(
        service.approve(approver, 'r1', { carId: 'c1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('deve lançar NotFoundException se reserva não pertencer ao tenant', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();

        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 'tX',
          status: ReservationStatus.PENDING,
        });

        return cb(tx);
      });

      await expect(
        service.approve(approver, 'r1', { carId: 'c1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve lançar NotFoundException se carro não pertencer ao tenant', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();

        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
          status: ReservationStatus.PENDING,
          startAt: new Date(),
          endAt: new Date(Date.now() + 3600000),
          carId: null,
          branchId: null,
        });

        tx.car.findUnique.mockResolvedValue({
          id: 'c1',
          tenantId: 'tX',
          status: CarStatus.AVAILABLE,
        });

        return cb(tx);
      });

      await expect(
        service.approve(approver, 'r1', { carId: 'c1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // CANCEL
  describe('cancel', () => {
    const requester = {
      userId: 'u1',
      tenantId: 't1',
      role: 'REQUESTER' as const,
    };

    it('REQUESTER dono pode cancelar se PENDING', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();

        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
          userId: 'u1',
          status: ReservationStatus.PENDING,
          carId: null,
        });

        tx.reservation.update.mockResolvedValue({
          id: 'r1',
          status: ReservationStatus.CANCELED,
          canceledAt: new Date(),
          updatedAt: new Date(),
          carId: null,
        });

        tx.auditLog.create.mockResolvedValue({} as any);

        return cb(tx);
      });

      const result = await service.cancel(requester, 'r1');

      expect(result.status).toBe(ReservationStatus.CANCELED);
    });

    it('REQUESTER dono com carro vinculado deve liberar o carro ao cancelar', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();

        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
          userId: 'u1',
          status: ReservationStatus.PENDING,
          carId: 'c1',
        });

        tx.reservation.update.mockResolvedValue({
          id: 'r1',
          status: ReservationStatus.CANCELED,
          canceledAt: new Date(),
          updatedAt: new Date(),
          carId: 'c1',
        });

        tx.car.updateMany.mockResolvedValue({ count: 1 });
        tx.auditLog.create.mockResolvedValue({} as any);

        const result = await cb(tx);

        expect(tx.car.updateMany).toHaveBeenCalledWith({
          where: { id: 'c1' },
          data: { status: CarStatus.AVAILABLE },
        });

        return result;
      });

      const result = await service.cancel(requester, 'r1');

      expect(result.status).toBe(ReservationStatus.CANCELED);
    });

    it('deve lançar ForbiddenException se requester não for dono', async () => {
      const actor = {
        userId: 'other-user',
        tenantId: 't1',
        role: 'REQUESTER' as const,
      };

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
          userId: 'u1',
          status: ReservationStatus.PENDING,
        });
        return cb(tx);
      });

      await expect(service.cancel(actor, 'r1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('ADMIN pode cancelar reserva de outro usuário', async () => {
      const adminActor = {
        userId: 'admin1',
        tenantId: 't1',
        role: 'ADMIN' as const,
      };

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();

        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
          userId: 'u1',
          status: ReservationStatus.PENDING,
        });

        tx.reservation.update.mockResolvedValue({
          id: 'r1',
          status: ReservationStatus.CANCELED,
          canceledAt: new Date(),
          updatedAt: new Date(),
          carId: null,
        });

        tx.auditLog.create.mockResolvedValue({} as any);

        return cb(tx);
      });

      const result = await service.cancel(adminActor, 'r1');

      expect(result.status).toBe(ReservationStatus.CANCELED);
    });

    it('deve lançar ConflictException se reserva já estiver cancelada ou concluída', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
          userId: 'u1',
          status: ReservationStatus.CANCELED,
        });
        return cb(tx);
      });

      await expect(service.cancel(requester, 'r1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('deve lançar BadRequestException se status não for PENDING ou APPROVED', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
          userId: 'u1',
          status: ReservationStatus.REJECTED,
        });
        return cb(tx);
      });

      await expect(service.cancel(requester, 'r1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  // COMPLETE
  describe('complete', () => {
    it('REQUESTER deve enviar reserva APPROVED para validação, mantendo status', async () => {
      const actor = {
        userId: 'u1',
        tenantId: 't1',
        role: 'REQUESTER' as const,
      };

      const reservationMock = {
        id: 'r1',
        tenantId: 't1',
        userId: 'u1',
        status: ReservationStatus.APPROVED,
        origin: 'A',
        destination: 'B',
        startAt: new Date(),
        endAt: new Date(Date.now() + 3600000),
        carId: null,
        branchId: null,
      };

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.reservation.findUnique.mockResolvedValue(reservationMock);
        tx.auditLog.create.mockResolvedValue({} as any);
        return cb(tx);
      });

      const result = await service.complete(actor, 'r1');

      expect(result.status).toBe(ReservationStatus.APPROVED);
    });

    it('REQUESTER deve lançar BadRequestException se status não for APPROVED', async () => {
      const actor = {
        userId: 'u1',
        tenantId: 't1',
        role: 'REQUESTER' as const,
      };

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
          userId: 'u1',
          status: ReservationStatus.PENDING,
          origin: 'A',
          destination: 'B',
          startAt: new Date(),
          endAt: new Date(Date.now() + 3600000),
          carId: null,
          branchId: null,
        });
        return cb(tx);
      });

      await expect(service.complete(actor, 'r1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('APPROVER pode concluir reserva APPROVED', async () => {
      const actor = {
        userId: 'a1',
        tenantId: 't1',
        role: 'APPROVER' as const,
      };

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();

        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
          userId: 'u1',
          status: ReservationStatus.APPROVED,
          origin: 'A',
          destination: 'B',
          startAt: new Date(),
          endAt: new Date(Date.now() + 3600000),
          carId: null,
          branchId: null,
        });

        tx.reservation.update.mockResolvedValue({
          id: 'r1',
          status: ReservationStatus.COMPLETED,
          origin: 'A',
          destination: 'B',
          startAt: new Date(),
          endAt: new Date(Date.now() + 3600000),
          carId: null,
          branchId: null,
          updatedAt: new Date(),
        });

        tx.auditLog.create.mockResolvedValue({} as any);

        return cb(tx);
      });

      const result = await service.complete(actor, 'r1');

      expect(result.status).toBe(ReservationStatus.COMPLETED);
    });
  });

  // findStationsOnRoute
  describe('findStationsOnRoute', () => {
    it('deve listar postos ativos da mesma filial da reserva', async () => {
      const actor = {
        tenantId: 't1',
        userId: 'u1',
        role: 'APPROVER' as const,
      };

      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        tenantId: 't1',
        branchId: 'b1',
        userId: 'u1',
      });

      prisma.station.findMany.mockResolvedValue([
        {
          id: 's1',
          name: 'Posto 1',
          address: 'Rua X',
          branchId: 'b1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.findStationsOnRoute(actor as any, 'r1');

      expect(prisma.station.findMany).toHaveBeenCalledTimes(1);
      const whereArg = prisma.station.findMany.mock.calls[0][0].where;
      expect(whereArg.tenantId).toBe('t1');
      expect(whereArg.branchId).toBe('b1');
      expect(whereArg.isActive).toBe(true);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('s1');
    });

    it('deve lançar NotFoundException se reserva não existir ou tiver outro tenant', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        tenantId: 'tX',
        branchId: null,
        userId: 'u1',
      });

      await expect(
        service.findStationsOnRoute(
          { tenantId: 't1', userId: 'u1', role: 'APPROVER' } as any,
          'r1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('REQUESTER deve lançar ForbiddenException se não for dono da reserva', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        tenantId: 't1',
        branchId: null,
        userId: 'owner',
      });

      await expect(
        service.findStationsOnRoute(
          {
            tenantId: 't1',
            userId: 'other',
            role: 'REQUESTER',
          } as any,
          'r1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // listByCar
  describe('listByCar', () => {
    it('deve lançar ForbiddenException para REQUESTER', async () => {
      await expect(
        service.listByCar(
          {
            tenantId: 't1',
            userId: 'u1',
            role: 'REQUESTER',
          } as any,
          'c1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('APPROVER deve listar reservas por carro', async () => {
      prisma.reservation.findMany.mockResolvedValue([
        {
          id: 'r1',
          origin: 'A',
          destination: 'B',
          startAt: new Date(),
          endAt: new Date(),
          status: ReservationStatus.PENDING,
          user: { id: 'u1', name: 'Req', email: 'req@test' },
          car: { id: 'c1', plate: 'AAA-0000', model: 'Carro' },
        },
      ]);

      const actor = {
        tenantId: 't1',
        userId: 'a1',
        role: 'APPROVER' as const,
      };

      const result = await service.listByCar(actor as any, 'c1');

      expect(prisma.reservation.findMany).toHaveBeenCalledTimes(1);
      const whereArg = prisma.reservation.findMany.mock.calls[0][0].where;
      expect(whereArg.tenantId).toBe('t1');
      expect(whereArg.carId).toBe('c1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('r1');
    });
  });

  // maybeCompleteReservation
  describe('maybeCompleteReservation', () => {
    it('não deve completar se regras não forem atendidas (status != APPROVED)', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        status: ReservationStatus.PENDING,
      });

      await service.maybeCompleteReservation('r1', 'uX');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('deve completar reserva quando docs e checklists estiverem válidos', async () => {
      // Reserva APPROVED
      prisma.reservation.findUnique.mockResolvedValue({
        status: ReservationStatus.APPROVED,
      });

      // Docs: agregam para "Validated"
      prisma.document.findMany.mockResolvedValue([
        {
          type: 'CNH',
          status: 'APPROVED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Checklists: USER_RETURN + APPROVER_VALIDATION aprovado
      prisma.checklistSubmission.findMany.mockResolvedValue([
        {
          kind: 'USER_RETURN',
          payload: {},
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          kind: 'APPROVER_VALIDATION',
          payload: { decision: 'APPROVED' },
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      ]);

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          reservation: {
            update: jest.fn().mockResolvedValue({
              id: 'r1',
              tenantId: 't1',
              status: ReservationStatus.COMPLETED,
              carId: 'c1',
            }),
          },
          car: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };

        const result = await cb(tx);

        expect(tx.reservation.update).toHaveBeenCalledTimes(1);
        expect(tx.car.updateMany).toHaveBeenCalledWith({
          where: { id: 'c1' },
          data: { status: CarStatus.AVAILABLE },
        });
        expect(tx.auditLog.create).toHaveBeenCalledTimes(1);

        return result;
      });

      await service.maybeCompleteReservation('r1', 'uX');

      expect(prisma.reservation.findUnique).toHaveBeenCalled();
      expect(prisma.document.findMany).toHaveBeenCalled();
      expect(prisma.checklistSubmission.findMany).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // Helpers internos (aggregateDocsStatusForReservation / normalizeChecklistDecision)
  describe('aggregateDocsStatusForReservation', () => {
    it('retorna "Pending" quando não há documentos', () => {
      const result = (service as any).aggregateDocsStatusForReservation([]);
      expect(result).toBe('Pending');
    });

    it('retorna "InValidation" quando há documentos pendentes', () => {
      const docs = [
        {
          type: 'CNH',
          status: null,
          createdAt: new Date(),
          updatedAt: null,
        },
      ];
      const result = (service as any).aggregateDocsStatusForReservation(docs);
      expect(result).toBe('InValidation');
    });

    it('retorna "Validated" quando há algum documento aprovado e nenhum pendente', () => {
      const docs = [
        {
          type: 'CNH',
          status: 'APPROVED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const result = (service as any).aggregateDocsStatusForReservation(docs);
      expect(result).toBe('Validated');
    });

    it('retorna "PendingDocs" quando existem apenas rejeitados', () => {
      const docs = [
        {
          type: 'CNH',
          status: 'REJECTED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const result = (service as any).aggregateDocsStatusForReservation(docs);
      expect(result).toBe('PendingDocs');
    });
  });

  describe('normalizeChecklistDecision', () => {
    it('normaliza valores que indicam aprovação', () => {
      expect((service as any).normalizeChecklistDecision('approved')).toBe(
        'APPROVED',
      );
      expect((service as any).normalizeChecklistDecision('VALIDATED')).toBe(
        'APPROVED',
      );
      expect((service as any).normalizeChecklistDecision('Approve')).toBe(
        'APPROVED',
      );
    });

    it('normaliza valores que indicam rejeição', () => {
      expect((service as any).normalizeChecklistDecision('rejected')).toBe(
        'REJECTED',
      );
      expect((service as any).normalizeChecklistDecision('REJECT')).toBe(
        'REJECTED',
      );
    });

    it('retorna null quando não reconhece o valor', () => {
      expect((service as any).normalizeChecklistDecision('other')).toBeNull();
      expect((service as any).normalizeChecklistDecision(null)).toBeNull();
    });
  });

  // REMOVE
  describe('remove', () => {
    it('deve remover reserva quando tenant confere e ator é ADMIN', async () => {
      const adminActor = {
        tenantId: 't1',
        userId: 'admin1',
        role: 'ADMIN' as const,
      };

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
          status: ReservationStatus.PENDING,
          carId: null,
        });
        tx.reservation.delete.mockResolvedValue({} as any);
        tx.auditLog.create.mockResolvedValue({} as any);
        return cb(tx);
      });

      const result = await service.remove(adminActor, 'r1');

      expect(result).toEqual({ id: 'r1', deleted: true });
    });

    it('deve lançar NotFoundException quando tenant diverge', async () => {
      const adminActor = {
        tenantId: 't1',
        userId: 'admin1',
        role: 'ADMIN' as const,
      };

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 'tX',
          status: ReservationStatus.PENDING,
          carId: null,
        });
        return cb(tx);
      });

      await expect(service.remove(adminActor, 'r1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
