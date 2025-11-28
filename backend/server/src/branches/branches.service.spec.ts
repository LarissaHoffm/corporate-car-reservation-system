import { BranchesService } from './branches.service';
import { PrismaService } from '../infra/prisma.service';

describe('BranchesService', () => {
  let service: BranchesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      branch: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    service = new BranchesService(prisma as PrismaService);
  });

  describe('list', () => {
    it('lista todas as filiais quando tenantId não é informado', async () => {
      const branches = [{ id: 'b1', name: 'Matriz', tenantId: 't1' }];
      prisma.branch.findMany.mockResolvedValue(branches);

      const res = await service.list();

      expect(prisma.branch.findMany).toHaveBeenCalledWith({
        where: undefined,
        select: { id: true, name: true, tenantId: true },
        orderBy: { name: 'asc' },
      });
      expect(res).toBe(branches);
    });

    it('filtra por tenantId quando informado', async () => {
      const branches = [{ id: 'b2', name: 'Filial', tenantId: 't1' }];
      prisma.branch.findMany.mockResolvedValue(branches);

      const res = await service.list('t1');

      expect(prisma.branch.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1' },
        select: { id: true, name: true, tenantId: true },
        orderBy: { name: 'asc' },
      });
      expect(res).toBe(branches);
    });
  });

  describe('getById', () => {
    it('consulta apenas por id quando tenantId não é informado', async () => {
      const branch = { id: 'b1', name: 'Matriz', tenantId: 't1' };
      prisma.branch.findFirst.mockResolvedValue(branch);

      const res = await service.getById('b1');

      expect(prisma.branch.findFirst).toHaveBeenCalledWith({
        where: { id: 'b1' },
        select: { id: true, name: true, tenantId: true },
      });
      expect(res).toBe(branch);
    });

    it('consulta por id + tenantId quando informado', async () => {
      const branch = { id: 'b1', name: 'Matriz', tenantId: 't1' };
      prisma.branch.findFirst.mockResolvedValue(branch);

      const res = await service.getById('b1', 't1');

      expect(prisma.branch.findFirst).toHaveBeenCalledWith({
        where: { id: 'b1', tenantId: 't1' },
        select: { id: true, name: true, tenantId: true },
      });
      expect(res).toBe(branch);
    });
  });
});
