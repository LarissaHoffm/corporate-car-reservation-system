import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'audit';
export type AuditMeta = { action: string; entity?: string };

export const Audit = (action: string, entity?: string) =>
  SetMetadata(AUDIT_METADATA_KEY, { action, entity } as AuditMeta);
