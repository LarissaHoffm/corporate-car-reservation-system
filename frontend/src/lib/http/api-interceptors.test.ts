import { describe, it, expect, vi } from 'vitest';

// mock do módulo de token usado pelos interceptors
vi.mock('@/lib/auth/token', () => {
  return {
    getAccessToken: vi.fn(() => 'test-access-token'),
  };
});

// importa depois do mock pra garantir que os interceptors usem o mock
import { api } from '@/lib/http/api';
import { getAccessToken } from '@/lib/auth/token';

describe('api interceptors', () => {
  it('deve anexar Authorization com Bearer <token> quando houver accessToken', async () => {
    (getAccessToken as jest.Mock | any).mockReturnValue('abc-123');

    // pega o primeiro interceptor de request registrado
    const handler = api.interceptors.request.handlers[0]?.fulfilled;
    expect(handler).toBeInstanceOf(Function);

    const config = await handler!({ headers: {} } as any);
    const authHeader =
      (config.headers as any).Authorization ?? (config.headers as any).authorization;

    expect(authHeader).toBe('Bearer abc-123');
  });

  it('não deve quebrar quando não houver token', async () => {
    (getAccessToken as jest.Mock | any).mockReturnValue(null);

    const handler = api.interceptors.request.handlers[0]?.fulfilled;
    const config = await handler!({ headers: {} } as any);

    const authHeader =
      (config.headers as any).Authorization ?? (config.headers as any).authorization;

    expect(authHeader === undefined || authHeader === null).toBe(true);
  });
});
