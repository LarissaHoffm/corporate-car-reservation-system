import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../infra/prisma.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { QueryStationsDto } from './dto/query-stations.dto';

@Injectable()
export class StationsService {
  constructor(private prisma: PrismaService) {}

  async create(actor: { tenantId: string }, dto: CreateStationDto) {
    try {
      return await this.prisma.station.create({
        data: {
          tenantId: actor.tenantId,
          branchId: dto.branchId ?? null,
          name: dto.name.trim(),
          address: dto.address?.trim() ?? null,
          // isActive usa o default do banco (true) se não enviado
        },
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
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um posto com esse nome neste tenant',
        );
      }
      throw e;
    }
  }

  async list(actor: { tenantId: string }, q: QueryStationsDto) {
    const page = Math.max(1, Number(q.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize ?? 20)));

    const where: Prisma.StationWhereInput = {
      tenantId: actor.tenantId,
      ...(q.branchId ? { branchId: q.branchId } : {}),
      ...(q.q
        ? {
            OR: [
              { name: { contains: q.q, mode: 'insensitive' } },
              { address: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.station.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          address: true,
          branchId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.station.count({ where }),
    ]);

    return { page, pageSize, total, items, data: items };
  }

  async get(actor: { tenantId: string }, id: string) {
    const s = await this.prisma.station.findFirst({
      where: { id, tenantId: actor.tenantId },
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
    if (!s) throw new NotFoundException('Posto não encontrado');
    return s;
  }

  async update(actor: { tenantId: string }, id: string, dto: UpdateStationDto) {
    const data: Prisma.StationUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.address !== undefined
        ? { address: dto.address?.trim() ?? null }
        : {}),
      ...(dto.branchId !== undefined
        ? dto.branchId
          ? { branchId: dto.branchId }
          : { branchId: null }
        : {}),
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        const belongs = await tx.station.findFirst({
          where: { id, tenantId: actor.tenantId },
          select: { id: true },
        });

        if (!belongs) {
          throw new NotFoundException('Posto não encontrado');
        }

        const s = await tx.station.update({
          where: { id },
          data,
          select: {
            id: true,
            name: true,
            address: true,
            branchId: true,
            isActive: true,
            updatedAt: true,
          },
        });

        return s;
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um posto com esse nome neste tenant',
        );
      }
      throw e;
    }
  }

  async remove(actor: { tenantId: string }, id: string) {
    const s = await this.prisma.station.findFirst({
      where: { id, tenantId: actor.tenantId },
      select: { id: true },
    });
    if (!s) throw new NotFoundException('Posto não encontrado');

    await this.prisma.station.delete({ where: { id: s.id } });
    return { ok: true };
  }
}
