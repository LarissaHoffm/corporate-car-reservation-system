import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

import { UsersService } from './users.service';
import { PrismaService } from '../infra/prisma.service';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  const hashMock = argon2.hash as jest.Mock;
  const verifyMock = argon2.verify as jest.Mock;

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
      reservation: {
        findMany: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);

    jest.clearAllMocks();
    hashMock.mockReset();
    verifyMock.mockReset();
  });

  /* -------------------- findAll -------------------- */

  describe('findAll', () => {
    it('deve filtrar por tenantId quando informado', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', tenantId: 't1', name: 'Admin' },
      ]);

      const res = await service.findAll('t1');

      expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
      const args = prisma.user.findMany.mock.calls[0][0];

      expect(args.where).toEqual({ tenantId: 't1' });
      expect(args.orderBy).toBeDefined();
      expect(args.select).toBeDefined();

      expect(res).toEqual([{ id: 'u1', tenantId: 't1', name: 'Admin' }]);
    });

    it('não aplica filtro de tenant quando não informado', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u2', tenantId: 't2', name: 'Requester' },
      ]);

      const res = await service.findAll();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: undefined,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });

      expect(res).toEqual([{ id: 'u2', tenantId: 't2', name: 'Requester' }]);
    });
  });

  /* -------------------- findOne -------------------- */

  describe('findOne', () => {
    it('aplica filtro por tenant quando ctx.tenantId informado', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        name: 'Admin',
      });

      const res = await service.findOne('u1', { tenantId: 't1' });

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'u1', tenantId: 't1' },
        select: expect.any(Object),
      });
      expect(res).toEqual({ id: 'u1', tenantId: 't1', name: 'Admin' });
    });

    it('não aplica filtro de tenant quando ctx ausente', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u2',
        tenantId: 't2',
        name: 'Approver',
      });

      const res = await service.findOne('u2');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'u2' },
        select: expect.any(Object),
      });
      expect(res).toEqual({ id: 'u2', tenantId: 't2', name: 'Approver' });
    });

    it('deve lançar NotFoundException quando usuário não existir', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne('ux')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  /* -------------------- create -------------------- */

  describe('create', () => {
    it('deve lançar ConflictException quando tenantId não é informado em ctx nem no dto', async () => {
      const dto: any = {
        name: 'User',
        email: 'user@acme.com',
      };

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('deve lançar ConflictException se email já existir para o tenant', async () => {
      const dto: any = {
        name: 'User',
        email: 'User@ACME.com',
        tenantId: 't1',
        password: 'Strong1!',
      };

      prisma.user.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'user@acme.com', tenantId: 't1' },
        select: { id: true },
      });
    });

    it('deve lançar BadRequestException se branchId não existir para o tenant', async () => {
      const dto: any = {
        name: 'User',
        email: 'user@acme.com',
        tenantId: 't1',
        branchId: 'b1',
        password: 'Strong1!',
      };

      prisma.user.findFirst.mockResolvedValue(null); // não existe outro usuário
      prisma.branch.findFirst.mockResolvedValue(null); // branch inválida

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.branch.findFirst).toHaveBeenCalledWith({
        where: { id: 'b1', tenantId: 't1' },
        select: { id: true },
      });
    });

    it('deve rejeitar senha fraca na criação', async () => {
      const dto: any = {
        name: 'User',
        email: 'user@acme.com',
        tenantId: 't1',
        password: 'weak',
      };

      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('deve criar usuário com senha forte informada (sem temporaryPassword)', async () => {
      const dto: any = {
        name: 'User',
        email: 'User@ACME.com',
        tenantId: 't1',
        password: 'Strong1!',
        department: 'IT',
        phone: '(47) 99999-0000',
        role: Role.APPROVER,
      };

      prisma.user.findFirst.mockResolvedValue(null); // não existe outro user
      hashMock.mockResolvedValue('hashed-password');

      const created = {
        id: 'u1',
        name: 'User',
        email: 'user@acme.com',
        role: Role.APPROVER,
        status: UserStatus.ACTIVE,
        branchId: null,
        department: 'IT',
        mustChangePassword: false,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        phone: '47999990000',
      };

      prisma.user.create.mockResolvedValue(created);

      const res = await service.create(dto);

      expect(hashMock).toHaveBeenCalledWith('Strong1!');

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 't1',
          name: 'User',
          email: 'user@acme.com',
          department: 'IT',
          role: Role.APPROVER,
          status: UserStatus.ACTIVE,
          passwordHash: 'hashed-password',
          mustChangePassword: false,
          phone: '47999990000',
        }),
        select: expect.any(Object),
      });

      expect(res).toEqual({
        ...created,
        temporaryPassword: undefined,
      });
    });

    it('deve gerar senha temporária quando senha não é informada (mustChangePassword=true)', async () => {
      const dto: any = {
        name: 'User',
        email: 'user@acme.com',
        tenantId: 't1',
      };

      prisma.user.findFirst.mockResolvedValue(null);

      hashMock.mockResolvedValue('hashed-temp');

      prisma.user.create.mockImplementation(async (args: any) => ({
        id: 'u2',
        name: args.data.name,
        email: args.data.email,
        role: args.data.role,
        status: args.data.status,
        branchId: args.data.branchId,
        department: args.data.department,
        mustChangePassword: args.data.mustChangePassword,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        phone: args.data.phone,
      }));

      const res = await service.create(dto);

      expect(hashMock).toHaveBeenCalledTimes(1);
      expect(res.mustChangePassword).toBe(true);
      expect(typeof res.temporaryPassword).toBe('string');
      expect(res.temporaryPassword!.length).toBeGreaterThanOrEqual(8);
    });
  });

  /* -------------------- updatePassword -------------------- */

  describe('updatePassword', () => {
    it('deve lançar BadRequestException se body for inválido', async () => {
      await expect(
        service.updatePassword('u1', null as any),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.updatePassword('u1', {} as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve lançar NotFoundException se usuário alvo não for encontrado', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePassword('u1', { newPassword: 'Strong1!' } as any, {
          tenantId: 't1',
          actorId: 'any',
          actorRole: Role.ADMIN,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve lançar ForbiddenException se ator não for ADMIN nem o próprio usuário', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        passwordHash: 'hash',
        mustChangePassword: false,
      });

      await expect(
        service.updatePassword('u1', { newPassword: 'Strong1!' } as any, {
          tenantId: 't1',
          actorId: 'other',
          actorRole: Role.REQUESTER,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve lançar BadRequestException se usuário comum não informar senha atual quando obrigatório', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        passwordHash: 'hash',
        mustChangePassword: false,
      });

      await expect(
        service.updatePassword('u1', { newPassword: 'Strong1!' } as any, {
          tenantId: 't1',
          actorId: 'u1',
          actorRole: Role.REQUESTER,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve lançar BadRequestException se senha atual for inválida', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        passwordHash: 'hash',
        mustChangePassword: false,
      });

      verifyMock.mockResolvedValue(false);

      await expect(
        service.updatePassword(
          'u1',
          { newPassword: 'Strong1!', currentPassword: 'wrong' } as any,
          { tenantId: 't1', actorId: 'u1', actorRole: Role.REQUESTER },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(verifyMock).toHaveBeenCalledWith('hash', 'wrong');
    });

    it('ADMIN pode alterar senha sem exigir senha atual', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        passwordHash: 'old-hash',
        mustChangePassword: false,
      });

      hashMock.mockResolvedValue('new-hash');
      prisma.user.update.mockResolvedValue({ id: 'u1' });

      const res = await service.updatePassword(
        'u1',
        { newPassword: 'Strong1!' } as any,
        { tenantId: 't1', actorId: 'admin1', actorRole: Role.ADMIN },
      );

      expect(hashMock).toHaveBeenCalledWith('Strong1!');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({
          passwordHash: 'new-hash',
          mustChangePassword: false,
          passwordChangedAt: expect.any(Date),
        }),
        select: { id: true },
      });

      expect(res.ok).toBe(true);
      expect(res.userId).toBe('u1');
      expect(res.mustChangePassword).toBe(false);
      expect(typeof res.passwordChangedAt).toBe('string');
    });
  });

  /* -------------------- resetPassword -------------------- */

  describe('resetPassword', () => {
    it('deve lançar ForbiddenException se ator não for ADMIN', async () => {
      await expect(
        service.resetPassword('u1', {
          tenantId: 't1',
          actorId: 'u2',
          actorRole: Role.REQUESTER,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve lançar NotFoundException se usuário não existir', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword('u1', {
          tenantId: 't1',
          actorId: 'admin1',
          actorRole: Role.ADMIN,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve resetar senha com temporária e marcar mustChangePassword=true', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });

      // força uma senha temporária determinística
      const genSpy = jest
        .spyOn<any, any>(service as any, 'generateStrongPassword')
        .mockReturnValue('TempPass1!');

      hashMock.mockResolvedValue('new-hash');

      prisma.user.update.mockResolvedValue({ id: 'u1' });

      const res = await service.resetPassword('u1', {
        tenantId: 't1',
        actorId: 'admin1',
        actorRole: Role.ADMIN,
      });

      expect(genSpy).toHaveBeenCalledTimes(1);
      expect(hashMock).toHaveBeenCalledWith('TempPass1!');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          passwordHash: 'new-hash',
          mustChangePassword: true,
          passwordChangedAt: null,
        },
        select: { id: true },
      });

      expect(res).toEqual({
        ok: true,
        userId: 'u1',
        temporaryPassword: 'TempPass1!',
      });

      genSpy.mockRestore();
    });
  });

  /* -------------------- update -------------------- */

  describe('update', () => {
    it('deve lançar NotFoundException quando usuário não for encontrado', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.update('u1', { name: 'X' } as any, { tenantId: 't1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve atualizar campos básicos, branchId, phone, email, department, role e status', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
      });

      prisma.branch.findFirst.mockResolvedValue({ id: 'b1' });

      prisma.user.update.mockResolvedValue({
        id: 'u1',
        name: 'Novo Nome',
        email: 'novo@acme.com',
        role: Role.APPROVER,
        status: UserStatus.INACTIVE,
        branchId: 'b1',
        department: 'TI',
        mustChangePassword: false,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        phone: '47999998888',
      });

      const dto: any = {
        name: 'Novo Nome',
        branchId: 'b1',
        phone: '(47) 99999-8888',
        email: '  NOVO@ACME.com  ',
        department: 'TI',
        role: Role.APPROVER,
        status: UserStatus.INACTIVE,
      };

      const res = await service.update('u1', dto, { tenantId: 't1' });

      expect(prisma.branch.findFirst).toHaveBeenCalledWith({
        where: { id: 'b1', tenantId: 't1' },
        select: { id: true },
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({
          name: 'Novo Nome',
          branchId: 'b1',
          phone: '47999998888',
          email: 'novo@acme.com',
          department: 'TI',
          role: Role.APPROVER,
          status: UserStatus.INACTIVE,
        }),
        select: expect.any(Object),
      });

      expect(res).toEqual(
        expect.objectContaining({
          id: 'u1',
          name: 'Novo Nome',
          email: 'novo@acme.com',
          branchId: 'b1',
          phone: '47999998888',
        }),
      );
    });

    it('deve permitir limpar branchId e phone e definir nova senha via update (ADMIN)', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u2',
        tenantId: 't1',
      });

      // branchId = null → não valida com branch
      hashMock.mockResolvedValue('hash-admin-update');

      prisma.user.update.mockResolvedValue({
        id: 'u2',
        name: 'User',
        email: 'user@acme.com',
        role: Role.REQUESTER,
        status: UserStatus.ACTIVE,
        branchId: null,
        department: null,
        mustChangePassword: false,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        phone: null,
      });

      const dto: any = {
        branchId: null,
        phone: '',
        department: null,
        password: 'NewStrong1!',
      };

      const res = await service.update('u2', dto, { tenantId: 't1' });

      expect(hashMock).toHaveBeenCalledWith('NewStrong1!');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u2' },
        data: expect.objectContaining({
          branchId: null,
          phone: null,
          department: null,
          passwordHash: 'hash-admin-update',
          mustChangePassword: false,
          passwordChangedAt: expect.any(Date),
        }),
        select: expect.any(Object),
      });

      expect(res.branchId).toBeNull();
      expect(res.phone).toBeNull();
    });

    it('deve lançar BadRequestException se branchId for inválido no update', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u3',
        tenantId: 't1',
      });

      prisma.branch.findFirst.mockResolvedValue(null);

      await expect(
        service.update('u3', { branchId: 'bX' } as any, { tenantId: 't1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  /* -------------------- updateProfile -------------------- */

  describe('updateProfile', () => {
    it('deve lançar ForbiddenException se actorId não estiver presente no contexto', async () => {
      await expect(
        service.updateProfile(
          'u1',
          { name: 'X' },
          { tenantId: 't1', actorId: null, actorRole: Role.ADMIN },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve lançar NotFoundException se usuário não existir', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.updateProfile(
          'u1',
          { name: 'X' },
          { tenantId: 't1', actorId: 'u1', actorRole: Role.REQUESTER },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve permitir usuário atualizar o próprio perfil', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        role: Role.REQUESTER,
      });

      const updated = {
        id: 'u1',
        name: 'Novo Nome',
        email: 'user@acme.com',
        role: Role.REQUESTER,
        status: UserStatus.ACTIVE,
        branchId: null,
        department: null,
        mustChangePassword: false,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        phone: '47999990000',
      };

      prisma.user.update.mockResolvedValue(updated);

      const res = await service.updateProfile(
        'u1',
        { name: 'Novo Nome', phone: '47999990000' },
        { tenantId: 't1', actorId: 'u1', actorRole: Role.REQUESTER },
      );

      // updateProfile usa update() internamente, então findFirst foi chamado 2x:
      // 1) no próprio updateProfile
      // 2) dentro de update()
      expect(prisma.user.findFirst).toHaveBeenCalledTimes(2);

      expect(res).toEqual(updated);
    });

    it('ADMIN pode atualizar perfil de outro usuário do tenant', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce({
          id: 'u2',
          tenantId: 't1',
          role: Role.REQUESTER,
        }) // updateProfile
        .mockResolvedValueOnce({
          id: 'u2',
          tenantId: 't1',
        }); // update

      const updated = {
        id: 'u2',
        name: 'Admin Edit',
        email: 'user@acme.com',
        role: Role.REQUESTER,
        status: UserStatus.ACTIVE,
        branchId: null,
        department: null,
        mustChangePassword: false,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        phone: '47999997777',
      };

      prisma.user.update.mockResolvedValue(updated);

      const res = await service.updateProfile(
        'u2',
        { name: 'Admin Edit', phone: '47999997777' },
        { tenantId: 't1', actorId: 'admin1', actorRole: Role.ADMIN },
      );

      expect(res).toEqual(updated);
    });
  });

  /* -------------------- remove -------------------- */

  describe('remove', () => {
    it('deve remover usuário e retornar { ok: true }', async () => {
      prisma.user.delete.mockResolvedValue({ id: 'u1' });

      const res = await service.remove('u1');

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
      expect(res).toEqual({ ok: true });
    });
  });

  /* -------------------- makeApprover / revokeApprover -------------------- */

  describe('makeApprover / revokeApprover', () => {
    it('makeApprover deve atualizar role para APPROVER', async () => {
      const updated = {
        id: 'u1',
        email: 'user@acme.com',
        role: Role.APPROVER,
        status: UserStatus.ACTIVE,
      };

      prisma.user.update.mockResolvedValue(updated);

      const res = await service.makeApprover('u1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { role: Role.APPROVER },
        select: { id: true, email: true, role: true, status: true },
      });

      expect(res).toEqual(updated);
    });

    it('revokeApprover deve atualizar role para REQUESTER', async () => {
      const updated = {
        id: 'u1',
        email: 'user@acme.com',
        role: Role.REQUESTER,
        status: UserStatus.ACTIVE,
      };

      prisma.user.update.mockResolvedValue(updated);

      const res = await service.revokeApprover('u1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { role: Role.REQUESTER },
        select: { id: true, email: true, role: true, status: true },
      });

      expect(res).toEqual(updated);
    });
  });

  /* -------------------- findReservationsByUser -------------------- */

  describe('findReservationsByUser', () => {
    it('deve lançar NotFoundException quando usuário não existe', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.findReservationsByUser('u1', { tenantId: 't1' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.reservation.findMany).not.toHaveBeenCalled();
    });

    it('deve retornar reservas quando usuário existe no tenant', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });

      const reservations = [
        {
          id: 'r1',
          status: 'APPROVED',
          createdAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      prisma.reservation.findMany.mockResolvedValue(reservations);

      const res = await service.findReservationsByUser('u1', {
        tenantId: 't1',
      });

      expect(prisma.reservation.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1', tenantId: 't1' },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }],
      });

      expect(res).toEqual(reservations);
    });
  });
});
