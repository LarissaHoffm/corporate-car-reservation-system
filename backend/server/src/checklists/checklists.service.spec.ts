import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ChecklistSubmissionKind,
  Role,
  ReservationStatus,
  CarStatus,
} from '@prisma/client';
import { ChecklistsService, AuthUser } from './checklists.service';
import { PrismaService } from '../infra/prisma.service';

describe('ChecklistsService', () => {
  let service: ChecklistsService;
  let prisma: any;

  const adminActor: AuthUser = {
    id: 'admin-1',
    tenantId: 'tenant-1',
    role: Role.ADMIN,
    branchId: null,
  };

  const requesterActor: AuthUser = {
    id: 'req-1',
    tenantId: 'tenant-1',
    role: Role.REQUESTER,
    branchId: null,
  };

  const approverActor: AuthUser = {
    id: 'app-1',
    tenantId: 'tenant-1',
    role: Role.APPROVER,
    branchId: null,
  };

  beforeEach(async () => {
    prisma = {
      car: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      checklistTemplate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      checklistTemplateItem: {
        deleteMany: jest.fn(),
      },
      checklistSubmission: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      reservation: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      document: {
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) =>
        cb({
          checklistTemplate: {
            update: prisma.checklistTemplate.update,
            findUnique: prisma.checklistTemplate.findUnique,
            delete: prisma.checklistTemplate.delete,
          },
          checklistTemplateItem: {
            deleteMany: prisma.checklistTemplateItem.deleteMany,
          },
          reservation: {
            update: prisma.reservation.update,
          },
          car: {
            updateMany: prisma.car.updateMany,
          },
          auditLog: {
            create: prisma.auditLog.create,
          },
        }),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ChecklistsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = moduleRef.get(ChecklistsService);
  });

  describe('basic actor validation', () => {
    it('deve lançar BadRequestException quando actor não tem user id', async () => {
      const actor = { tenantId: 'tenant-1', role: Role.REQUESTER } as AuthUser;

      await expect(
        service.submitChecklist(actor, 'res-1', {
          templateId: 'tpl-1',
          kind: ChecklistSubmissionKind.USER_RETURN,
          payload: {},
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('templates - createTemplate', () => {
    const dto = {
      name: 'Devolução',
      carId: 'car-1',
      items: [{ label: 'Item 1', type: 'BOOLEAN' as any }],
    };

    it('deve recusar non-ADMIN', async () => {
      await expect(
        service.createTemplate(
          { ...requesterActor, role: Role.REQUESTER },
          dto as any,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve lançar BadRequest quando carro não é encontrado', async () => {
      prisma.car.findFirst.mockResolvedValue(null);

      await expect(
        service.createTemplate(adminActor, dto as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve lançar Conflict quando já existe template para o carro', async () => {
      prisma.car.findFirst.mockResolvedValue({
        id: 'car-1',
        tenantId: adminActor.tenantId,
      });
      prisma.checklistTemplate.findFirst.mockResolvedValue({
        id: 'tpl-existing',
      });

      await expect(
        service.createTemplate(adminActor, dto as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('deve criar template e registrar audit log', async () => {
      prisma.car.findFirst.mockResolvedValue({
        id: 'car-1',
        tenantId: adminActor.tenantId,
        plate: 'ABC-1234',
      });
      prisma.checklistTemplate.findFirst.mockResolvedValue(null);

      const created = {
        id: 'tpl-1',
        tenantId: adminActor.tenantId,
        name: 'Devolução',
        active: true,
        carId: 'car-1',
        items: [
          {
            id: 'item-1',
            label: 'Item 1',
            type: 'BOOLEAN',
            required: true,
            options: null,
            order: 0,
          },
        ],
        car: { id: 'car-1', plate: 'ABC-1234' },
      };

      prisma.checklistTemplate.create.mockResolvedValue(created);

      const result = await service.createTemplate(adminActor, dto as any);

      expect(prisma.car.findFirst).toHaveBeenCalledWith({
        where: { id: dto.carId, tenantId: adminActor.tenantId },
      });

      expect(prisma.checklistTemplate.create).toHaveBeenCalledTimes(1);
      const arg = prisma.checklistTemplate.create.mock.calls[0][0];
      expect(arg.data.tenantId).toBe(adminActor.tenantId);
      expect(arg.data.carId).toBe(dto.carId);
      expect(arg.data.items.create).toHaveLength(1);

      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      expect(result).toBe(created);
    });
  });

  describe('templates - listTemplates', () => {
    it('deve listar apenas ativos por padrão e filtrar por carId quando informado', async () => {
      const templates = [{ id: 'tpl-1' }];
      prisma.checklistTemplate.findMany.mockResolvedValue(templates);

      const result = await service.listTemplates(adminActor, true, 'car-1');

      expect(prisma.checklistTemplate.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: adminActor.tenantId,
          active: true,
          carId: 'car-1',
        },
        orderBy: { name: 'asc' },
        include: { items: true, car: true },
      });
      expect(result).toBe(templates);
    });

    it('deve permitir incluir inativos quando onlyActive=false', async () => {
      prisma.checklistTemplate.findMany.mockResolvedValue([]);

      const result = await service.listTemplates(adminActor, false);

      expect(prisma.checklistTemplate.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: adminActor.tenantId,
        },
        orderBy: { name: 'asc' },
        include: { items: true, car: true },
      });
      expect(result).toEqual([]);
    });
  });

  describe('templates - updateTemplate', () => {
    it('deve recusar non-ADMIN', async () => {
      await expect(
        service.updateTemplate(requesterActor, 'tpl-1', {} as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve lançar NotFound quando template não existe', async () => {
      prisma.checklistTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTemplate(adminActor, 'tpl-1', {} as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve validar novo carId e lançar BadRequest quando carro não existe no tenant', async () => {
      const template = {
        id: 'tpl-1',
        tenantId: adminActor.tenantId,
        carId: 'car-1',
        name: 'Old',
        active: true,
        items: [],
        car: null,
      };
      prisma.checklistTemplate.findFirst.mockResolvedValue(template);
      prisma.car.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTemplate(adminActor, 'tpl-1', { carId: 'car-2' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve lançar Conflict quando já existe template para o novo carro', async () => {
      const template = {
        id: 'tpl-1',
        tenantId: adminActor.tenantId,
        carId: 'car-1',
        name: 'Old',
        active: true,
        items: [],
        car: null,
      };

      prisma.checklistTemplate.findFirst
        .mockResolvedValueOnce(template)
        .mockResolvedValueOnce({ id: 'tpl-other' });

      prisma.car.findFirst.mockResolvedValue({
        id: 'car-2',
        tenantId: adminActor.tenantId,
      });

      await expect(
        service.updateTemplate(adminActor, 'tpl-1', { carId: 'car-2' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('deve atualizar campos básicos e registrar audit quando não há mudança de itens', async () => {
      const template = {
        id: 'tpl-1',
        tenantId: adminActor.tenantId,
        carId: 'car-1',
        name: 'Old',
        active: true,
        items: [],
        car: { id: 'car-1' },
      };

      prisma.checklistTemplate.findFirst.mockResolvedValue(template);

      const updated = {
        ...template,
        name: 'New',
      };

      prisma.checklistTemplate.update.mockResolvedValue(updated);

      const result = await service.updateTemplate(adminActor, 'tpl-1', {
        name: 'New',
      } as any);

      expect(prisma.checklistTemplateItem.deleteMany).not.toHaveBeenCalled();
      expect(prisma.checklistTemplate.update).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      expect(result).toBe(updated);
    });

    it('deve permitir mudar carId e substituir itens', async () => {
      const template = {
        id: 'tpl-1',
        tenantId: adminActor.tenantId,
        carId: 'car-1',
        name: 'Old',
        active: true,
        items: [],
        car: { id: 'car-1' },
      };

      prisma.checklistTemplate.findFirst
        .mockResolvedValueOnce(template)
        .mockResolvedValueOnce(null); // existsForCar

      prisma.car.findFirst.mockResolvedValue({
        id: 'car-2',
        tenantId: adminActor.tenantId,
      });

      const updated = {
        ...template,
        carId: 'car-2',
        name: 'Nova',
        items: [{ id: 'new-item' }],
      };

      prisma.checklistTemplate.update.mockResolvedValue(updated);

      const dto = {
        carId: 'car-2',
        name: 'Nova',
        items: [{ label: 'Novo item', type: 'BOOLEAN' as any, required: true }],
      } as any;

      const result = await service.updateTemplate(adminActor, 'tpl-1', dto);

      expect(prisma.checklistTemplateItem.deleteMany).toHaveBeenCalledWith({
        where: { templateId: template.id },
      });

      expect(prisma.checklistTemplate.update).toHaveBeenCalledTimes(1);
      const arg = prisma.checklistTemplate.update.mock.calls[0][0];
      expect(arg.data.carId).toBe('car-2');
      expect(arg.data.items.create).toHaveLength(1);
      expect(result).toBe(updated);
    });
  });

  describe('templates - setTemplateActive', () => {
    it('deve recusar non-ADMIN', async () => {
      await expect(
        service.setTemplateActive(requesterActor, 'tpl-1', true),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve lançar NotFound quando template não existe', async () => {
      prisma.checklistTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.setTemplateActive(adminActor, 'tpl-1', false),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve atualizar flag active e registrar audit', async () => {
      const tpl = {
        id: 'tpl-1',
        tenantId: adminActor.tenantId,
        name: 'Tpl',
        carId: 'car-1',
        active: true,
      };

      prisma.checklistTemplate.findFirst.mockResolvedValue(tpl);
      prisma.checklistTemplate.update.mockResolvedValue({
        ...tpl,
        active: false,
      });

      const result = await service.setTemplateActive(
        adminActor,
        'tpl-1',
        false,
      );

      expect(prisma.checklistTemplate.update).toHaveBeenCalledWith({
        where: { id: tpl.id },
        data: { active: false },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      expect(result.active).toBe(false);
    });
  });

  describe('getTemplateForReservation', () => {
    it('deve lançar NotFound quando reserva não existe', async () => {
      prisma.reservation.findFirst.mockResolvedValue(null);

      await expect(
        service.getTemplateForReservation(requesterActor, 'res-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve lançar BadRequest quando reserva não possui carro vinculado', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        id: 'res-1',
        tenantId: requesterActor.tenantId,
        carId: null,
        car: null,
      });

      await expect(
        service.getTemplateForReservation(requesterActor, 'res-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve lançar NotFound quando não há template ativo para o carro', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        id: 'res-1',
        tenantId: requesterActor.tenantId,
        carId: 'car-1',
        car: { id: 'car-1' },
      });

      prisma.checklistTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.getTemplateForReservation(requesterActor, 'res-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve retornar template vinculado ao carro da reserva', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        id: 'res-1',
        tenantId: requesterActor.tenantId,
        carId: 'car-1',
        car: { id: 'car-1' },
      });

      const template = {
        id: 'tpl-1',
        tenantId: requesterActor.tenantId,
        carId: 'car-1',
        active: true,
        items: [],
        car: { id: 'car-1' },
      };

      prisma.checklistTemplate.findFirst.mockResolvedValue(template);

      const result = await service.getTemplateForReservation(
        requesterActor,
        'res-1',
      );

      expect(prisma.checklistTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: requesterActor.tenantId,
          active: true,
          carId: 'car-1',
        },
        include: { items: true, car: true },
      });
      expect(result).toBe(template);
    });
  });

  describe('getReservationChecklists', () => {
    it('deve lançar NotFound quando reserva não existe', async () => {
      prisma.reservation.findFirst.mockResolvedValue(null);

      await expect(
        service.getReservationChecklists(requesterActor, 'res-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve bloquear REQUESTER de ver reserva de outro usuário', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        id: 'res-1',
        tenantId: requesterActor.tenantId,
        userId: 'other-user',
      });

      await expect(
        service.getReservationChecklists(requesterActor, 'res-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve listar submissões para reserva do próprio usuário', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        id: 'res-1',
        tenantId: requesterActor.tenantId,
        userId: requesterActor.id,
      });

      const submissions = [{ id: 'sub-1' }];

      prisma.checklistSubmission.findMany.mockResolvedValue(submissions);

      const result = await service.getReservationChecklists(
        requesterActor,
        'res-1',
      );

      expect(prisma.checklistSubmission.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: requesterActor.tenantId,
          reservationId: 'res-1',
        },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toBe(submissions);
    });
  });

  describe('deleteTemplate', () => {
    it('deve recusar non-ADMIN', async () => {
      await expect(
        service.deleteTemplate(requesterActor, 'tpl-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve lançar NotFound quando template não existe ou não pertence ao tenant', async () => {
      prisma.checklistTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteTemplate(adminActor, 'tpl-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve lançar Conflict quando template já foi usado em reservas', async () => {
      prisma.checklistTemplate.findUnique.mockResolvedValue({
        id: 'tpl-1',
        tenantId: adminActor.tenantId,
        _count: { ChecklistSubmission: 2 },
      });

      await expect(
        service.deleteTemplate(adminActor, 'tpl-1'),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.checklistTemplateItem.deleteMany).not.toHaveBeenCalled();
      expect(prisma.checklistTemplate.delete).not.toHaveBeenCalled();
    });

    it('deve deletar template e seus itens quando não foi usado', async () => {
      prisma.checklistTemplate.findUnique.mockResolvedValue({
        id: 'tpl-1',
        tenantId: adminActor.tenantId,
        _count: { ChecklistSubmission: 0 },
      });

      const result = await service.deleteTemplate(adminActor, 'tpl-1');

      expect(prisma.checklistTemplateItem.deleteMany).toHaveBeenCalledWith({
        where: { templateId: 'tpl-1' },
      });
      expect(prisma.checklistTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
      });
      expect(result).toEqual({ id: 'tpl-1', deleted: true });
    });
  });

  describe('submitChecklist (incluindo buildChecklistContext)', () => {
    const baseDto = {
      templateId: 'tpl-1',
      kind: ChecklistSubmissionKind.USER_RETURN,
      payload: { foo: 'bar' },
    } as any;

    function mockReservationAndTemplate(overrides: any = {}) {
      prisma.reservation.findFirst.mockResolvedValue({
        id: 'res-1',
        tenantId: requesterActor.tenantId,
        carId: 'car-1',
        approverId: null,
        userId: requesterActor.id,
        ...(overrides.reservation ?? {}),
      });

      prisma.checklistTemplate.findFirst.mockResolvedValue({
        id: 'tpl-1',
        tenantId: requesterActor.tenantId,
        carId: 'car-1',
        active: true,
        items: [],
        ...(overrides.template ?? {}),
      });
    }

    it('deve lançar NotFound quando reserva não existe', async () => {
      prisma.reservation.findFirst.mockResolvedValue(null);

      await expect(
        service.submitChecklist(requesterActor, 'res-1', baseDto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve lançar BadRequest quando reserva não possui carro vinculado', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        id: 'res-1',
        tenantId: requesterActor.tenantId,
        carId: null,
      });

      await expect(
        service.submitChecklist(requesterActor, 'res-1', baseDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve lançar BadRequest quando template não é ativo para o tenant', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        id: 'res-1',
        tenantId: requesterActor.tenantId,
        carId: 'car-1',
      });

      prisma.checklistTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.submitChecklist(requesterActor, 'res-1', baseDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve lançar BadRequest quando template de checklist não corresponde ao carro da reserva', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        id: 'res-1',
        tenantId: requesterActor.tenantId,
        carId: 'car-1',
      });

      prisma.checklistTemplate.findFirst.mockResolvedValue({
        id: 'tpl-1',
        tenantId: requesterActor.tenantId,
        carId: 'other-car',
        active: true,
        items: [],
      });

      await expect(
        service.submitChecklist(requesterActor, 'res-1', baseDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve lançar Forbidden quando non-REQUESTER tenta USER_RETURN', async () => {
      mockReservationAndTemplate();
      prisma.checklistSubmission.findFirst.mockResolvedValue(null);

      await expect(
        service.submitChecklist({ ...approverActor }, 'res-1', baseDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve lançar Forbidden quando REQUESTER tenta APPROVER_VALIDATION', async () => {
      mockReservationAndTemplate();

      const dto = {
        templateId: 'tpl-1',
        kind: ChecklistSubmissionKind.APPROVER_VALIDATION,
        payload: {},
      } as any;

      prisma.checklistSubmission.findFirst.mockResolvedValue(null);

      await expect(
        service.submitChecklist(requesterActor, 'res-1', dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve lançar Forbidden quando APPROVER não é o aprovador da reserva (e não é ADMIN)', async () => {
      mockReservationAndTemplate({
        reservation: { approverId: 'other-approver' },
      });

      const dto = {
        templateId: 'tpl-1',
        kind: ChecklistSubmissionKind.APPROVER_VALIDATION,
        payload: {},
      } as any;

      prisma.checklistSubmission.findFirst.mockResolvedValue(null);

      await expect(
        service.submitChecklist(approverActor, 'res-1', dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve impedir submissão duplicada para mesma reserva e tipo', async () => {
      mockReservationAndTemplate();

      prisma.checklistSubmission.findFirst.mockResolvedValue({
        id: 'existing',
      });

      await expect(
        service.submitChecklist(requesterActor, 'res-1', baseDto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('deve criar submissão e registrar audit log para USER_RETURN', async () => {
      mockReservationAndTemplate();

      prisma.checklistSubmission.findFirst.mockResolvedValue(null);

      const createdSubmission = { id: 'sub-1' };
      prisma.checklistSubmission.create.mockResolvedValue(createdSubmission);

      const result = await service.submitChecklist(
        requesterActor,
        'res-1',
        baseDto,
      );

      expect(prisma.checklistSubmission.create).toHaveBeenCalledTimes(1);
      const args = prisma.checklistSubmission.create.mock.calls[0][0];

      expect(args.data.kind).toBe(ChecklistSubmissionKind.USER_RETURN);
      expect(args.data.reservation.connect.id).toBe('res-1');
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      expect(result).toBe(createdSubmission);
    });
  });

  describe('helpers - normalization', () => {
    it('normalizeValidationStatus deve mapear diferentes entradas corretamente', () => {
      const s = service as any;
      expect(s.normalizeValidationStatus(undefined)).toBe('PENDING');
      expect(s.normalizeValidationStatus('approved')).toBe('APPROVED');
      expect(s.normalizeValidationStatus('VALIDATED')).toBe('APPROVED');
      expect(s.normalizeValidationStatus('reject')).toBe('REJECTED');
      expect(s.normalizeValidationStatus('other')).toBe('PENDING');
    });

    it('normalizeChecklistDecision deve mapear decisões e retornar null para desconhecidas', () => {
      const s = service as any;
      expect(s.normalizeChecklistDecision('approved')).toBe('APPROVED');
      expect(s.normalizeChecklistDecision('VALIDATED')).toBe('APPROVED');
      expect(s.normalizeChecklistDecision('reject')).toBe('REJECTED');
      expect(s.normalizeChecklistDecision('whatever')).toBeNull();
      expect(s.normalizeChecklistDecision(null)).toBeNull();
    });

    it('aggregateDocsStatusForReservation deve agregar status corretamente', () => {
      const s = service as any;
      const now = new Date();

      const noDocs = s.aggregateDocsStatusForReservation([]);
      expect(noDocs).toBe('Pending');

      const pending = s.aggregateDocsStatusForReservation([
        { type: 'CNH', status: 'PENDING', createdAt: now, updatedAt: null },
      ]);
      expect(pending).toBe('InValidation');

      const rejected = s.aggregateDocsStatusForReservation([
        { type: 'CNH', status: 'REJECTED', createdAt: now, updatedAt: null },
      ]);
      expect(rejected).toBe('PendingDocs');

      const approved = s.aggregateDocsStatusForReservation([
        { type: 'CNH', status: 'APPROVED', createdAt: now, updatedAt: null },
      ]);
      expect(approved).toBe('Validated');
    });
  });

  describe('helpers - shouldCompleteReservation', () => {
    it('retorna false quando reserva não é encontrada', async () => {
      prisma.reservation.findFirst.mockResolvedValue(null);

      const result = await (service as any).shouldCompleteReservation(
        'res-1',
        adminActor.tenantId,
      );

      expect(result).toBe(false);
    });

    it('retorna false quando reserva não está APPROVED', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        status: ReservationStatus.PENDING,
      });

      const result = await (service as any).shouldCompleteReservation(
        'res-1',
        adminActor.tenantId,
      );

      expect(result).toBe(false);
      expect(prisma.document.findMany).not.toHaveBeenCalled();
    });

    it('retorna false quando documentos não estão totalmente validados', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        status: ReservationStatus.APPROVED,
      });

      const now = new Date();
      prisma.document.findMany.mockResolvedValue([
        { type: 'CNH', status: 'PENDING', createdAt: now, updatedAt: null },
      ]);

      const result = await (service as any).shouldCompleteReservation(
        'res-1',
        adminActor.tenantId,
      );

      expect(result).toBe(false);
      expect(prisma.checklistSubmission.findMany).not.toHaveBeenCalled();
    });

    it('retorna true somente quando docs estão validados e checklists completos (USER_RETURN + APPROVER_VALIDATION aprovado)', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        status: ReservationStatus.APPROVED,
      });

      const now = new Date();
      prisma.document.findMany.mockResolvedValue([
        { type: 'CNH', status: 'APPROVED', createdAt: now, updatedAt: null },
      ]);

      prisma.checklistSubmission.findMany.mockResolvedValue([
        {
          kind: ChecklistSubmissionKind.USER_RETURN,
          payload: {},
          createdAt: now,
        },
        {
          kind: ChecklistSubmissionKind.APPROVER_VALIDATION,
          payload: { decision: 'APPROVED' },
          createdAt: new Date(now.getTime() + 1000),
        },
      ]);

      const result = await (service as any).shouldCompleteReservation(
        'res-1',
        adminActor.tenantId,
      );

      expect(prisma.document.findMany).toHaveBeenCalled();
      expect(prisma.checklistSubmission.findMany).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('helpers - tryCompleteReservation', () => {
    it('não deve chamar transaction quando shouldCompleteReservation retorna false', async () => {
      const spy = jest
        .spyOn(service as any, 'shouldCompleteReservation')
        .mockResolvedValue(false);

      await (service as any).tryCompleteReservation(
        'res-1',
        adminActor.tenantId,
        adminActor.id,
      );

      expect(spy).toHaveBeenCalledWith('res-1', adminActor.tenantId);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('deve completar reserva e liberar carro quando shouldCompleteReservation retorna true', async () => {
      jest
        .spyOn(service as any, 'shouldCompleteReservation')
        .mockResolvedValue(true);

      prisma.reservation.update.mockResolvedValue({
        id: 'res-1',
        tenantId: adminActor.tenantId,
        carId: 'car-1',
      });

      prisma.car.updateMany.mockResolvedValue({ count: 1 });
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await (service as any).tryCompleteReservation(
        'res-1',
        adminActor.tenantId,
        adminActor.id,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: ReservationStatus.COMPLETED },
        select: {
          id: true,
          tenantId: true,
          carId: true,
        },
      });
      expect(prisma.car.updateMany).toHaveBeenCalledWith({
        where: { id: 'car-1' },
        data: { status: CarStatus.AVAILABLE },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });
  });

  describe('listPendingForApprover', () => {
    it('deve recusar usuário que não seja APPROVER ou ADMIN', async () => {
      await expect(
        service.listPendingForApprover(requesterActor),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve retornar reservas mapeadas para APPROVER com status de checklist', async () => {
      const now = new Date();

      prisma.reservation.findMany.mockResolvedValue([
        {
          id: 'res-1',
          origin: 'A',
          destination: 'B',
          startAt: now,
          endAt: now,
          checklists: [
            {
              kind: ChecklistSubmissionKind.USER_RETURN,
              payload: {},
              createdAt: now,
            },
            {
              kind: ChecklistSubmissionKind.APPROVER_VALIDATION,
              payload: { decision: 'APPROVED' },
              createdAt: new Date(now.getTime() + 1000),
            },
          ],
          user: {
            id: 'req-1',
            name: 'Requester',
            email: 'req@example.com',
          },
          car: {
            id: 'car-1',
            plate: 'ABC-1234',
            model: 'Model X',
          },
        },
      ]);

      const result = await service.listPendingForApprover(approverActor);

      expect(prisma.reservation.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'res-1',
        status: 'Validated',
        requester: {
          id: 'req-1',
          name: 'Requester',
        },
        car: {
          id: 'car-1',
          plate: 'ABC-1234',
        },
      });
    });
  });
});
