import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ApproveReservationDto } from './dto/approve-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { QueryReservationsDto } from './dto/query-reservations.dto';
import { Prisma, ReservationStatus, CarStatus } from '@prisma/client';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) { }

  // overlap
  private async assertNoOverlap(
    tx: Prisma.TransactionClient,
    args: {
      tenantId: string;
      carId: string;
      startAt: Date;
      endAt: Date;
      excludeId?: string;
    },
  ) {
    const conflict = await tx.reservation.findFirst({
      where: {
        tenantId: args.tenantId,
        carId: args.carId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.APPROVED] },
        startAt: { lt: args.endAt },
        endAt: { gt: args.startAt },
        ...(args.excludeId ? { id: { not: args.excludeId } } : {}),
      },
      select: { id: true, startAt: true, endAt: true, status: true },
    });

    if (conflict) {
      throw new ConflictException(
        `Já existe reserva para este carro no período (${conflict.startAt.toISOString()} – ${conflict.endAt.toISOString()})`,
      );
    }
  }

  // Criar
  async create(
    actor: {
      userId: string;
      tenantId: string;
      branchId?: string;
      role: 'REQUESTER' | 'APPROVER' | 'ADMIN';
    },
    dto: CreateReservationDto,
  ) {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Datas inválidas');
    }
    if (end <= start) {
      throw new BadRequestException('Período inválido (fim deve ser depois do início)');
    }

    if (!actor.branchId) {
      throw new ForbiddenException('branchId obrigatório');
    }
    const branchId = actor.branchId as string;

    return this.prisma.$transaction(async (tx) => {
      const car = await tx.car.findUnique({
        where: { id: dto.carId },
        select: { id: true, tenantId: true, status: true },
      });
      if (!car || car.tenantId !== actor.tenantId) {
        throw new NotFoundException('Carro não encontrado');
      }
      if (car.status !== CarStatus.AVAILABLE) {
        throw new BadRequestException('Carro Indisponivel');
      }

      await this.assertNoOverlap(tx, {
        tenantId: actor.tenantId,
        carId: dto.carId,
        startAt: start,
        endAt: end,
      });

      return tx.reservation.create({
        data: {
          tenantId: actor.tenantId,
          branchId,
          userId: actor.userId,
          carId: dto.carId,
          origin: dto.origin,
          destination: dto.destination,
          startAt: start,
          endAt: end,
          status: ReservationStatus.PENDING,
        },
        select: {
          id: true,
          carId: true,
          origin: true,
          destination: true,
          startAt: true,
          endAt: true,
          status: true,
          createdAt: true,
        },
      });
    });
  }

  async approve(
    actor: { userId: string; tenantId: string; role: 'APPROVER' | 'ADMIN' },
    id: string,
    _dto: ApproveReservationDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({
        where: { id },
        select: { id: true, tenantId: true, carId: true, startAt: true, endAt: true, status: true },
      });
      if (!r || r.tenantId !== actor.tenantId) {
        throw new NotFoundException('Reserva não encontrada');
      }
      if (r.status !== ReservationStatus.PENDING) {
        throw new BadRequestException(`Só é possível aprovar reservas PENDING (atual: ${r.status})`);
      }

      await this.assertNoOverlap(tx, {
        tenantId: r.tenantId,
        carId: r.carId,
        startAt: r.startAt,
        endAt: r.endAt,
        excludeId: r.id,
      });

      return tx.reservation.update({
        where: { id: r.id },
        data: { status: ReservationStatus.APPROVED, approverId: actor.userId },
        select: { id: true, status: true, approverId: true, updatedAt: true },
      });
    });
  }

  async cancel(
    actor: { userId: string; tenantId: string; role: 'REQUESTER' | 'APPROVER' | 'ADMIN' },
    id: string,
    _dto: CancelReservationDto,
  ) {
    const r = await this.prisma.reservation.findUnique({
      where: { id },
      select: { id: true, tenantId: true, userId: true, status: true },
    });
    if (!r || r.tenantId !== actor.tenantId) {
      throw new NotFoundException('Reserva não encontrada');
    }
    if (actor.role === 'REQUESTER' && r.userId !== actor.userId) {
      throw new ForbiddenException('Sem permissão para cancelar');
    }
    if (r.status === ReservationStatus.CANCELED) {
      return { id: r.id, status: r.status };
    }
    return this.prisma.reservation.update({
      where: { id: r.id },
      data: { status: ReservationStatus.CANCELED },
      select: { id: true, status: true, updatedAt: true },
    });
  }

  async remove(
    actor: { userId: string; tenantId: string; role: 'ADMIN' | 'APPROVER' | 'REQUESTER' },
    id: string,
  ) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas ADMIN pode excluir solicitações');
    }
    const r = await this.prisma.reservation.findUnique({
      where: { id },
      select: { id: true, tenantId: true },
    });
    if (!r || r.tenantId !== actor.tenantId) {
      throw new NotFoundException('Reserva não encontrada');
    }
    await this.prisma.reservation.delete({ where: { id: r.id } });
    return { ok: true };
  }

  async get(actor: { tenantId: string; role: string; userId: string }, id: string) {
    const r = await this.prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        userId: true,
        approverId: true,
        carId: true,
        origin: true,
        destination: true,
        startAt: true,
        endAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!r || r.tenantId !== actor.tenantId) throw new NotFoundException('Reserva não encontrada');
    if (actor.role === 'REQUESTER' && r.userId !== actor.userId) throw new ForbiddenException('Sem permissão');
    return r;
  }

  // Listagem
  async list(
    actor: { tenantId: string; role: 'REQUESTER' | 'APPROVER' | 'ADMIN'; userId: string },
    query: QueryReservationsDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.ReservationWhereInput = {
      tenantId: actor.tenantId,
      ...(actor.role === 'REQUESTER' ? { userId: actor.userId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.carId ? { carId: query.carId } : {}),
      ...(query.userId && actor.role !== 'REQUESTER' ? { userId: query.userId } : {}),
      ...(query.from || query.to
        ? {
          // “toca o intervalo”: startAt < to  AND  endAt > from
          ...(query.to ? { startAt: { lt: new Date(query.to) } } : {}),
          ...(query.from ? { endAt: { gt: new Date(query.from) } } : {}),
        }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,
        orderBy: { startAt: 'desc' },
        select: {
          id: true,
          userId: true,
          approverId: true,
          carId: true,
          origin: true,
          destination: true,
          startAt: true,
          endAt: true,
          status: true,
          createdAt: true,
        },
        skip,
        take,
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
