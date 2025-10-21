import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CarsService {
  constructor(private prisma: PrismaService) { }

  private normalizePlate(plate: string) {
    return plate.trim().toUpperCase().replace(/[-\s]/g, '');
  }

  async list(tenantId: string, branchId?: string) {
    return this.prisma.car.findMany({
      where: { tenantId, ...(branchId ? { branchId } : {}) },
      orderBy: [{ status: 'asc' }, { model: 'asc' }],
      select: {
        id: true,
        plate: true,
        model: true,
        color: true,
        mileage: true,
        status: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getById(tenantId: string, id: string) {
    const car = await this.prisma.car.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        plate: true,
        model: true,
        color: true,
        mileage: true,
        status: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!car || car.tenantId !== tenantId) {
      throw new NotFoundException('Carro não encontrado');
    }
    const { tenantId: _omit, ...safe } = car;
    return safe;
  }

  async create(tenantId: string, dto: CreateCarDto) {
    const data: Prisma.CarCreateInput = {
      tenant: { connect: { id: tenantId } },
      ...(dto.branchId ? { branch: { connect: { id: dto.branchId } } } : {}),
      plate: this.normalizePlate(dto.plate),
      model: dto.model,
      color: dto.color ?? null,
      mileage: dto.mileage,
    };

    try {
      return await this.prisma.car.create({
        data,
        select: {
          id: true,
          plate: true,
          model: true,
          color: true,
          mileage: true,
          status: true,
          branchId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Placa já cadastrada neste tenant');
      }
      throw e;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateCarDto) {
    // checagem multi-tenant
    const existing = await this.prisma.car.findUnique({
      where: { id },
      select: { id: true, tenantId: true },
    });
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException('Carro não encontrado');
    }

    const data: Prisma.CarUpdateInput = {
      ...(dto.plate ? { plate: this.normalizePlate(dto.plate) } : {}),
      ...(dto.model ? { model: dto.model } : {}),
      ...(dto.color !== undefined ? { color: dto.color ?? null } : {}),
      ...(dto.mileage !== undefined ? { mileage: dto.mileage } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.branchId !== undefined
        ? (dto.branchId
          ? { branch: { connect: { id: dto.branchId } } }
          : { branch: { disconnect: true } })
        : {}),
    };

    try {
      return await this.prisma.car.update({
        where: { id },
        data,
        select: {
          id: true,
          plate: true,
          model: true,
          color: true,
          mileage: true,
          status: true,
          branchId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Placa já cadastrada neste tenant');
      }
      throw e;
    }
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.car.findUnique({
      where: { id },
      select: { tenantId: true },
    });
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException('Carro não encontrado');
    }

    await this.prisma.car.delete({ where: { id } });
    return { ok: true };
  }
}
