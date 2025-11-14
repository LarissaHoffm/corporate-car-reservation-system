import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  function createContext(req: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as any;
  }

  function mockSuperCanActivate(returnValue: any = true) {
    const baseProto = Object.getPrototypeOf(JwtAuthGuard.prototype);
    const spy = jest
      .spyOn(baseProto, 'canActivate')
      .mockReturnValue(returnValue);
    return spy;
  }

  it('deve manter Authorization quando já existe header', () => {
    const req = {
      headers: { authorization: 'Bearer existing-token' },
      cookies: {},
      signedCookies: {},
    };
    const ctx = createContext(req);
    const superSpy = mockSuperCanActivate(true);

    const result = guard.canActivate(ctx);

    expect(req.headers.authorization).toBe('Bearer existing-token');
    expect(superSpy).toHaveBeenCalledWith(ctx);
    expect(result).toBe(true);

    superSpy.mockRestore();
  });

  it('deve preencher Authorization a partir de cookies.accessToken quando header ausente', () => {
    const req = {
      headers: {},
      cookies: { accessToken: 'cookie-token' },
      signedCookies: {},
    };
    const ctx = createContext(req);
    const superSpy = mockSuperCanActivate(true);

    const result = guard.canActivate(ctx);

    expect(req.headers.authorization).toBe('Bearer cookie-token');
    expect(superSpy).toHaveBeenCalledWith(ctx);
    expect(result).toBe(true);

    superSpy.mockRestore();
  });

  it('deve preencher Authorization a partir de signedCookies.accessToken quando não há em cookies', () => {
    const req = {
      headers: {},
      cookies: {},
      signedCookies: { accessToken: 'signed-token' },
    };
    const ctx = createContext(req);
    const superSpy = mockSuperCanActivate(true);

    const result = guard.canActivate(ctx);

    expect(req.headers.authorization).toBe('Bearer signed-token');
    expect(superSpy).toHaveBeenCalledWith(ctx);
    expect(result).toBe(true);

    superSpy.mockRestore();
  });

  it('deve preencher Authorization a partir de cookies.access_token (compat) quando não há outros tokens', () => {
    const req = {
      headers: {},
      cookies: { access_token: 'compat-token' },
      signedCookies: {},
    };
    const ctx = createContext(req);
    const superSpy = mockSuperCanActivate(true);

    const result = guard.canActivate(ctx);

    expect(req.headers.authorization).toBe('Bearer compat-token');
    expect(superSpy).toHaveBeenCalledWith(ctx);
    expect(result).toBe(true);

    superSpy.mockRestore();
  });
});
