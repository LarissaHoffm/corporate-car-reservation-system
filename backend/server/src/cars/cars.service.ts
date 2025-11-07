import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { Prisma } from '@prisma/client';

type ListFilters = { branchId?: string; status?: Prisma.CarWhereInput['status'] };

@Injectable()
export class CarsService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, filters?: ListFilters) {
    const where: Prisma.CarWhereInput = {
      tenantId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.branchId ? { branchId: filters.branchId } : {}),
    };

    return this.prisma.car.findMany({
      where,
      orderBy: [{ status: 'asc' }, { model: 'asc' }],
      select: {
        id: true,
        plate: true,
        model: true,
        color: true,
        mileage: true,
        status: true,
        branchId: true,
      },
    });
  }

  async getById(tenantId: string, id: string) {
    const car = await this.prisma.car.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        plate: true,
        model: true,
        color: true,
        mileage: true,
        status: true,
        branchId: true,
      },
    });
    if (!car) throw new NotFoundException('Car not found');
    return car;
  }

  private async resolveBranchId(
    tenantId: string,
    dto: { branchId?: string | null; branchName?: string | null },
  ): Promise<string | null | undefined> {
    if (dto.branchId !== undefined) {
      return dto.branchId ?? null;
    }
    if (dto.branchName) {
      const b = await this.prisma.branch.findFirst({
        where: { tenantId, name: dto.branchName },
        select: { id: true },
      });
      if (!b) {
        throw new BadRequestException('branchName not found for this tenant');
      }
      return b.id;
    }
    return undefined; 
  }

  async create(tenantId: string, dto: CreateCarDto) {
    const exists = await this.prisma.car.findFirst({
      where: { tenantId, plate: dto.plate },
      select: { id: true },
    });
    if (exists) throw new ConflictException('Plate already registered for this tenant');

    const resolvedBranchId = await this.resolveBranchId(tenantId, dto);

    try {
      return await this.prisma.car.create({
        data: {
          tenantId,
          plate: dto.plate, // normalizada no DTO
          model: dto.model,
          color: dto.color ?? null,
          mileage: dto.mileage ?? 0,
          status: dto.status ?? undefined, 
          branchId: resolvedBranchId ?? null,
        },
        select: {
          id: true,
          plate: true,
          model: true,
          color: true,
          mileage: true,
          status: true,
          branchId: true,
        },
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // unique constraint (tenantId, plate)
        throw new ConflictException('Plate already registered for this tenant');
      }
      throw e;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateCarDto) {
    const current = await this.prisma.car.findFirst({ where: { id, tenantId } });
    if (!current) throw new NotFoundException('Car not found');

    // Pré-checagem 
    if (dto.plate && dto.plate !== current.plate) {
      const dup = await this.prisma.car.findFirst({
        where: { tenantId, plate: dto.plate, NOT: { id } },
        select: { id: true },
      });
      if (dup) throw new ConflictException('Plate already registered for this tenant');
    }

    const resolvedBranchId =
      dto.branchId !== undefined || dto.branchName
        ? await this.resolveBranchId(tenantId, dto)
        : undefined;

    try {
      return await this.prisma.car.update({
        where: { id },
        data: {
          ...(dto.plate !== undefined ? { plate: dto.plate } : {}),
          ...(dto.model !== undefined ? { model: dto.model } : {}),
          ...(dto.color !== undefined ? { color: dto.color } : {}),
          ...(dto.mileage !== undefined ? { mileage: dto.mileage } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(resolvedBranchId !== undefined ? { branchId: resolvedBranchId } : {}),
        },
        select: {
          id: true,
          plate: true,
          model: true,
          color: true,
          mileage: true,
          status: true,
          branchId: true,
        },
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Plate already registered for this tenant');
      }
      throw e;
    }
  }

  async remove(tenantId: string, id: string) {
    const ok = await this.prisma.car.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!ok) throw new NotFoundException('Car not found');

    try {
      await this.prisma.car.delete({ where: { id } });
      return { ok: true };
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        // foreign key constraint failed
        throw new ConflictException('Cannot remove: related records exist for this car');
      }
      throw e;
    }
  }
}
