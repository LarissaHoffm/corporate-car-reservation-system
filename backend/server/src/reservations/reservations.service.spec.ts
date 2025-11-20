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
    },
    auditLog: {
      create: jest.fn(),
    },
  });

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (cb: any) => {
        const tx = makeTx();
        return cb(tx);
      }),
      reservation: {
        findUnique: jest.fn(),
        delete: jest.fn(),
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
        });

        tx.reservation.update.mockResolvedValue({
          id: 'r1',
          status: ReservationStatus.CANCELED,
          canceledAt: new Date(),
          updatedAt: new Date(),
        });

        tx.auditLog.create.mockResolvedValue({} as any);

        return cb(tx);
      });

      const result = await service.cancel(requester, 'r1');

      expect(result.status).toBe(ReservationStatus.CANCELED);
    });

    it('deve lançar ForbiddenException se não for REQUESTER', async () => {
      const actor = { userId: 'u1', tenantId: 't1', role: 'ADMIN' as const };

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

    it('deve lançar BadRequestException se status não for PENDING', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
          userId: 'u1',
          status: ReservationStatus.APPROVED,
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
    it('REQUESTER deve lançar ConflictException com PRECONDITION_REQUIRED', async () => {
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
          status: ReservationStatus.APPROVED,
        });
        return cb(tx);
      });

      await expect(service.complete(actor, 'r1')).rejects.toBeInstanceOf(
        ConflictException,
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
        });

        tx.reservation.update.mockResolvedValue({
          id: 'r1',
          status: ReservationStatus.COMPLETED,
        });

        tx.auditLog.create.mockResolvedValue({} as any);

        return cb(tx);
      });

      const result = await service.complete(actor, 'r1');

      expect(result.status).toBe(ReservationStatus.COMPLETED);
    });
  });

  // REMOVE

  describe('remove', () => {
    it('deve remover reserva quando tenant confere', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 't1',
        });
        tx.reservation.delete.mockResolvedValue({} as any);
        tx.auditLog.create.mockResolvedValue({} as any);
        return cb(tx);
      });

      const result = await service.remove(
        { tenantId: 't1', userId: 'admin1' } as any,
        'r1',
      );

      expect(result).toEqual({ id: 'r1', deleted: true });
    });

    it('deve lançar NotFoundException quando tenant diverge', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = makeTx();
        tx.reservation.findUnique.mockResolvedValue({
          id: 'r1',
          tenantId: 'tX',
        });
        return cb(tx);
      });

      await expect(
        service.remove({ tenantId: 't1', userId: 'admin1' } as any, 'r1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
