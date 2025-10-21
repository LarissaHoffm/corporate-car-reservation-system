import { SetMetadata } from '@nestjs/common';
export const AUDIT_ACTION = 'AUDIT_ACTION';
export const Audit = (action: string, entity?: string) => SetMetadata(AUDIT_ACTION, { action, entity });
