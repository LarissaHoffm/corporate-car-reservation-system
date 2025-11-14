import { Test } from '@nestjs/testing';
import {
  NotFoundException,
} from '@nestjs/common';

import { StationsService } from './stations.service';
import { PrismaService } from '../infra/prisma.service';

describe('StationsService', () => {
  let service: StationsService;
  let prisma: {
    station: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const actor = { tenantId: 'tenant-1' };

  beforeEach(async () => {
    prisma = {
      station: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        StationsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = moduleRef.get(StationsService);
  });

  describe('create', () => {
    it('deve criar posto com dados normalizados e retornar seleção básica', async () => {
      const dto = {
        branchId: 'branch-1',
        name: '  Posto Centro  ',
        address: '  Rua X, 123  ',
      };

      const created = {
        id: 'station-1',
        name: 'Posto Centro',
        address: 'Rua X, 123',
        branchId: 'branch-1',
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      prisma.station.create.mockResolvedValue(created);

      const result = await service.create(actor, dto);

      expect(prisma.station.create).toHaveBeenCalledTimes(1);
      expect(prisma.station.create).toHaveBeenCalledWith({
        data: {
          tenantId: actor.tenantId,
          branchId: dto.branchId,
          name: 'Posto Centro',
          address: 'Rua X, 123',
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

      expect(result).toEqual(created);
    });
  });

  describe('list', () => {
    it('deve listar postos por tenant com paginação padrão', async () => {
      const items = [
        {
          id: 's1',
          name: 'Posto A',
          address: 'Rua 1',
          branchId: 'b1',
          isActive: true,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      prisma.$transaction.mockResolvedValue([items, 1]);

      const result = await service.list(actor, {});

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
        items,
        data: items,
      });
    });

    it('deve aplicar filtro por branchId e termo de busca (q)', async () => {
      const items: any[] = [];
      prisma.$transaction.mockResolvedValue([items, 0]);

      const result = await service.list(actor, {
        branchId: 'branch-1',
        q: 'centro',
        page: 2,
        pageSize: 10,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe('get', () => {
    it('deve retornar posto quando encontrado no tenant', async () => {
      const station = {
        id: 's1',
        name: 'Posto A',
        address: 'Rua 1',
        branchId: 'b1',
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      prisma.station.findFirst.mockResolvedValue(station);

      const result = await service.get(actor, 's1');

      expect(prisma.station.findFirst).toHaveBeenCalledWith({
        where: { id: 's1', tenantId: actor.tenantId },
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

      expect(result).toEqual(station);
    });

    it('deve lançar NotFoundException quando posto não existe para o tenant', async () => {
      prisma.station.findFirst.mockResolvedValue(null);

      await expect(service.get(actor, 's1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar posto e retornar seleção básica', async () => {
      const dto = {
        name: '  Novo Nome  ',
        address: '  Nova Rua  ',
        branchId: 'branch-2',
      };

      const updated = {
        id: 's1',
        name: 'Novo Nome',
        address: 'Nova Rua',
        branchId: 'branch-2',
        isActive: true,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };

      prisma.station.update.mockResolvedValue(updated);
      prisma.station.count.mockResolvedValue(1);

      const result = await service.update(actor, 's1', dto);

      expect(prisma.station.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: {
          name: 'Novo Nome',
          address: 'Nova Rua',
          branchId: 'branch-2',
        },
        select: {
          id: true,
          name: true,
          address: true,
          branchId: true,
          isActive: true,
          updatedAt: true,
        },
      });

      expect(prisma.station.count).toHaveBeenCalledWith({
        where: { id: 's1', tenantId: actor.tenantId },
      });

      expect(result).toEqual(updated);
    });

    it('deve permitir limpar branchId quando enviado vazio', async () => {
      const dto = {
        branchId: '',
      };

      const updated = {
        id: 's1',
        name: 'Posto A',
        address: 'Rua 1',
        branchId: null,
        isActive: true,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };

      prisma.station.update.mockResolvedValue(updated);
      prisma.station.count.mockResolvedValue(1);

      const result = await service.update(actor, 's1', dto);

      expect(prisma.station.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: {
          branchId: null,
        },
        select: {
          id: true,
          name: true,
          address: true,
          branchId: true,
          isActive: true,
          updatedAt: true,
        },
      });

      expect(result).toEqual(updated);
    });

    it('deve lançar NotFoundException quando posto não pertence ao tenant', async () => {
      const dto = { name: 'Qualquer' };
      const updated = {
        id: 's1',
        name: 'Qualquer',
        address: null,
        branchId: null,
        isActive: true,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };

      prisma.station.update.mockResolvedValue(updated);
      prisma.station.count.mockResolvedValue(0);

      await expect(service.update(actor, 's1', dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deve remover posto quando encontrado para o tenant', async () => {
      prisma.station.findFirst.mockResolvedValue({ id: 's1' });
      prisma.station.delete.mockResolvedValue({ id: 's1' });

      const result = await service.remove(actor, 's1');

      expect(prisma.station.findFirst).toHaveBeenCalledWith({
        where: { id: 's1', tenantId: actor.tenantId },
        select: { id: true },
      });

      expect(prisma.station.delete).toHaveBeenCalledWith({
        where: { id: 's1' },
      });

      expect(result).toEqual({ ok: true });
    });

    it('deve lançar NotFoundException quando posto não existe para o tenant', async () => {
      prisma.station.findFirst.mockResolvedValue(null);

      await expect(service.remove(actor, 's1')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.station.delete).not.toHaveBeenCalled();
    });
  });
});
