import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CarsService } from './cars.service';
import { PrismaService } from '../infra/prisma.service';
import { PrismaServiceMock } from '../../test/mocks/prisma.mock';

describe('CarsService', () => {
  let service: CarsService;
  let prisma: any;

  beforeEach(() => {
    prisma = new PrismaServiceMock() as any;

    // Garante que prisma.car exista e tenha todos os métodos usados nos testes
    const baseCar = prisma.car || {};
    prisma.car = {
      findMany: baseCar.findMany || jest.fn(),
      findFirst: baseCar.findFirst || jest.fn(),
      create: baseCar.create || jest.fn(),
      update: baseCar.update || jest.fn(),
      delete: baseCar.delete || jest.fn(),
    };

    // Garante que prisma.branch exista com findFirst
    const baseBranch = prisma.branch || {};
    prisma.branch = {
      findFirst: baseBranch.findFirst || jest.fn(),
    };

    service = new CarsService(prisma as unknown as PrismaService);
  });

  describe('list', () => {
    it('list() deve filtrar por tenantId e ordenar por status/model', async () => {
      prisma.car.findMany.mockResolvedValueOnce([
        {
          id: '1',
          plate: 'ABC1D23',
          model: 'Onix',
          color: 'Prata',
          mileage: 1000,
          status: 'AVAILABLE',
          branchId: 'b1',
        },
      ]);

      const out = await service.list('tenant-1');

      expect(prisma.car.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
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
      expect(out).toHaveLength(1);
    });

    it('list() deve aplicar filtros de branchId e status quando informados', async () => {
      prisma.car.findMany.mockResolvedValueOnce([]);

      await service.list('tenant-1', {
        branchId: 'branch-1',
        status: 'AVAILABLE' as any,
      });

      expect(prisma.car.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          status: 'AVAILABLE',
        },
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
    });
  });

  describe('getById', () => {
    it('getById() deve buscar carro por id e tenantId', async () => {
      const car = {
        id: 'car-1',
        plate: 'ABC1D23',
        model: 'Onix',
        color: 'Prata',
        mileage: 1000,
        status: 'AVAILABLE',
        branchId: 'b1',
      };

      prisma.car.findFirst.mockResolvedValueOnce(car);

      const result = await service.getById('tenant-1', 'car-1');

      expect(prisma.car.findFirst).toHaveBeenCalledWith({
        where: { id: 'car-1', tenantId: 'tenant-1' },
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
      expect(result).toEqual(car);
    });

    it('getById() deve lançar NotFoundException quando carro não existe', async () => {
      prisma.car.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getById('tenant-1', 'car-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('create() deve criar carro com branchId direto', async () => {
      const dto: any = {
        plate: 'ABC1D23',
        model: 'Onix',
        color: 'Prata',
        mileage: 1000,
        status: 'AVAILABLE',
        branchId: 'branch-1',
      };

      prisma.car.findFirst.mockResolvedValueOnce(null); // exists
      prisma.car.create.mockResolvedValueOnce({
        id: 'car-1',
        plate: dto.plate,
        model: dto.model,
        color: dto.color,
        mileage: dto.mileage,
        status: dto.status,
        branchId: dto.branchId,
      });

      const result = await service.create('tenant-1', dto);

      expect(prisma.car.findFirst).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', plate: dto.plate },
        select: { id: true },
      });

      expect(prisma.car.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          plate: dto.plate,
          model: dto.model,
          color: dto.color,
          mileage: dto.mileage,
          status: dto.status,
          branchId: dto.branchId,
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

      expect(result).toEqual({
        id: 'car-1',
        plate: dto.plate,
        model: dto.model,
        color: dto.color,
        mileage: dto.mileage,
        status: dto.status,
        branchId: dto.branchId,
      });
    });

    it('create() deve lançar ConflictException quando plate já existe (pré-checagem)', async () => {
      const dto: any = {
        plate: 'ABC1D23',
        model: 'Onix',
      };

      prisma.car.findFirst.mockResolvedValueOnce({ id: 'existing-car' });

      await expect(service.create('tenant-1', dto)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(prisma.car.create).not.toHaveBeenCalled();
    });

    it('create() deve lançar BadRequestException quando branchName não existe para o tenant', async () => {
      const dto: any = {
        plate: 'ABC1D23',
        model: 'Onix',
        branchName: 'Filial Fantasma',
      };

      prisma.car.findFirst.mockResolvedValueOnce(null); // exists
      prisma.branch.findFirst.mockResolvedValueOnce(null); // branch não encontrada

      await expect(service.create('tenant-1', dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.car.create).not.toHaveBeenCalled();
    });

    it('create() deve resolver branchName para branchId quando existir', async () => {
      const dto: any = {
        plate: 'ABC1D23',
        model: 'Onix',
        branchName: 'Filial Centro',
      };

      prisma.car.findFirst.mockResolvedValueOnce(null);
      prisma.branch.findFirst.mockResolvedValueOnce({ id: 'branch-1' });
      prisma.car.create.mockResolvedValueOnce({
        id: 'car-1',
        plate: dto.plate,
        model: dto.model,
        color: null,
        mileage: 0,
        status: undefined,
        branchId: 'branch-1',
      });

      const result = await service.create('tenant-1', dto);

      expect(prisma.branch.findFirst).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', name: dto.branchName },
        select: { id: true },
      });

      expect(prisma.car.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          plate: dto.plate,
          model: dto.model,
          color: null,
          mileage: 0,
          status: undefined,
          branchId: 'branch-1',
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

      expect(result.branchId).toBe('branch-1');
    });
  });

  describe('update', () => {
    it('update() deve lançar NotFoundException quando carro não pertence ao tenant', async () => {
      prisma.car.findFirst.mockResolvedValueOnce(null); // current

      await expect(
        service.update('tenant-1', 'car-1', { model: 'Novo' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.car.update).not.toHaveBeenCalled();
    });

    it('update() deve lançar ConflictException quando plate já existe para outro carro', async () => {
      const current = { id: 'car-1', plate: 'ABC1D23' };
      prisma.car.findFirst
        .mockResolvedValueOnce(current) // current
        .mockResolvedValueOnce({ id: 'car-2' }); // dup

      const dto: any = { plate: 'XYZ9Z99' };

      await expect(
        service.update('tenant-1', 'car-1', dto),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.car.update).not.toHaveBeenCalled();
    });

    it('update() deve atualizar campos básicos quando não há conflito', async () => {
      const current = { id: 'car-1', plate: 'ABC1D23' };
      prisma.car.findFirst.mockResolvedValueOnce(current); // current
      // dup check retorna null
      prisma.car.findFirst.mockResolvedValueOnce(null);

      const dto: any = {
        plate: 'ABC1D23',
        model: 'Onix Plus',
        color: 'Preto',
        mileage: 2000,
        status: 'IN_USE',
      };

      const updated = {
        id: 'car-1',
        plate: dto.plate,
        model: dto.model,
        color: dto.color,
        mileage: dto.mileage,
        status: dto.status,
        branchId: 'b1',
      };

      prisma.car.update.mockResolvedValueOnce(updated);

      const result = await service.update('tenant-1', 'car-1', dto);

      expect(prisma.car.update).toHaveBeenCalledWith({
        where: { id: 'car-1' },
        data: {
          plate: dto.plate,
          model: dto.model,
          color: dto.color,
          mileage: dto.mileage,
          status: dto.status,
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

      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('remove() deve remover carro quando encontrado para o tenant', async () => {
      prisma.car.findFirst.mockResolvedValueOnce({ id: 'car-1' });
      prisma.car.delete.mockResolvedValueOnce({ id: 'car-1' });

      const result = await service.remove('tenant-1', 'car-1');

      expect(prisma.car.findFirst).toHaveBeenCalledWith({
        where: { id: 'car-1', tenantId: 'tenant-1' },
        select: { id: true },
      });
      expect(prisma.car.delete).toHaveBeenCalledWith({
        where: { id: 'car-1' },
      });
      expect(result).toEqual({ ok: true });
    });

    it('remove() deve lançar NotFoundException quando carro não existe para o tenant', async () => {
      prisma.car.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.remove('tenant-1', 'car-1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.car.delete).not.toHaveBeenCalled();
    });
  });
});
