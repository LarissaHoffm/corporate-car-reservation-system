import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { Prisma, ReservationStatus, CarStatus } from '@prisma/client';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ApproveReservationDto } from './dto/approve-reservation.dto';
import { QueryReservationsDto } from './dto/query-reservations.dto';

type ActorBase = {
  userId: string;
  tenantId: string;
  role: 'REQUESTER' | 'APPROVER' | 'ADMIN';
  branchId?: string | null;
};

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Aux de conflito de horário para o mesmo carro (PENDING/APPROVED). */
  private async assertNoOverlap(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      carId?: string | null;
      startAt: Date;
      endAt: Date;
      excludeId?: string;
    },
  ) {
    const { tenantId, carId, startAt, endAt, excludeId } = params;
    if (!carId) return;

    const overlap = await tx.reservation.count({
      where: {
        tenantId,
        carId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.APPROVED] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });

    if (overlap > 0) {
      throw new ConflictException(
        'Conflito de horário para o carro informado.',
      );
    }
  }

  /** Aux para logging mínimo (RNF08). */
  private async log(
    tx: Prisma.TransactionClient,
    args: {
      tenantId: string;
      userId?: string | null;
      action: string;
      entity: string;
      entityId: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const { tenantId, userId, action, entity, entityId, metadata } = args;
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? null,
        action,
        entity,
        entityId,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  }

  /** Criação de reserva — aceita sem carro/filial, status = PENDING. */
  async create(actor: ActorBase, dto: CreateReservationDto) {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Datas inválidas.');
    }
    if (end <= start) {
      throw new BadRequestException(
        'Período inválido (fim deve ser depois do início).',
      );
    }

    const branchToUse: string | null = dto.branchId ?? actor.branchId ?? null;

    return this.prisma.$transaction(async (tx) => {
      // valida carro (se informado)
      if (dto.carId) {
        const car = await tx.car.findUnique({
          where: { id: dto.carId },
          select: { id: true, tenantId: true, status: true },
        });
        if (!car || car.tenantId !== actor.tenantId) {
          throw new NotFoundException('Carro não encontrado.');
        }
        if (car.status !== CarStatus.AVAILABLE) {
          throw new BadRequestException('Carro indisponível.');
        }

        await this.assertNoOverlap(tx, {
          tenantId: actor.tenantId,
          carId: dto.carId,
          startAt: start,
          endAt: end,
        });
      }

      const data: Prisma.ReservationCreateInput = {
        tenant: { connect: { id: actor.tenantId } },
        user: { connect: { id: actor.userId } },
        ...(branchToUse ? { branch: { connect: { id: branchToUse } } } : {}),
        ...(dto.carId ? { car: { connect: { id: dto.carId } } } : {}),
        origin: dto.origin,
        destination: dto.destination,
        startAt: start,
        endAt: end,
        status: ReservationStatus.PENDING,
        ...(dto.purpose ? { purpose: dto.purpose } : {}),
      };

      const created = await tx.reservation.create({
        data,
        select: {
          id: true,
          tenantId: true,
          origin: true,
          destination: true,
          startAt: true,
          endAt: true,
          status: true,
          purpose: true,
          carId: true,
          branchId: true,
          userId: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true } },
          car: { select: { id: true, plate: true, model: true } },
        },
      });

      await this.log(tx, {
        tenantId: actor.tenantId,
        userId: actor.userId,
        action: 'reservation.created',
        entity: 'Reservation',
        entityId: created.id,
        metadata: {
          origin: dto.origin,
          destination: dto.destination,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          branchId: branchToUse,
          carId: dto.carId ?? null,
          purpose: dto.purpose ?? null,
        },
      });

      return created;
    });
  }

  async list(
    actor: Pick<ActorBase, 'tenantId' | 'role' | 'userId'>,
    q: QueryReservationsDto,
  ) {
    const page = Math.max(1, Number(q.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize ?? 20)));

    const branchId = (q as any).branchId as string | undefined;
    const textQ = (q as any).q as string | undefined;

    const where: Prisma.ReservationWhereInput = {
      tenantId: actor.tenantId,
      ...(q.status ? { status: q.status as ReservationStatus } : {}),
      ...(q.userId ? { userId: q.userId } : {}),
      ...(q.carId ? { carId: q.carId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(q.from || q.to
        ? {
            AND: [
              q.from ? { startAt: { gte: new Date(q.from) } } : {},
              q.to ? { endAt: { lte: new Date(q.to) } } : {},
            ],
          }
        : {}),
      ...(textQ
        ? {
            OR: [
              { origin: { contains: textQ, mode: 'insensitive' } },
              { destination: { contains: textQ, mode: 'insensitive' } },
              { purpose: { contains: textQ, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (actor.role === 'REQUESTER') {
      where.userId = actor.userId;
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.reservation.count({ where }),
      this.prisma.reservation.findMany({
        where,
        orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          origin: true,
          destination: true,
          startAt: true,
          endAt: true,
          status: true,
          purpose: true,
          approvedAt: true,
          canceledAt: true,
          user: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true } },
          car: { select: { id: true, plate: true, model: true } },
        },
      }),
    ]);

    return { items, total, page, pageSize };
  }

  async getById(actor: Pick<ActorBase, 'tenantId'>, id: string) {
    const r = await this.prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        origin: true,
        destination: true,
        startAt: true,
        endAt: true,
        status: true,
        purpose: true,
        approvedAt: true,
        canceledAt: true,
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
        car: { select: { id: true, plate: true, model: true } },
      },
    });
    if (!r || r.tenantId !== actor.tenantId) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    return r;
  }

  /** A aprovação completa fica para o dia 10/11; mantendo aqui para compatibilidade. */
  async approve(
    actor: Pick<ActorBase, 'userId' | 'tenantId' | 'role'>,
    id: string,
    dto: ApproveReservationDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({
        where: { id },
        select: {
          id: true,
          tenantId: true,
          status: true,
          startAt: true,
          endAt: true,
          carId: true,
          branchId: true,
        },
      });
      if (!r || r.tenantId !== actor.tenantId) {
        throw new NotFoundException('Reserva não encontrada.');
      }
      if (r.status !== ReservationStatus.PENDING) {
        throw new BadRequestException(
          `Só é possível aprovar reservas PENDING (atual: ${r.status}).`,
        );
      }

      const car = await tx.car.findUnique({
        where: { id: dto.carId },
        select: { id: true, tenantId: true, status: true },
      });
      if (!car || car.tenantId !== actor.tenantId) {
        throw new NotFoundException('Carro não encontrado.');
      }
      if (car.status !== CarStatus.AVAILABLE) {
        throw new BadRequestException('Carro indisponível.');
      }

      await this.assertNoOverlap(tx, {
        tenantId: actor.tenantId,
        carId: dto.carId,
        startAt: r.startAt,
        endAt: r.endAt,
        excludeId: r.id,
      });

      const updated = await tx.reservation.update({
        where: { id: r.id },
        data: {
          status: ReservationStatus.APPROVED,
          approver: { connect: { id: actor.userId } },
          approvedAt: new Date(),
          car: { connect: { id: dto.carId } },
        },
        select: {
          id: true,
          status: true,
          carId: true,
          approvedAt: true,
          updatedAt: true,
        },
      });

      await this.log(tx, {
        tenantId: actor.tenantId,
        userId: actor.userId,
        action: 'reservation.approved',
        entity: 'Reservation',
        entityId: updated.id,
        metadata: { carId: dto.carId },
      });

      return updated;
    });
  }

  /** Cancelamento (Dia 08/11): apenas o solicitante e apenas se PENDING. */
  async cancel(actor: ActorBase, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({
        where: { id },
        select: {
          id: true,
          tenantId: true,
          userId: true,
          status: true,
        },
      });
      if (!r || r.tenantId !== actor.tenantId) {
        throw new NotFoundException('Reserva não encontrada.');
      }

      // Escopo de hoje: só o dono pode cancelar e somente se PENDING.
      if (actor.role !== 'REQUESTER') {
        throw new ForbiddenException(
          'Somente o solicitante pode cancelar nesta fase.',
        );
      }
      if (r.userId !== actor.userId) {
        throw new ForbiddenException(
          'Sem permissão para cancelar esta reserva.',
        );
      }
      if (r.status !== ReservationStatus.PENDING) {
        throw new BadRequestException(
          'Só é possível cancelar reservas PENDING.',
        );
      }

      const updated = await tx.reservation.update({
        where: { id: r.id },
        data: {
          status: ReservationStatus.CANCELED,
          canceledAt: new Date(),
        },
        select: { id: true, status: true, canceledAt: true, updatedAt: true },
      });

      await this.log(tx, {
        tenantId: actor.tenantId,
        userId: actor.userId,
        action: 'reservation.canceled',
        entity: 'Reservation',
        entityId: updated.id,
      });

      return updated;
    });
  }

  async complete(actor: ActorBase, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({
        where: { id },
        select: { id: true, tenantId: true, userId: true, status: true },
      });

      if (!r || r.tenantId !== actor.tenantId) {
        throw new NotFoundException('Reserva não encontrada.');
      }

      if (actor.role === 'REQUESTER' && r.userId !== actor.userId) {
        throw new ForbiddenException(
          'Sem permissão para concluir esta reserva.',
        );
      }

      if (r.status !== ReservationStatus.APPROVED) {
        throw new BadRequestException(
          'Só é possível concluir reservas APROVADAS.',
        );
      }

      if (actor.role === 'REQUESTER') {
        throw new ConflictException({
          code: 'PRECONDITION_REQUIRED',
          message:
            'Envie os documentos obrigatórios e conclua o checklist antes de finalizar a reserva.',
          missing: ['documents', 'checklist'],
          nextAction: 'upload',
        } as any);
      }

      const updated = await tx.reservation.update({
        where: { id: r.id },
        data: { status: ReservationStatus.COMPLETED },
        select: {
          id: true,
          status: true,
          origin: true,
          destination: true,
          startAt: true,
          endAt: true,
          carId: true,
          branchId: true,
          updatedAt: true,
        },
      });

      await this.log(tx, {
        tenantId: actor.tenantId,
        userId: actor.userId,
        action: 'reservation.completed',
        entity: 'Reservation',
        entityId: updated.id,
      });

      return updated;
    });
  }

  async remove(
    actor: Pick<ActorBase, 'tenantId' | 'userId'>,
    id: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({
        where: { id },
        select: { id: true, tenantId: true },
      });

      if (!r || r.tenantId !== actor.tenantId) {
        throw new NotFoundException('Reserva não encontrada.');
      }

      await tx.reservation.delete({ where: { id: r.id } });

      await this.log(tx, {
        tenantId: actor.tenantId,
        userId: actor.userId,
        action: 'reservation.deleted',
        entity: 'Reservation',
        entityId: r.id,
        metadata: {},
      });

      return { id: r.id, deleted: true };
    });
  }
}
