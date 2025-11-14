import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const serviceMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    setPasswordAsAdmin: jest.fn(),
    resetPassword: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: serviceMock }],
    }).compile();

    controller = module.get<UsersController>(UsersController);

    // retornos padrão
    serviceMock.findAll.mockResolvedValue([{ id: 'u1', name: 'Admin' }]);
    serviceMock.findOne.mockResolvedValue({ id: 'u1', name: 'Admin' });
    serviceMock.create.mockResolvedValue({ id: 'u2', name: 'Novo' });
  });

  it('findAll retorna usuários', async () => {
    const res = await controller.findAll({ user: { tenantId: 't1' } } as any);
    expect(serviceMock.findAll).toHaveBeenCalledWith('t1');
    expect(res).toEqual([{ id: 'u1', name: 'Admin' }]);
  });

  it('findOne retorna um usuário', async () => {
    const req = { user: { tenantId: 't1' }, headers: {} } as any;
    const res = await controller.findOne('u1', req);
    expect(serviceMock.findOne).toHaveBeenCalledWith('u1', { tenantId: 't1' });
    expect(res).toEqual({ id: 'u1', name: 'Admin' });
  });

  it('create cria usuário (ordem dto, req)', async () => {
    const dto = { name: 'Novo' } as any;
    const req = { user: { tenantId: 't1', sub: 'admin' }, headers: {} } as any;
    const res = await (controller as any).create(dto, req);
    expect(serviceMock.create).toHaveBeenCalled();
    expect(res).toEqual({ id: 'u2', name: 'Novo' });
  });
});
