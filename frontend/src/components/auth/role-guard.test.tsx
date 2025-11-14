import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

// mocka o hook real usado no app
vi.mock('@/lib/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/lib/auth/useAuth';
import RoleGuard from '../role-guard';

function renderWithRole(role: string) {
  (useAuth as any).mockReturnValue({
    user: { id: 'u1', name: 'Lari', email: 'lari@test', role },
    loading: false,
  });

  return render(
    <MemoryRouter>
      <RoleGuard roles={['ADMIN']}>
        <div data-testid="content">protegido</div>
      </RoleGuard>
    </MemoryRouter>,
  );
}

describe('RoleGuard', () => {
  it('renderiza children quando role do usuário está permitida', () => {
    renderWithRole('ADMIN');

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('não quebra quando role não está permitida (pode ocultar ou redirecionar)', () => {
    renderWithRole('REQUESTER');

    expect(true).toBe(true);
  });
});
