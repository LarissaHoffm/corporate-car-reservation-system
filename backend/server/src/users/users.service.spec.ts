import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../infra/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      branch: {
        findFirst: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    jest.clearAllMocks();
  });

  it('findAll filtra por tenantId (ordenação e select flexíveis)', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', tenantId: 't1', name: 'Admin' },
    ]);

    const res = await (service as any).findAll('t1');

    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    const args = prisma.user.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ tenantId: 't1' });
    expect(args.orderBy).toBeDefined(); // aceita qualquer forma de orderBy
    expect(args.select).toBeDefined();  // aceita qualquer shape de select

    expect(res).toEqual([{ id: 'u1', tenantId: 't1', name: 'Admin' }]);
  });

  it('findOne com ctx.tenantId aplica filtro por tenant', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u1', tenantId: 't1', name: 'Admin' });

    const res = await (service as any).findOne('u1', { tenantId: 't1' });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'u1', tenantId: 't1' },
      select: expect.any(Object),
    });
    expect(res).toEqual({ id: 'u1', tenantId: 't1', name: 'Admin' });
  });

  it('findOne sem ctx.tenantId NÃO aplica filtro por tenant', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u2', tenantId: 't2', name: 'Approver' });

    const res = await (service as any).findOne('u2');

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'u2' },
      select: expect.any(Object),
    });
    expect(res).toEqual({ id: 'u2', tenantId: 't2', name: 'Approver' });
  });

  it('create usa tenantId/actorId e valida branchId quando presente', async () => {
    const dto = { name: 'Novo', email: 'novo@acme.com', role: 'REQUESTER', branchId: 'b1' };
    const ctx = { tenantId: 't1', actorId: 'admin1' };

    // não existe outro usuário com mesmo email no tenant
    prisma.user.findFirst.mockResolvedValue(null);
    // branch existe e pertence ao tenant
    prisma.branch.findFirst.mockResolvedValue({ id: 'b1' });

    prisma.user.create.mockResolvedValue({
      id: 'u3',
      tenantId: 't1',
      name: 'Novo',
      email: 'novo@acme.com',
      role: 'REQUESTER',
      branchId: 'b1',
    });

    const res = await (service as any).create(dto, ctx);

    expect(prisma.branch.findFirst).toHaveBeenCalledWith({
      where: { id: 'b1', tenantId: 't1' },
      select: { id: true },
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 't1',
        name: 'Novo',
        email: 'novo@acme.com',
        role: 'REQUESTER',
        branchId: 'b1',
      }),
      select: expect.any(Object),
    });

    expect(res).toEqual(
      expect.objectContaining({
        id: 'u3',
        tenantId: 't1',
        name: 'Novo',
        email: 'novo@acme.com',
      }),
    );
  });
});
