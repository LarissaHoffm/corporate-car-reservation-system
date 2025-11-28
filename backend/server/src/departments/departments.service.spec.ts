import { DepartmentsService } from './departments.service';
import { PrismaService } from '../infra/prisma.service';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      department: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    service = new DepartmentsService(prisma as PrismaService);
  });

  describe('list', () => {
    it('lista todos os departamentos quando tenantId não é informado', async () => {
      const deps = [{ id: 'd1', name: 'TI', code: 'TI', tenantId: 't1' }];
      prisma.department.findMany.mockResolvedValue(deps);

      const res = await service.list();

      expect(prisma.department.findMany).toHaveBeenCalledWith({
        where: undefined,
        select: { id: true, name: true, code: true, tenantId: true },
        orderBy: { name: 'asc' },
      });
      expect(res).toBe(deps);
    });

    it('filtra departamentos por tenantId quando informado', async () => {
      const deps = [{ id: 'd2', name: 'RH', code: 'RH', tenantId: 't1' }];
      prisma.department.findMany.mockResolvedValue(deps);

      const res = await service.list('t1');

      expect(prisma.department.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1' },
        select: { id: true, name: true, code: true, tenantId: true },
        orderBy: { name: 'asc' },
      });
      expect(res).toBe(deps);
    });
  });

  describe('getById', () => {
    it('consulta apenas por id quando tenantId não é informado', async () => {
      const dep = { id: 'd1', name: 'TI', code: 'TI', tenantId: 't1' };
      prisma.department.findFirst.mockResolvedValue(dep);

      const res = await service.getById('d1');

      expect(prisma.department.findFirst).toHaveBeenCalledWith({
        where: { id: 'd1' },
        select: { id: true, name: true, code: true, tenantId: true },
      });
      expect(res).toBe(dep);
    });

    it('consulta por id + tenantId quando informado', async () => {
      const dep = { id: 'd1', name: 'TI', code: 'TI', tenantId: 't1' };
      prisma.department.findFirst.mockResolvedValue(dep);

      const res = await service.getById('d1', 't1');

      expect(prisma.department.findFirst).toHaveBeenCalledWith({
        where: { id: 'd1', tenantId: 't1' },
        select: { id: true, name: true, code: true, tenantId: true },
      });
      expect(res).toBe(dep);
    });
  });
});
