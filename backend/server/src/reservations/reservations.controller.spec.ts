import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

describe('ReservationsController', () => {
  let controller: ReservationsController;

  const serviceMock = {
    list: jest.fn(),
    create: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
    complete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [{ provide: ReservationsService, useValue: serviceMock }],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);

    serviceMock.list.mockResolvedValue([{ id: 'r1', status: 'PENDING' }]);
    serviceMock.create.mockResolvedValue({ id: 'r2', status: 'PENDING' });
    serviceMock.approve.mockResolvedValue({ id: 'r2', status: 'APPROVED' });
    serviceMock.reject.mockResolvedValue({ id: 'r2', status: 'REJECTED' });
    serviceMock.cancel.mockResolvedValue({ id: 'r2', status: 'CANCELLED' });
    serviceMock.complete.mockResolvedValue({ id: 'r2', status: 'COMPLETED' });
  });

  it('list retorna reservas', async () => {
    const res = await (controller as any).list(
      { user: { tenantId: 't1' } },
      {},
    );
    expect(res[0].status).toBe('PENDING');
  });

  it('create cria reserva PENDING', async () => {
    const res = await (controller as any).create(
      { user: { id: 'u1', tenantId: 't1' } },
      { origin: 'A', destination: 'B' },
    );
    expect(res.status).toBe('PENDING');
  });

  it('approve muda para APPROVED (ordem id, dto, req)', async () => {
    const req = { user: { id: 'admin', tenantId: 't1', role: 'ADMIN' } } as any;
    const res = await (controller as any).approve('r2', {}, req);
    expect(serviceMock.approve).toHaveBeenCalledWith(
      { userId: 'admin', tenantId: 't1', role: 'ADMIN' },
      'r2',
      {},
    );
    expect(res.status).toBe('APPROVED');
  });
});
