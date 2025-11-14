import { describe, it, expect } from 'vitest';
import { statusChipClasses } from './status';

describe('statusChipClasses', () => {
  it('retorna classes para alguns status conhecidos', () => {
    const labels = [
      'PENDING',
      'pending',
      'Aguardando',
      'APPROVED',
      'aprovada',
      'CANCELED',
      'cancelada',
      'INACTIVE',
      'inativo',
      'maintenance',
      'reservado',
      'ok',
    ];

    for (const label of labels) {
      const classes = statusChipClasses(label);
      expect(typeof classes).toBe('string');
      expect(classes.length).toBeGreaterThan(0);
    }
  });

  it('retorna fallback padrão para string vazia', () => {
    const classes = statusChipClasses('');
    expect(typeof classes).toBe('string');
    expect(classes.length).toBeGreaterThan(0);
  });
});
