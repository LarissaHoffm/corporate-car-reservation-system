import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';

function makeCtx(role: string): ExecutionContext {
  const req = { user: { role } };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}) as any,
    getClass: () => ({}) as any,
    getArgs: () => [] as any,
    getArgByIndex: () => ({}) as any,
    switchToRpc: () => ({}) as any,
    switchToWs: () => ({}) as any,
    getType: () => 'http' as any,
  } as ExecutionContext;
}

describe('RolesGuard', () => {
  it('permite quando o papel do usuário está entre os exigidos', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN', 'APPROVER']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeCtx('ADMIN'))).toBe(true);
    expect(guard.canActivate(makeCtx('APPROVER'))).toBe(true);
  });

  it('bloqueia quando não há correspondência de papel', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeCtx('REQUESTER'))).toBe(false);
  });

  it('sem metadata de roles, permite por padrão', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeCtx('REQUESTER'))).toBe(true);
  });
});
