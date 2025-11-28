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

  /** Marca carro como IN_USE após aprovação. */
  private async markCarInUse(
    tx: Prisma.TransactionClient,
    carId: string,
  ): Promise<void> {
    await tx.car.updateMany({
      where: { id: carId },
      data: { status: CarStatus.IN_USE },
    });
  }

  /**
   * Libera o carro para uso futuro.
   *
   * Aqui **não** filtramos por status atual: sempre que a reserva for
   * concluída/cancelada, garantimos que o carro volte para AVAILABLE,
   * independente do valor anterior.
   */
  private async releaseCar(
    tx: Prisma.TransactionClient,
    carId: string,
  ): Promise<void> {
    await tx.car.updateMany({
      where: { id: carId },
      data: { status: CarStatus.AVAILABLE },
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

  /**
   * Lista postos "no trajeto" da reserva:
   *
   * - Filtra por tenant da reserva
   * - Se houver branchId na reserva, usa a mesma branch
   * - Apenas postos ativos (isActive = true)
   *
   * RBAC:
   * - REQUESTER só pode ver reservas próprias
   * - APPROVER / ADMIN podem ver qualquer reserva do tenant
   */
  async findStationsOnRoute(actor: ActorBase, reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        userId: true,
      },
    });

    if (!reservation || reservation.tenantId !== actor.tenantId) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    if (
      actor.role === 'REQUESTER' &&
      reservation.userId &&
      reservation.userId !== actor.userId
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta reserva.',
      );
    }

    const where: Prisma.StationWhereInput = {
      tenantId: actor.tenantId,
      isActive: true,
      ...(reservation.branchId ? { branchId: reservation.branchId } : {}),
    };

    const stations = await this.prisma.station.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        address: true,
        branchId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Simples: retorna apenas a lista de postos.
    return stations;
  }

  /** Aprovação com vínculo de carro. */
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

      if (updated.carId) {
        await this.markCarInUse(tx, updated.carId);
      }

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

  /**
   * Cancelamento de reserva:
   * - REQUESTER: pode cancelar apenas as próprias reservas.
   * - APPROVER / ADMIN: podem cancelar qualquer reserva do tenant.
   * - Status permitidos: PENDING e APPROVED.
   */
  async cancel(actor: ActorBase, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({
        where: { id },
        select: {
          id: true,
          tenantId: true,
          userId: true,
          status: true,
          carId: true,
        },
      });
      if (!r || r.tenantId !== actor.tenantId) {
        throw new NotFoundException('Reserva não encontrada.');
      }

      const isOwner = r.userId === actor.userId;
      const isAdminOrApprover =
        actor.role === 'ADMIN' || actor.role === 'APPROVER';

      if (!isOwner && !isAdminOrApprover) {
        throw new ForbiddenException(
          'Você não tem permissão para cancelar esta reserva.',
        );
      }

      // Já finalizada / cancelada
      if (
        r.status === ReservationStatus.CANCELED ||
        r.status === ReservationStatus.COMPLETED
      ) {
        throw new ConflictException('Reserva já finalizada ou cancelada.');
      }

      // Permitido apenas PENDING e APPROVED
      if (
        r.status !== ReservationStatus.PENDING &&
        r.status !== ReservationStatus.APPROVED
      ) {
        throw new BadRequestException(
          'Só é possível cancelar reservas PENDING ou APPROVED.',
        );
      }

      const updated = await tx.reservation.update({
        where: { id: r.id },
        data: {
          status: ReservationStatus.CANCELED,
          canceledAt: new Date(),
        },
        select: {
          id: true,
          status: true,
          canceledAt: true,
          updatedAt: true,
          carId: true,
        },
      });

      if (r.carId) {
        await this.releaseCar(tx, r.carId);
      }

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

  /**
   * Conclusão de reserva:
   * - REQUESTER: apenas envia para validação (mantém status APPROVED).
   * - APPROVER / ADMIN: pode marcar como COMPLETED manualmente.
   *
   * A conclusão automática (docs + checklist) é feita por maybeCompleteReservation,
   * chamada pelos fluxos de documentos e checklist.
   */
  async complete(actor: ActorBase, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({
        where: { id },
        select: {
          id: true,
          tenantId: true,
          userId: true,
          status: true,
          origin: true,
          destination: true,
          startAt: true,
          endAt: true,
          carId: true,
          branchId: true,
        },
      });

      if (!r || r.tenantId !== actor.tenantId) {
        throw new NotFoundException('Reserva não encontrada.');
      }

      // Fluxo REQUESTER
      if (actor.role === 'REQUESTER') {
        if (r.userId !== actor.userId) {
          throw new ForbiddenException(
            'Sem permissão para finalizar esta reserva.',
          );
        }

        if (r.status !== ReservationStatus.APPROVED) {
          throw new BadRequestException(
            'Só é possível finalizar reservas aprovadas.',
          );
        }

        await this.log(tx, {
          tenantId: actor.tenantId,
          userId: actor.userId,
          action: 'reservation.sent_for_validation',
          entity: 'Reservation',
          entityId: r.id,
          metadata: {
            statusBefore: r.status,
          },
        });

        // Mantém status APPROVED — conclusão automática via docs/checklist
        return r;
      }

      // Fluxo APPROVER / ADMIN
      if (r.status !== ReservationStatus.APPROVED) {
        throw new BadRequestException(
          `Só é possível concluir reservas APROVADAS (atual: ${r.status}).`,
        );
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

      if (updated.carId) {
        await this.releaseCar(tx, updated.carId);
      }

      await this.log(tx, {
        tenantId: actor.tenantId,
        userId: actor.userId,
        action: 'reservation.completed.manual',
        entity: 'Reservation',
        entityId: r.id,
        metadata: {
          statusBefore: r.status,
        },
      });

      return updated;
    });
  }

  private normalizeValidationStatus(
    raw?: string | null,
  ): 'PENDING' | 'APPROVED' | 'REJECTED' {
    if (!raw) return 'PENDING';
    const s = String(raw).toUpperCase();

    if (s === 'APPROVED' || s === 'VALIDATED' || s === 'APPROVE') {
      return 'APPROVED';
    }

    if (s === 'REJECTED' || s === 'REJECT') {
      return 'REJECTED';
    }

    return 'PENDING';
  }

  /**
   * Agrega o status dos documentos de uma reserva de forma simples:
   *
   * - Se existir QUALQUER documento pendente (null / "PENDING") → "InValidation"
   * - Senão, se existir ALGUM aprovado → "Validated"
   * - Senão, se existir ALGUM rejeitado → "PendingDocs"
   * - Senão → "Pending"
   *
   * Isso garante que, se um documento foi rejeitado e o usuário reenviar
   * outro que seja aprovado, o status passe a ser "Validated" mesmo que
   * ainda existam rejeitados antigos no histórico.
   */
  private aggregateDocsStatusForReservation(
    docs: {
      type: string | null;
      status: string | null;
      createdAt: Date;
      updatedAt: Date | null;
    }[],
  ): 'Pending' | 'InValidation' | 'PendingDocs' | 'Validated' {
    if (!docs.length) {
      return 'Pending';
    }

    let anyPending = false;
    let anyApproved = false;
    let anyRejected = false;

    for (const doc of docs) {
      const status = this.normalizeValidationStatus(doc.status);

      if (status === 'APPROVED') {
        anyApproved = true;
      } else if (status === 'REJECTED') {
        anyRejected = true;
      } else {
        // tudo que não for APPROVED / REJECTED tratamos como pendente
        anyPending = true;
      }
    }

    if (anyPending) return 'InValidation';
    if (anyApproved) return 'Validated';
    if (anyRejected) return 'PendingDocs';
    return 'Pending';
  }

  private normalizeChecklistDecision(raw: any): 'APPROVED' | 'REJECTED' | null {
    if (!raw) return null;
    const s = String(raw).toUpperCase();
    if (s === 'APPROVED' || s === 'VALIDATED' || s === 'APPROVE') {
      return 'APPROVED';
    }
    if (s === 'REJECTED' || s === 'REJECT') {
      return 'REJECTED';
    }
    return null;
  }

  /**
   * Regra para COMPLETED:
   * - Reserva deve estar APPROVED
   * - Último doc de cada tipo deve estar APPROVED (aggregate = "Validated")
   * - Deve existir USER_RETURN e APPROVER_VALIDATION com decisão APPROVED/REJECTED
   */
  private async shouldCompleteReservation(
    reservationId: string,
  ): Promise<boolean> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { status: true },
    });

    if (!reservation) return false;
    if (reservation.status !== ReservationStatus.APPROVED) return false;

    // 1) Documentos
    const docs = await this.prisma.document.findMany({
      where: { reservationId },
      select: {
        type: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const docsAggregate = this.aggregateDocsStatusForReservation(docs as any[]);
    if (docsAggregate !== 'Validated') {
      return false;
    }

    // 2) Checklists
    const submissions = await this.prisma.checklistSubmission.findMany({
      where: { reservationId },
      select: {
        kind: true,
        payload: true,
        createdAt: true,
      },
    });

    if (!submissions.length) return false;

    const hasUserReturn = submissions.some((s) => s.kind === 'USER_RETURN');
    if (!hasUserReturn) return false;

    const validations = submissions.filter(
      (s) => s.kind === 'APPROVER_VALIDATION',
    );
    if (!validations.length) return false;

    const latest = validations.reduce((best, curr) => {
      const tb = new Date(best.createdAt).getTime();
      const tc = new Date(curr.createdAt).getTime();
      return tc > tb ? curr : best;
    });

    const payload: any = latest.payload ?? {};

    const decision =
      this.normalizeChecklistDecision((latest as any).decision) ??
      this.normalizeChecklistDecision((latest as any).result) ??
      this.normalizeChecklistDecision((latest as any).status) ??
      this.normalizeChecklistDecision(payload.decision) ??
      this.normalizeChecklistDecision(payload.result) ??
      this.normalizeChecklistDecision(payload.status);

    // Tanto APPROVED quanto REJECTED concluem a reserva (UI diferencia depois)
    return decision === 'APPROVED' || decision === 'REJECTED';
  }

  async maybeCompleteReservation(
    reservationId: string,
    actorId?: string | null,
  ): Promise<void> {
    const can = await this.shouldCompleteReservation(reservationId);
    if (!can) return;

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.COMPLETED },
        select: {
          id: true,
          tenantId: true,
          status: true,
          carId: true,
        },
      });

      if (updated.carId) {
        await this.releaseCar(tx, updated.carId);
      }

      await tx.auditLog.create({
        data: {
          tenantId: updated.tenantId,
          userId: actorId ?? null,
          action: 'reservation.completed',
          entity: 'Reservation',
          entityId: updated.id,
          metadata: {
            via: 'docs+checklist',
          } as any,
        },
      });
    });
  }

  async listByCar(
    actor: Pick<ActorBase, 'tenantId' | 'role' | 'userId'>,
    carId: string,
  ) {
    if (actor.role === 'REQUESTER') {
      throw new ForbiddenException(
        'Apenas aprovadores ou administradores podem listar reservas por carro.',
      );
    }

    return this.prisma.reservation.findMany({
      where: {
        tenantId: actor.tenantId,
        carId,
      },
      orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        origin: true,
        destination: true,
        startAt: true,
        endAt: true,
        status: true,
        user: { select: { id: true, name: true, email: true } },
        car: { select: { id: true, plate: true, model: true } },
      },
    });
  }

  async remove(
    actor: Pick<ActorBase, 'tenantId' | 'userId' | 'role'>,
    id: string,
  ) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Apenas administradores podem excluir reservas.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({
        where: { id },
        select: {
          id: true,
          tenantId: true,
          status: true,
          carId: true,
        },
      });

      if (!r || r.tenantId !== actor.tenantId) {
        throw new NotFoundException('Reserva não encontrada.');
      }

      if (r.status === ReservationStatus.COMPLETED) {
        throw new BadRequestException(
          'Não é possível excluir reservas concluídas.',
        );
      }

      if (r.carId) {
        await this.releaseCar(tx, r.carId);
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
