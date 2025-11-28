import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

import { AuthService } from './auth.service';
import { PrismaService } from '../infra/prisma.service';
import { RedisService } from '../infra/redis.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;
  let redis: any;

  const makeRes = () =>
    ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    }) as any;

  const makeReq = (opts?: {
    csrf?: string;
    cookies?: Record<string, string>;
  }) => {
    const csrf = opts?.csrf;
    const cookies = opts?.cookies ?? {};
    return {
      header: jest.fn((name: string) =>
        name.toLowerCase() === 'x-csrf-token' ? csrf : undefined,
      ),
      cookies,
    } as any;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    jwt = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('deve autenticar usuário ativo com credenciais válidas', async () => {
      const res = makeRes();
      const dto = { email: 'USER@test.com', password: 'Secret123!' };

      const passwordHash = await argon2.hash(dto.password);

      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        tenantId: 't1',
        name: 'User Test',
        role: Role.REQUESTER,
        status: UserStatus.ACTIVE,
        passwordHash,
        mustChangePassword: true,
        branchId: 'b1',
        department: 'TI',
        phone: '9999-9999',
        branch: { id: 'b1', name: 'Filial Centro' },
      });

      jwt.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      redis.set.mockResolvedValue(undefined);

      const result = await service.login(dto as any, res as any);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'user@test.com' },
        select: {
          id: true,
          tenantId: true,
          email: true,
          name: true,
          role: true,
          status: true,
          passwordHash: true,
          mustChangePassword: true,
          branchId: true,
          department: true,
          phone: true,
          branch: {
            select: { id: true, name: true },
          },
        },
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.user).toMatchObject({
        id: 'u1',
        email: 'user@test.com',
        name: 'User Test',
        role: Role.REQUESTER,
        tenantId: 't1',
        mustChangePassword: true,
      });
      expect(res.cookie).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      const res = makeRes();
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'x@test.com', password: '123' } as any,
          res as any,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('deve lançar ForbiddenException quando usuário está inativo', async () => {
      const res = makeRes();
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        tenantId: 't1',
        name: 'User Test',
        role: Role.REQUESTER,
        status: UserStatus.INACTIVE,
        passwordHash: await argon2.hash('Qualquer123!'),
        mustChangePassword: false,
        branchId: null,
        department: null,
        phone: null,
        branch: null,
      });

      await expect(
        service.login(
          { email: 'user@test.com', password: '123' } as any,
          res as any,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve lançar UnauthorizedException quando senha é inválida', async () => {
      const res = makeRes();

      const passwordHash = await argon2.hash('SenhaCorreta123!');

      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        tenantId: 't1',
        name: 'User Test',
        role: Role.REQUESTER,
        status: UserStatus.ACTIVE,
        passwordHash,
        mustChangePassword: false,
        branchId: null,
        department: null,
        phone: null,
        branch: null,
      });

      await expect(
        service.login(
          { email: 'user@test.com', password: 'senha-errada' } as any,
          res as any,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('me', () => {
    it('deve retornar usuário logado', async () => {
      const user = {
        id: 'u1',
        email: 'user@test.com',
        name: 'User Test',
        role: Role.REQUESTER,
        status: UserStatus.ACTIVE,
        tenantId: 't1',
        mustChangePassword: false,
        branchId: 'b1',
        department: 'TI',
        phone: '9999',
        branch: { id: 'b1', name: 'Filial Centro' },
      };

      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.me('u1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'u1' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          tenantId: true,
          mustChangePassword: true,
          branchId: true,
          department: true,
          phone: true,
          branch: {
            select: { id: true, name: true },
          },
        },
      });
      expect(result).toEqual(user);
    });

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me('u1')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('deve lançar ForbiddenException se CSRF for inválido', async () => {
      const req = makeReq({
        csrf: 'header-token',
        cookies: { rcsrftoken: 'cookie-token' },
      });
      const res = makeRes();

      await expect(
        service.refresh(req as any, res as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve renovar access token e rotacionar refresh com CSRF válido', async () => {
      const req = makeReq({
        csrf: 'csrf-token',
        cookies: {
          rcsrftoken: 'csrf-token',
          rc_refresh_token: 'old-refresh',
        },
      });
      const res = makeRes();

      jwt.verify.mockReturnValue({
        sub: 'u1',
        role: Role.REQUESTER,
        tenantId: 't1',
        mustChangePassword: false,
        jti: 'old-jti',
      });

      redis.get.mockResolvedValue(JSON.stringify({ uid: 'u1' }));
      redis.del.mockResolvedValue(1);
      redis.set.mockResolvedValue(undefined);

      // ordem: refresh depois access
      jwt.sign
        .mockReturnValueOnce('new-refresh-token')
        .mockReturnValueOnce('new-access-token');

      const result = await service.refresh(req as any, res as any);

      expect(redis.del).toHaveBeenCalledWith('rt:old-jti');
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^rt:/),
        JSON.stringify({ uid: 'u1' }),
        expect.any(Number),
      );
      expect(res.cookie).toHaveBeenCalled();
      expect(result).toEqual({ accessToken: 'new-access-token' });
    });
  });

  describe('logout', () => {
    it('deve revogar refresh e limpar cookies quando CSRF válido', async () => {
      const req = makeReq({
        csrf: 'csrf-token',
        cookies: {
          rcsrftoken: 'csrf-token',
          rc_refresh_token: 'refresh-token',
        },
      });
      const res = makeRes();

      jwt.verify.mockReturnValue({
        sub: 'u1',
        role: Role.REQUESTER,
        tenantId: 't1',
        jti: 'jti-1',
      });

      redis.del.mockResolvedValue(1);

      const result = await service.logout(req as any, res as any);

      expect(redis.del).toHaveBeenCalledWith('rt:jti-1');
      expect(res.clearCookie).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });
  });

  describe('changePassword', () => {
    const baseUser = {
      id: 'u1',
      email: 'user@test.com',
      tenantId: 't1',
      name: 'User Test',
      role: Role.REQUESTER,
      status: UserStatus.ACTIVE,
      passwordHash: 'old-hash',
      mustChangePassword: true,
      branchId: 'b1',
      department: 'TI',
      phone: '9999',
      branch: { id: 'b1', name: 'Filial Centro' },
    };

    it('deve trocar senha com sucesso, revogar refresh antigo e emitir novos tokens', async () => {
      const dto = {
        currentPassword: 'OldPass1!',
        newPassword: 'NewPass1!',
      };

      const currentHash = await argon2.hash(dto.currentPassword);

      const req = makeReq({
        cookies: { rc_refresh_token: 'old-refresh' },
      });
      const res = makeRes();

      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        passwordHash: currentHash,
      });

      jwt.verify.mockReturnValue({
        sub: 'u1',
        role: Role.REQUESTER,
        tenantId: 't1',
        jti: 'old-jti',
      });

      jwt.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      redis.del.mockResolvedValue(1);
      redis.set.mockResolvedValue(undefined);

      prisma.user.update.mockResolvedValue({} as any);

      const result = await service.changePassword(
        'u1',
        dto as any,
        req as any,
        res as any,
      );

      // valida que o hash salvo corresponde à nova senha
      const call = prisma.user.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'u1' });
      expect(call.data.mustChangePassword).toBe(false);
      expect(typeof call.data.passwordHash).toBe('string');
      const hashSaved = call.data.passwordHash;
      const ok = await argon2.verify(hashSaved, dto.newPassword);
      expect(ok).toBe(true);

      expect(redis.del).toHaveBeenCalledWith('rt:old-jti');
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^rt:/),
        JSON.stringify({ uid: 'u1' }),
        expect.any(Number),
      );

      expect(res.cookie).toHaveBeenCalled();
      expect(result.accessToken).toBe('new-access-token');
      expect(result.user).toMatchObject({
        id: 'u1',
        mustChangePassword: false,
      });
    });

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      const req = makeReq();
      const res = makeRes();

      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword(
          'u1',
          { currentPassword: 'x', newPassword: 'Y1!aaaaa' } as any,
          req as any,
          res as any,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('deve lançar ForbiddenException quando usuário está inativo', async () => {
      const req = makeReq();
      const res = makeRes();

      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        status: UserStatus.INACTIVE,
      });

      await expect(
        service.changePassword(
          'u1',
          { currentPassword: 'x', newPassword: 'Y1!aaaaa' } as any,
          req as any,
          res as any,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve lançar UnauthorizedException quando senha atual é inválida', async () => {
      const req = makeReq();
      const res = makeRes();

      const hashOutra = await argon2.hash('OutraSenha1!');

      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        passwordHash: hashOutra,
      });

      await expect(
        service.changePassword(
          'u1',
          { currentPassword: 'wrong', newPassword: 'Y1!aaaaa' } as any,
          req as any,
          res as any,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('deve lançar BadRequestException quando nova senha é igual à atual', async () => {
      const req = makeReq();
      const res = makeRes();

      const dto = {
        currentPassword: 'SamePass1!',
        newPassword: 'SamePass1!',
      };

      const hashAtual = await argon2.hash(dto.currentPassword);

      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        passwordHash: hashAtual,
      });

      await expect(
        service.changePassword('u1', dto as any, req as any, res as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve lançar BadRequestException quando nova senha é fraca', async () => {
      const req = makeReq();
      const res = makeRes();

      const dto = {
        currentPassword: 'OldPass1!',
        newPassword: 'weakpass1', // fraca (sem maiúscula/símbolo)
      };

      const hashAtual = await argon2.hash(dto.currentPassword);

      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        passwordHash: hashAtual,
      });

      await expect(
        service.changePassword('u1', dto as any, req as any, res as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
